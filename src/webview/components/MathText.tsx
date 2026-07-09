import React, { useMemo } from 'react'
import katex from 'katex'

// $$...$$ = display math, $...$ = inline math
const MATH_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
// **...** = bold (단일 줄 내에서만 적용)
const BOLD_RE = /\*\*(.+?)\*\*/g

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
    // 텍스트 파트: ** ** → bold 변환 (** 기호는 렌더링 시 숨김)
    return escapeHtml(part)
      .replace(BOLD_RE, '<strong style="font-size:1.1em">$1</strong>')
      .replace(/\n/g, '<br>')
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
