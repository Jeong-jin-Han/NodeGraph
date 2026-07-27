import * as vscode from 'vscode'
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

  private static _getHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'pdfviewer.js'))
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'pdfviewer.css'))
    const workerUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'pdf.worker.min.mjs'))
    const nonce = getNonce()
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob:; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; worker-src ${webview.cspSource} blob:; connect-src ${webview.cspSource} blob:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
  <title>PDF</title>
</head>
<body>
  <div id="root">
    <div id="status"></div>
    <div id="pages"></div>
  </div>
  <script nonce="${nonce}">window.__PDF_WORKER_URI__ = "${workerUri}";</script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`
  }
}
