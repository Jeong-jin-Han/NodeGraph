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

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    NodeGraphEditorProvider.register(context)
  )

  // Generate .agent/ENVIRONMENT.md so AI agents know what tools are available
  writeEnvironmentReport(vscode.workspace.workspaceFolders ?? [])

  // Install recommended companion extensions (skip if already installed)
  installRecommendedExtensions()
}

export function deactivate(): void {}
