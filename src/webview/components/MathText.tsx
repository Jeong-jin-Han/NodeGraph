import React, { useMemo } from 'react'
import katex from 'katex'

// $$...$$ = display math, $...$ = inline math
const MATH_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function processLatex(text: string): string {
  const parts = text.split(MATH_RE)
  return parts.map(part => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      try {
        return katex.renderToString(part.slice(2, -2).trim(), { displayMode: true, throwOnError: false, output: 'html' })
      } catch { return escapeHtml(part) }
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      try {
        return katex.renderToString(part.slice(1, -1).trim(), { displayMode: false, throwOnError: false, output: 'html' })
      } catch { return escapeHtml(part) }
    }
    return escapeHtml(part).replace(/\n/g, '<br>')
  }).join('')
}

interface MathTextProps {
  text: string
  style?: React.CSSProperties
}

export function MathText({ text, style }: MathTextProps) {
  const html = useMemo(() => processLatex(text), [text])
  return <span dangerouslySetInnerHTML={{ __html: html }} style={style} />
}
