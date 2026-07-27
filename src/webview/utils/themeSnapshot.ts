// The whole editor's appearance (canvas background, node cards, tables, inputs) is
// intentionally fixed for the rest of the session — nothing here reacts to a later VSCode
// theme switch. We still want it to start out matching whatever theme the user is actually
// on though, so each value is captured once (module init, runs once when the webview loads)
// from the live VSCode CSS variables rather than hardcoded to one specific theme.
function snapshotVar(name: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export const THEME = {
  canvasBg: snapshotVar('--vscode-editor-background', '#1e1e1e'),
  nodeBg: snapshotVar('--vscode-editor-background', '#1e1e1e'),
  fg: snapshotVar('--vscode-editor-foreground', '#d4d4d4'),
  linkFg: snapshotVar('--vscode-textLink-foreground', '#4fc1ff'),
  inputBg: snapshotVar('--vscode-input-background', '#3c3c3c'),
  inputFg: snapshotVar('--vscode-input-foreground', '#cccccc'),
  inputBorder: snapshotVar('--vscode-input-border', '#5a5a5a'),
}
