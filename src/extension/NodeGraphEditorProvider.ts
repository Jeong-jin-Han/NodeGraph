import * as vscode from 'vscode'
import * as path from 'path'
import { NodeGraph } from '../webview/types/graph'
import { computeImageUris, saveImageToAssetsFolder, deleteImageFile } from './imageManager'
import { generateHtml } from './htmlExporter'

export class NodeGraphEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NodeGraphEditorProvider(context)
    return vscode.window.registerCustomEditorProvider(
      'nodegraph.editor',
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  }

  private readonly _pendingSaves = new Set<string>()

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const documentDir = vscode.Uri.joinPath(document.uri, '..')
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, documentDir],
    }
    webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview)

    const sendGraph = (type: 'load' | 'externalChange') => {
      try {
        const data: NodeGraph = JSON.parse(document.getText())
        const imageUris = computeImageUris(webviewPanel.webview, document.uri, data)
        webviewPanel.webview.postMessage({ type, data, imageUris })
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
        }
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

          const htmlContent = generateHtml(data, imageData)
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
      }
    })

    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (this._pendingSaves.has(document.uri.toString())) return
      sendGraph('externalChange')
    })

    webviewPanel.onDidDispose(() => {
      msgDisposable.dispose()
      changeDisposable.dispose()
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

function getNonce(): string {
  let text = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return text
}
