import * as vscode from 'vscode'
import { NodeGraph } from '../webview/types/graph'

function getImgsFolder(documentUri: vscode.Uri): vscode.Uri {
  const documentDir = vscode.Uri.joinPath(documentUri, '..')
  const baseName = documentUri.path.split('/').pop()?.replace(/\.nodegraph\.json$/, '') ?? 'graph'
  return vscode.Uri.joinPath(documentDir, `.${baseName}-imgs`)
}

export function getImageWebviewUri(
  webview: vscode.Webview,
  documentUri: vscode.Uri,
  filename: string
): string {
  const imageUri = vscode.Uri.joinPath(getImgsFolder(documentUri), filename)
  return webview.asWebviewUri(imageUri).toString()
}

const INLINE_IMG_RE = /\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g

export function computeImageUris(
  webview: vscode.Webview,
  documentUri: vscode.Uri,
  graph: NodeGraph
): Record<string, string> {
  const uris: Record<string, string> = {}
  const add = (fn: string) => { if (fn && !uris[fn]) uris[fn] = getImageWebviewUri(webview, documentUri, fn) }
  for (const node of graph.nodes) {
    for (const img of node.images) add(img.filename)
    // Also pick up [[IMG:filename]] tokens embedded directly in content text
    INLINE_IMG_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = INLINE_IMG_RE.exec(node.content ?? '')) !== null) add(m[1])
  }
  for (const ci of graph.canvasImages ?? []) add(ci.filename)
  return uris
}

export async function saveImageToAssetsFolder(
  webview: vscode.Webview,
  documentUri: vscode.Uri,
  base64Data: string,
  ext: string = 'png'
): Promise<{ filename: string; webviewUri: string }> {
  const imgsFolder = getImgsFolder(documentUri)
  try { await vscode.workspace.fs.createDirectory(imgsFolder) } catch { /* already exists */ }

  const filename = `img_${Date.now()}.${ext}`
  const imageUri = vscode.Uri.joinPath(imgsFolder, filename)
  await vscode.workspace.fs.writeFile(imageUri, Buffer.from(base64Data, 'base64'))

  return { filename, webviewUri: webview.asWebviewUri(imageUri).toString() }
}

export async function deleteImageFile(documentUri: vscode.Uri, filename: string): Promise<void> {
  const imgUri = vscode.Uri.joinPath(getImgsFolder(documentUri), filename)
  try { await vscode.workspace.fs.delete(imgUri) } catch { /* file missing or already deleted */ }
}
