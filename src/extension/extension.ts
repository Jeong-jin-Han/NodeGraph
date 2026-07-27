import * as vscode from 'vscode'
import { NodeGraphEditorProvider } from './NodeGraphEditorProvider'
import { writeEnvironmentReport } from './environmentChecker'
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

async function createNewGraph(): Promise<void> {
  const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri
  const defaultUri = wsFolder
    ? vscode.Uri.joinPath(wsFolder, 'untitled.nodegraph.json')
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
    vscode.commands.registerCommand('nodegraph.new', () => createNewGraph())
  )

  // Generate .agent/ENVIRONMENT.md so AI agents know what tools are available
  writeEnvironmentReport(vscode.workspace.workspaceFolders ?? [])

  // Install recommended companion extensions (skip if already installed)
  installRecommendedExtensions()
}

export function deactivate(): void {}
