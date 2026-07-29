import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { THEME } from './utils/themeSnapshot'
import './styles/theme.css'

// theme.css still has var(--vscode-editor-background, ...) as its literal fallback, so
// pin body to the fixed THEME palette (see themeSnapshot.ts) here to override that and
// keep it from tracking the active VSCode theme.
document.body.style.background = THEME.canvasBg
document.body.style.color = THEME.fg
document.documentElement.style.setProperty('--ng-scrollbar-thumb', THEME.scrollbarThumb)

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
