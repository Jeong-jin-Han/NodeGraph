import * as vscode from 'vscode'
import { NodeGraphEditorProvider } from './NodeGraphEditorProvider'
import { writeEnvironmentReport, syncAgentSpec } from './environmentChecker'
import { createEmptyGraph } from './defaultGraph'

const RECOMMENDED_EXTENSIONS = [
  { id: 'tomoki1207.pdf', name: 'vscode-pdf (PDF Viewer)' },
]

async function installRecommendedExtensions(): Promise<void> {
  for (const ext of RECOMMENDED_EXTENSIONS) {
    if (!vscode.extensions.getExtension(ext.id)) {
      try {
        await vscode.commands.executeCommand('workbench.extensions.installExtension', ext.id)
      } catch {
        // silently skip — may fail in restricted environments
      }
    }
  }
}

// Resolves which folder a command should act on. When invoked from the
// Explorer's right-click menu on a specific folder, VSCode passes that
// folder's URI as the first argument — use it directly instead of guessing.
// Otherwise (Command Palette, no folder context) fall back to the single
// workspace folder if there's only one, or ask via a picker if there are
// several — never silently default to "the first one", which is wrong as
// soon as more than one folder is open.
async function resolveTargetFolder(clickedUri?: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (clickedUri) return clickedUri
  const folders = vscode.workspace.workspaceFolders ?? []
  if (folders.length === 0) return undefined
  if (folders.length === 1) return folders[0].uri
  const picked = await vscode.window.showWorkspaceFolderPick({ placeHolder: 'Select a folder for NodeGraph' })
  return picked?.uri
}

async function createNewGraph(clickedUri?: vscode.Uri): Promise<void> {
  const targetFolder = await resolveTargetFolder(clickedUri)
  const defaultUri = targetFolder
    ? vscode.Uri.joinPath(targetFolder, 'untitled.nodegraph.json')
    : undefined
  const picked = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { 'NodeGraph': ['nodegraph.json'] },
    title: 'Create New NodeGraph',
  })
  if (!picked) return
  const uri = picked.fsPath.endsWith('.nodegraph.json')
    ? picked
    : picked.with({ path: picked.path.replace(/(\.nodegraph)?(\.json)?$/, '') + '.nodegraph.json' })
  const starter = createEmptyGraph()
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(starter, null, 2), 'utf-8'))
  await vscode.commands.executeCommand('vscode.openWith', uri, 'nodegraph.editor')
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    NodeGraphEditorProvider.register(context)
  )

  // Ctrl+F in the NodeGraph editor opens the in-graph search bar.
  // VSCode intercepts Ctrl+F before the webview JS can see it, so we register
  // a keybinding (package.json) that fires this command instead.
  context.subscriptions.push(
    vscode.commands.registerCommand('nodegraph.search', () => {
      NodeGraphEditorProvider.postToActive({ type: 'openSearch' })
    }),
    vscode.commands.registerCommand('nodegraph.fitView', () => {
      NodeGraphEditorProvider.postToActive({ type: 'fitView' })
    }),
    vscode.commands.registerCommand('nodegraph.collapseAll', () => {
      NodeGraphEditorProvider.postToActive({ type: 'collapseAll' })
    }),
    vscode.commands.registerCommand('nodegraph.expandAll', () => {
      NodeGraphEditorProvider.postToActive({ type: 'expandAll' })
    }),
    vscode.commands.registerCommand('nodegraph.new', (uri?: vscode.Uri) => createNewGraph(uri))
  )

  // Generate .agent/ENVIRONMENT.md so AI agents know what tools are available
  writeEnvironmentReport(vscode.workspace.workspaceFolders ?? [])

  // Copying .agent/NODEGRAPH_SPEC.md into the workspace is opt-in (unlike
  // ENVIRONMENT.md above) — it's a large static doc, not per-machine info, so
  // it shouldn't silently land in the user's own repo. Run only on command.
  context.subscriptions.push(
    vscode.commands.registerCommand('nodegraph.copyAgentSpec', async (clickedUri?: vscode.Uri) => {
      const target = await resolveTargetFolder(clickedUri)
      if (!target) {
        vscode.window.showWarningMessage('NodeGraph: open or select a folder first — there is no workspace to copy the spec into.')
        return
      }
      const ok = await syncAgentSpec(context.extensionUri, target)
      if (ok) {
        vscode.window.showInformationMessage(`NodeGraph: copied NODEGRAPH_SPEC.md to .agent/ in ${target.fsPath}.`)
      } else {
        vscode.window.showErrorMessage('NodeGraph: failed to copy the agent spec — check that the folder is writable and try again.')
      }
    })
  )

  // Install recommended companion extensions (skip if already installed)
  installRecommendedExtensions()
}

export function deactivate(): void {}
