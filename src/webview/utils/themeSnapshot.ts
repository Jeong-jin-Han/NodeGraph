// The whole editor's appearance (canvas background, node cards, tables, inputs) is fixed
// and never reacts to the active VSCode color theme, on load or after. These mirror the
// same palette htmlExporter.ts hardcodes for the exported HTML, so the canvas looks
// identical whether you're editing in VSCode or viewing the standalone export.
export const THEME = {
  canvasBg: '#f4f4f5',
  nodeBg: '#ffffff',
  fg: '#1a1a1a',
  linkFg: '#2563eb',
  inputBg: '#ffffff',
  inputFg: '#374151',
  inputBorder: '#d1d5db',
  scrollbarThumb: 'rgba(0,0,0,0.2)',
}
