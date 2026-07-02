import * as vscode from 'vscode'
import { NodeGraphEditorProvider } from './NodeGraphEditorProvider'

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    NodeGraphEditorProvider.register(context)
  )
}

export function deactivate(): void {}
