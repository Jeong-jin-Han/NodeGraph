import React, { useMemo } from 'react'
import katex from 'katex'
import { groupListsInHtml } from '../utils/listBlocks'

// $$...$$ = display math, $...$ = inline math
const MATH_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
// **...** = bold (단일 줄 내에서만 적용)
const BOLD_RE = /\*\*(.+?)\*\*/g
// \$ = 리터럴 달러(통화) — math 구분자 매칭 전에 placeholder로 보호
const DOLLAR_PH = '\u0001'
const DOLLAR_PH_RE = /\u0001/g

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// KaTeX가 뱉은 HTML은 줄 단위 목록 처리에서 건드리면 안 되므로 placeholder로 빼둔다
const MATH_PH_OPEN = ''
const MATH_PH_CLOSE = ''
const MATH_PH_RE = /(\d+)/g

export function processLatex(text: string): string {
  const mathHtml: string[] = []
  const parts = text.replace(/\\\$/g, DOLLAR_PH).split(MATH_RE)
  const stashed = parts.map(part => {
    const display = part.startsWith('$$') && part.endsWith('$$') && part.length > 4
    const inline = !display && part.startsWith('$') && part.endsWith('$') && part.length > 2
    if (display || inline) {
      const body = (display ? part.slice(2, -2) : part.slice(1, -1)).trim().replace(DOLLAR_PH_RE, '\\$')
      let rendered: string
      try {
        rendered = katex.renderToString(body, { displayMode: display, throwOnError: false, output: 'html' })
      } catch { rendered = escapeHtml(part) }
      mathHtml.push(rendered)
      return `${MATH_PH_OPEN}${mathHtml.length - 1}${MATH_PH_CLOSE}`
    }
    // 텍스트 파트: ** ** → bold 변환 (** 기호는 렌더링 시 숨김). \n 은 여기서 건드리지
    // 않는다 — 줄 단위 목록 묶기가 끝난 뒤 groupListsInHtml이 <br>로 바꾼다
    return escapeHtml(part).replace(BOLD_RE, '<strong style="font-size:1.1em">$1</strong>')
  }).join('')

  return groupListsInHtml(stashed)
    .replace(MATH_PH_RE, (_, i: string) => mathHtml[Number(i)])
    .replace(DOLLAR_PH_RE, () => '$')
}

interface MathTextProps {
  text: string
  style?: React.CSSProperties
}

export function MathText({ text, style }: MathTextProps) {
  const html = useMemo(() => processLatex(text), [text])
  return <span dangerouslySetInnerHTML={{ __html: html }} style={style} />
}
