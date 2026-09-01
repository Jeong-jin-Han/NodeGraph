import * as vscode from 'vscode'
import * as fs from 'fs'
import { getNonce } from './nonce'

interface PendingSearch {
  query: string
  pageHint?: number
}

interface PanelEntry {
  panel: vscode.WebviewPanel
  ready: boolean
  pending: PendingSearch | null
}

// One webview panel per PDF path so re-searching the same paper reuses its tab
// instead of spawning duplicates; `original` quotes drive the search text and
// `original.location`'s page number narrows it to the right page.
export class PdfViewerPanel {
  private static panels = new Map<string, PanelEntry>()

  public static async openAndSearch(
    context: vscode.ExtensionContext,
    pdfUri: vscode.Uri,
    query: string,
    pageHint?: number
  ): Promise<void> {
    const key = pdfUri.toString()
    const existing = PdfViewerPanel.panels.get(key)
    if (existing) {
      existing.panel.reveal(vscode.ViewColumn.Beside, true)
      if (existing.ready) {
        existing.panel.webview.postMessage({ type: 'search', query, pageHint })
      } else {
        existing.pending = { query, pageHint }
      }
      return
    }

    let bytes: Uint8Array
    try {
      bytes = await vscode.workspace.fs.readFile(pdfUri)
    } catch {
      vscode.window.showErrorMessage(`PDF를 찾을 수 없습니다: ${pdfUri.fsPath}`)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      'nodegraph.pdfViewer',
      pdfUri.path.split('/').pop() ?? 'PDF',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
      }
    )

    const entry: PanelEntry = { panel, ready: false, pending: { query, pageHint } }
    PdfViewerPanel.panels.set(key, entry)

    // Opened from NodeGraph (quote-jump), so brand its tab with the same icon
    // as the .nodegraph.json editor rather than the default PDF file icon.
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon-hires.png')

    panel.webview.html = PdfViewerPanel._getHtml(context, panel.webview)
    const base64 = Buffer.from(bytes).toString('base64')

    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'ready') {
        entry.ready = true
        panel.webview.postMessage({
          type: 'load',
          pdfData: base64,
          query: entry.pending?.query,
          pageHint: entry.pending?.pageHint,
        })
        entry.pending = null
      }
    })

    panel.onDidDispose(() => {
      PdfViewerPanel.panels.delete(key)
    })
  }

  // Serves Mozilla's official pdf.js reference viewer (vendored via esbuild.js's
  // copyPdfjsAssets() into dist/pdfjs-viewer/) instead of a hand-rolled UI — see
  // bridge.ts for how NodeGraph drives it (open, quote search, highlighting) through
  // its own public API. We don't touch the vendored viewer.html; a <base> tag makes
  // every relative href/src in it resolve to the right webview URI without having to
  // rewrite each one by hand, the same trick used to embed any static multi-file app
  // in a VS Code webview.
  private static _getHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const webDir = vscode.Uri.joinPath(context.extensionUri, 'dist', 'pdfjs-viewer', 'web')
    const baseUri = webview.asWebviewUri(webDir).toString() + '/'
    const workerUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'pdfjs-viewer', 'build', 'pdf.worker.min.mjs')
    )
    const viewerHtmlPath = vscode.Uri.joinPath(webDir, 'viewer.html').fsPath
    const nonce = getNonce()

    const csp = `default-src 'none'; img-src ${webview.cspSource} data: blob:; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; worker-src ${webview.cspSource} blob:; connect-src ${webview.cspSource} blob:;`

    const html = fs.readFileSync(viewerHtmlPath, 'utf-8')
    // The "webviewerloaded" listener is the official embedder hook: viewer.mjs
    // dispatches it synchronously right before PDFViewerApplication.run(), which is
    // the only moment guaranteed to precede the viewer's startup auto-open. Doing
    // this in bridge.mjs is too late — run()'s microtask continuations can read
    // defaultUrl before the next module script even evaluates (confirmed by the
    // startup "Setting up fake worker failed ... pdf.worker.mjs" error surviving a
    // bridge-side defaultUrl reset). Clearing defaultUrl here disables the sample-PDF
    // auto-open, so the only open() call left is bridge.ts's own, which supplies the
    // workerPort. tomoki1207.pdf configures the viewer through this same event.
    return html.replace(
      '<meta charset="utf-8">',
      `<meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <base href="${baseUri}">
    <style>
      /* VS Code injects default webview styles including body{padding:0 20px} —
         that shifts the full-bleed pdf.js layout sideways and clips the toolbar's
         right edge off the panel. Reset to the full-window box the viewer expects. */
      html, body { margin: 0 !important; padding: 0 !important; }
    </style>
    <script nonce="${nonce}">
      window.__PDF_WORKER_URI__ = "${workerUri}";
      document.addEventListener('webviewerloaded', () => {
        window.PDFViewerApplicationOptions.set('defaultUrl', '');
        // Start with the sidebar closed (0 = SidebarView.NONE). An explicit 0 (rather
        // than the -1/UNKNOWN default) also overrides any remembered open state from
        // the viewer's own view-history storage. The outline stays one click away on
        // the sidebar toggle; user preference is closed-by-default (quote-jump is the
        // primary use, and the sidebar eats horizontal space in a Beside panel).
        window.PDFViewerApplicationOptions.set('sidebarViewOnLoad', 0);
      });
    </script>`
    )
  }
}
