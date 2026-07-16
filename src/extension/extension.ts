import * as vscode from 'vscode'
import { NodeGraphEditorProvider } from './NodeGraphEditorProvider'
import { writeEnvironmentReport } from './environmentChecker'

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

// nodegraph.new로 생성되는 빈 그래프의 기본 템플릿 (spec의 8종과 동일)
const DEFAULT_TEMPLATES = {
  main_topic: { label: 'Main topic', color: '#4B8BBE', icon: 'file-text', shape: 'sharp' },
  method: { label: 'Method', color: '#5C9E6E', icon: 'cpu', shape: 'sharp' },
  result: { label: 'Result', color: '#9B59B6', icon: 'bar-chart-2', shape: 'sharp' },
  claim: { label: 'Claim', color: '#E74C3C', icon: 'alert-circle', shape: 'sharp' },
  question: { label: 'Question', color: '#E5A835', icon: 'help-circle', shape: 'rounded' },
  gap: { label: 'Gap / Idea', color: '#1ABC9C', icon: 'lightbulb', shape: 'rounded' },
  reference: { label: 'Reference', color: '#95A5A6', icon: 'book-open', shape: 'rounded' },
  memo: { label: 'Memo', color: '#BDC3C7', icon: 'edit-3', shape: 'rounded' },
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
  const now = new Date().toISOString()
  const starter = {
    version: '1.0.0',
    title: 'New Graph',
    created: now,
    modified: now,
    nodeTemplates: DEFAULT_TEMPLATES,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
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
