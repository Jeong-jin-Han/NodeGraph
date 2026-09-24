import * as vscode from 'vscode'
import * as path from 'path'
import { NodeGraph } from '../webview/types/graph'
import { computeImageUris, saveImageToAssetsFolder, deleteImageFile } from './imageManager'
import { generateHtml, codeKey } from './htmlExporter'
import { collectCodeBlocks } from '../webview/utils/tableParser'
import { createEmptyGraph } from './defaultGraph'
import { getNonce } from './nonce'
import { PdfViewerPanel } from './PdfViewerPanel'
import { parseInternalTarget } from '../webview/utils/internalLink'
import { highlightCode } from './codeHighlight'
import { resolveInternalTitles } from './internalTitles'
import { parseCodeLinkTarget } from './codeLink'
import { resolveGitHubBase, resolveRepoRelativePrefix } from './gitInfo'

export class NodeGraphEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NodeGraphEditorProvider(context)
    return vscode.window.registerCustomEditorProvider(
      'nodegraph.editor',
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  }

  // Track the most recently active webview so extension commands can post messages to it
  private static _activeWebview: vscode.Webview | null = null

  public static postToActive(message: unknown): void {
    NodeGraphEditorProvider._activeWebview?.postMessage(message)
  }

  // Like postToActive, but first pulls real keyboard focus into the webview.
  // Needed for Ctrl+F: clicking the nodegraph TAB makes the panel active (so the
  // keybinding's when-clause holds and the command fires) but leaves DOM focus in
  // the workbench, not inside the webview iframe — the search bar then opens yet
  // its input.focus() can't take keyboard focus, which reads as "Ctrl+F doesn't
  // work until I click a node first" (user report).
  //
  // Custom-editor webview panels don't support WebviewPanel.reveal() (that's for
  // createWebviewPanel panels — trying it here misbehaved and even bounced focus
  // to the neighboring group). The supported route: the keybinding's when-clause
  // already guarantees the active editor IS this custom editor, so focusing the
  // active editor group hands keyboard focus to its active editor — our iframe.
  public static async focusActiveAndPost(message: unknown): Promise<void> {
    // Target = the nodegraph behind the tab that is active right now, falling back
    // to the most recently active one. No fallback to VS Code's own find: this
    // command only runs when the keybinding's when-clause already decided the
    // keystroke is ours, and the earlier `actions.find` fallback is exactly what
    // produced "Ctrl+F opens find in the OTHER tab" whenever tab-group state lagged.
    const target = NodeGraphEditorProvider.activeGraphEntry() ?? NodeGraphEditorProvider.lastActiveEntry()
    if (!target) return
    // Pull real keyboard focus into this panel's iframe. Neither
    // WebviewPanel.reveal() (unsupported for custom editors — it bounced focus to
    // the neighbouring group) nor focusActiveEditorGroup (targets whatever group
    // the workbench *thinks* is active, which lags right after a tab click — the
    // same failure mode as microsoft/vscode#76863, "click webview tab, then keys
    // don't register") is reliable. Re-opening the already-open custom editor in
    // its OWN column with preserveFocus:false is the supported way to activate
    // and focus one specific editor.
    await vscode.commands.executeCommand('vscode.openWith', target.uri, 'nodegraph.editor', {
      viewColumn: target.panel.viewColumn,
      preserveFocus: false,
    })
    target.panel.webview.postMessage(message)
  }

  // Every open nodegraph panel, by document URI — lets commands find the panel
  // behind whichever tab is active, rather than trusting last-activated state.
  private static readonly _panels = new Map<string, vscode.WebviewPanel>()
  private static _lastActiveUri: string | null = null

  private static activeGraphEntry(): { uri: vscode.Uri; panel: vscode.WebviewPanel } | undefined {
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input
    if (!(input instanceof vscode.TabInputCustom) || input.viewType !== 'nodegraph.editor') return undefined
    const panel = NodeGraphEditorProvider._panels.get(input.uri.toString())
    return panel ? { uri: input.uri, panel } : undefined
  }

  private static lastActiveEntry(): { uri: vscode.Uri; panel: vscode.WebviewPanel } | undefined {
    const key = NodeGraphEditorProvider._lastActiveUri
    const panel = key ? NodeGraphEditorProvider._panels.get(key) : undefined
    return (key && panel) ? { uri: vscode.Uri.parse(key), panel } : undefined
  }

  // Mirrors "is the active tab a nodegraph?" into the context key the Ctrl+F
  // keybinding is conditioned on (see extension.ts for why not activeCustomEditorId).
  public static syncGraphTabContext(): void {
    vscode.commands.executeCommand('setContext', 'nodegraph.graphTabActive', !!NodeGraphEditorProvider.activeGraphPanel())
  }

  public static activeGraphPanel(): vscode.WebviewPanel | undefined {
    return NodeGraphEditorProvider.activeGraphEntry()?.panel
  }

  private readonly _pendingSaves = new Set<string>()

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icon-hires.png')

    const documentDir = vscode.Uri.joinPath(document.uri, '..')
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, documentDir],
    }
    webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview)

    const sendGraph = (type: 'load' | 'externalChange') => {
      const text = document.getText()
      try {
        const data: NodeGraph = text.trim() === '' ? createEmptyGraph() : JSON.parse(text)
        const imageUris = computeImageUris(webviewPanel.webview, document.uri, data)
        webviewPanel.webview.postMessage({ type, data, imageUris })
        // 옆 그래프의 노드 제목은 확장만 읽을 수 있다 — 링크를 "#17 제목"으로 보여주기
        // 위해 뒤따라 보낸다(그래프 렌더를 막지 않도록 별도 메시지로).
        resolveInternalTitles(document.uri, data).then(titles => {
          if (Object.keys(titles).length) webviewPanel.webview.postMessage({ type: 'internalTitles', titles })
        })
      } catch {
        // invalid JSON — skip
      }
    }

    const msgDisposable = webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'ready') {
        sendGraph('load')
      } else if (msg.type === 'save') {
        const docKey = document.uri.toString()
        this._pendingSaves.add(docKey)
        try {
          const edit = new vscode.WorkspaceEdit()
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          )
          edit.replace(document.uri, fullRange, JSON.stringify(msg.data, null, 2))
          await vscode.workspace.applyEdit(edit)
          await document.save()
        } finally {
          this._pendingSaves.delete(docKey)
        }
      } else if (msg.type === 'openLink') {
        const link = msg.link
        if (link.type === 'url') {
          vscode.env.openExternal(vscode.Uri.parse(link.target))
        } else if (link.type === 'pdf') {
          const pdfUri = vscode.Uri.joinPath(vscode.Uri.joinPath(document.uri, '..'), link.target)
          vscode.env.openExternal(pdfUri)
        } else if (link.type === 'obsidian') {
          vscode.env.openExternal(vscode.Uri.parse(link.target))
        } else if (link.type === 'internal') {
          // 같은 그래프 안의 노드는 웹뷰가 직접 처리하므로 여기까지 오지 않는다.
          // 여기로 오는 것은 "다른 그래프 파일의 노드" 뿐이다.
          const parsed = parseInternalTarget(link.target)
          if (!parsed || !parsed.file) return
          const targetUri = vscode.Uri.joinPath(vscode.Uri.joinPath(document.uri, '..'), parsed.file)
          try {
            await vscode.workspace.fs.stat(targetUri)
          } catch {
            vscode.window.showErrorMessage(`NodeGraph: couldn't find ${parsed.file}`)
            return
          }
          // 코드 링크와 같은 규칙으로 그래프의 바로 오른쪽 그룹에 연다
          const viewColumn = columnRightOf(
            vscode.window.tabGroups.all.map(g => g.viewColumn),
            webviewPanel.viewColumn,
          ) ?? vscode.ViewColumn.Beside
          await vscode.commands.executeCommand('vscode.openWith', targetUri, 'nodegraph.editor', { viewColumn, preserveFocus: false })
          // 그 그래프의 웹뷰는 방금 열렸을 수 있어 아직 'ready'를 보내기 전일 수 있다 —
          // 등록될 때까지 짧게 기다렸다가 포커스 요청을 보낸다.
          const key = targetUri.toString()
          for (let i = 0; i < 40; i++) {
            const panel = NodeGraphEditorProvider._panels.get(key)
            if (panel) { panel.webview.postMessage({ type: 'focusNode', nodeId: parsed.nodeId }); return }
            await new Promise(r => setTimeout(r, 50))
          }
        } else if (link.type === 'code') {
          const { path: relPath, startLine, endLine } = parseCodeLinkTarget(link.target)
          try {
            const fileUri = vscode.Uri.joinPath(vscode.Uri.joinPath(document.uri, '..'), relPath)
            // 코드는 그래프를 덮지 않고 항상 그래프의 "바로 오른쪽" 그룹에 연다 —
            // 처음엔 새 그룹(Beside)을 만들고, 그 다음부터는 같은 그룹을 재사용해서
            // 점프할 때마다 창이 계속 쪼개지지 않게 한다 (RTLGraph의 openCodeBeside/
            // columnRightOf와 동일한 규칙).
            const viewColumn = columnRightOf(
              vscode.window.tabGroups.all.map(g => g.viewColumn),
              webviewPanel.viewColumn
            ) ?? vscode.ViewColumn.Beside
            if (relPath.toLowerCase().endsWith('.ipynb')) {
              // Jupyter notebooks can't go through openTextDocument/showTextDocument —
              // that opens the raw backing JSON in a text editor, not the notebook UI,
              // and "line numbers" would address JSON source lines. Use the notebook
              // API instead, and interpret :N / :N-M as 1-based CELL numbers.
              const nb = await vscode.workspace.openNotebookDocument(fileUri)
              const nbEditor = await vscode.window.showNotebookDocument(nb, { preview: false, viewColumn })
              if (startLine) {
                const start = Math.min(Math.max(0, startLine - 1), nb.cellCount - 1)
                const end = Math.min(Math.max(start, (endLine ?? startLine) - 1), nb.cellCount - 1)
                const range = new vscode.NotebookRange(start, end + 1)
                nbEditor.selection = range
                nbEditor.revealRange(range, vscode.NotebookEditorRevealType.InCenter)
              }
            } else {
              const doc = await vscode.workspace.openTextDocument(fileUri)
              const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn })
              if (startLine) {
                const start = Math.max(0, startLine - 1)
                const end = Math.max(start, (endLine ?? startLine) - 1)
                const endLineLen = doc.lineAt(Math.min(end, doc.lineCount - 1)).text.length
                const range = new vscode.Range(start, 0, end, endLineLen)
                editor.selection = new vscode.Selection(range.start, range.end)
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter)
              }
            }
          } catch {
            vscode.window.showErrorMessage(`NodeGraph: couldn't open ${relPath}`)
          }
        }
      } else if (msg.type === 'searchInPdf') {
        const pdfUri = vscode.Uri.joinPath(vscode.Uri.joinPath(document.uri, '..'), msg.pdfTarget)
        PdfViewerPanel.openAndSearch(this.context, pdfUri, msg.query, msg.pageHint)
      } else if (msg.type === 'exportHtml') {
        try {
          const data: NodeGraph = msg.data
          const docDir = vscode.Uri.joinPath(document.uri, '..')
          const baseName = path.basename(document.uri.fsPath, '.nodegraph.json')
          const imgsFolder = vscode.Uri.joinPath(docDir, `.${baseName}-imgs`)

          // Read all referenced images and encode as base64 data URIs
          const imageData: Record<string, string> = {}
          const INLINE_IMG_RE = /\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g
          const loadImg = async (filename: string) => {
            if (!filename || imageData[filename]) return
            try {
              const imgUri = vscode.Uri.joinPath(imgsFolder, filename)
              const bytes = await vscode.workspace.fs.readFile(imgUri)
              const ext = filename.split('.').pop()?.toLowerCase() ?? 'png'
              const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
                : ext === 'gif' ? 'image/gif'
                : ext === 'webp' ? 'image/webp'
                : 'image/png'
              imageData[filename] = `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
            } catch { /* image file not found */ }
          }
          for (const node of data.nodes) {
            INLINE_IMG_RE.lastIndex = 0
            let m: RegExpExecArray | null
            while ((m = INLINE_IMG_RE.exec(node.content ?? '')) !== null) await loadImg(m[1])
          }

          const githubBase = resolveGitHubBase(docDir.fsPath)
          const repoPrefix = githubBase ? resolveRepoRelativePrefix(docDir.fsPath) : ''
          // 코드 블록은 내보내기 시점에 미리 구워 넣는다 — 그래야 내보낸 HTML에
          // 하이라이터가 아니라 결과 <span>만 들어간다
          const codeHtml: Record<string, string> = {}
          for (const node of data.nodes) {
            for (const blk of collectCodeBlocks(node.content ?? '')) {
              const key = codeKey(blk.lang, blk.code)
              if (key in codeHtml) continue
              const html = await highlightCode(blk.code, blk.lang)
              if (html) codeHtml[key] = html
            }
          }
          const internalTitles = await resolveInternalTitles(document.uri, data)
          const htmlContent = generateHtml(data, imageData, { githubBase, repoPrefix }, codeHtml, internalTitles)
          const outUri = vscode.Uri.joinPath(docDir, `${baseName}.html`)
          await vscode.workspace.fs.writeFile(outUri, Buffer.from(htmlContent, 'utf-8'))
          const choice = await vscode.window.showInformationMessage(
            `HTML exported: ${baseName}.html`,
            'Open in Browser', 'Show in Explorer'
          )
          if (choice === 'Open in Browser') {
            vscode.env.openExternal(outUri)
          } else if (choice === 'Show in Explorer') {
            vscode.commands.executeCommand('revealFileInOS', outUri)
          }
        } catch (err) {
          vscode.window.showErrorMessage(`HTML export failed: ${err}`)
        }
      } else if (msg.type === 'saveImage') {
        try {
          const { filename, webviewUri } = await saveImageToAssetsFolder(
            webviewPanel.webview, document.uri, msg.data, msg.ext ?? 'png'
          )
          webviewPanel.webview.postMessage({ type: 'imageSaved', nodeId: msg.nodeId, filename, webviewUri })
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to save image: ${err}`)
        }
      } else if (msg.type === 'deleteImageFile') {
        await deleteImageFile(document.uri, msg.filename)
      } else if (msg.type === 'reload') {
        try {
          const bytes = await vscode.workspace.fs.readFile(document.uri)
          const text = Buffer.from(bytes).toString('utf-8')
          const data: NodeGraph = JSON.parse(text)
          const imageUris = computeImageUris(webviewPanel.webview, document.uri, data)
          webviewPanel.webview.postMessage({ type: 'load', data, imageUris })
        } catch {
          sendGraph('load')
        }
      } else if (msg.type === 'highlightCode') {
        // 웹뷰가 코드 블록을 만나면 요청한다. 실패해도 웹뷰가 평문으로 보여주므로
        // 에러를 띄우지 않고 null만 돌려준다.
        const html = await highlightCode(String(msg.code ?? ''), String(msg.lang ?? ''))
        webviewPanel.webview.postMessage({ type: 'codeHighlighted', lang: msg.lang, code: msg.code, html })
      } else if (msg.type === 'openHelp') {
        // vsce는 패키징할 때 README를 소문자 `readme.md`로 넣는다. 대문자 이름만 찾으면
        // 대소문자를 구분하는 파일시스템(리눅스)에서는 없는 파일을 열게 되어 Help가
        // 아무 일도 하지 않는다 — 설치본을 확인해 보면 실제로 readme.md 하나뿐이다.
        let readmeUri: vscode.Uri | null = null
        for (const name of ['README.md', 'readme.md']) {
          const candidate = vscode.Uri.joinPath(this.context.extensionUri, name)
          try {
            await vscode.workspace.fs.stat(candidate)
            readmeUri = candidate
            break
          } catch { /* 다음 후보 */ }
        }
        if (!readmeUri) {
          vscode.window.showErrorMessage('NodeGraph: the bundled README could not be found.')
          return
        }
        vscode.commands.executeCommand('markdown.showPreviewToSide', readmeUri.with({ fragment: 'features' }))
      }
    })

    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (this._pendingSaves.has(document.uri.toString())) return
      sendGraph('externalChange')
    })

    // Track which webview is currently active so extension commands can reach it
    NodeGraphEditorProvider._activeWebview = webviewPanel.webview
    NodeGraphEditorProvider._panels.set(document.uri.toString(), webviewPanel)
    NodeGraphEditorProvider._lastActiveUri = document.uri.toString()
    // Tab events can fire before this panel is registered (first open), so sync
    // here and on every view-state change too.
    NodeGraphEditorProvider.syncGraphTabContext()
    webviewPanel.onDidChangeViewState(e => {
      NodeGraphEditorProvider.syncGraphTabContext()
      if (e.webviewPanel.active) {
        NodeGraphEditorProvider._activeWebview = webviewPanel.webview
        NodeGraphEditorProvider._lastActiveUri = document.uri.toString()
        // Switching back to this tab from another webview (e.g. the Help-opened
        // README preview, itself a webview) doesn't reliably hand DOM keyboard
        // focus back into our iframe the way switching to/from a plain text
        // editor does — the webview's own `visibilitychange`/focus events aren't
        // a reliable signal for this (they track OS-level window visibility, not
        // per-panel active state within VSCode). `onDidChangeViewState` is the
        // one API VSCode actually fires for "this panel just became active", so
        // tell the webview to reclaim focus on its canvas explicitly here.
        webviewPanel.webview.postMessage({ type: 'focusCanvas' })
      }
    })

    webviewPanel.onDidDispose(() => {
      msgDisposable.dispose()
      changeDisposable.dispose()
      if (NodeGraphEditorProvider._activeWebview === webviewPanel.webview) {
        NodeGraphEditorProvider._activeWebview = null
      }
      if (NodeGraphEditorProvider._panels.get(document.uri.toString()) === webviewPanel) {
        NodeGraphEditorProvider._panels.delete(document.uri.toString())
      }
      NodeGraphEditorProvider.syncGraphTabContext()
    })
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    )
    const katexCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'katex', 'katex.min.css')
    )
    const nonce = getNonce()
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeGraph</title>
  <link rel="stylesheet" href="${katexCssUri}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; overflow: hidden; }
    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    /* No overflow-x here on purpose: making .katex-display a scroll container
       zeroes its min-content contribution, so nothing would ever size the node
       to fit the formula — the user explicitly wants wide formulas to WIDEN the
       node (NodeCard's katex-width effect), never to scroll inside it. */
    .katex-display { margin: 0.5em 0; }
    .katex-html { white-space: nowrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }
}

// code 링크 점프가 열릴 그룹: 그래프가 있는 그룹의 바로 오른쪽. `columns`는 현재
// 열린 그룹들의 viewColumn(왼쪽→오른쪽), `holding`은 그래프가 있는 그룹. 오른쪽에
// 그룹이 이미 있으면 그걸 반환(재사용 — 점프를 반복해도 창이 더 안 쪼개짐), 없으면
// undefined(호출부가 ViewColumn.Beside로 새 그룹 생성). RTLGraph의 columnRightOf와
// 동일한 규칙.
function columnRightOf(columns: readonly vscode.ViewColumn[], holding: vscode.ViewColumn | undefined): vscode.ViewColumn | undefined {
  const at = holding === undefined ? -1 : columns.indexOf(holding)
  if (at < 0) return columns.length > 1 ? columns[1] : undefined
  return columns[at + 1]
}
