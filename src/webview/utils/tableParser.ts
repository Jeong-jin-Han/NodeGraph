export interface TextBlock {
  type: 'text'
  text: string
  startChar: number
  endChar: number
}

export interface TableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
  startChar: number
  endChar: number
}

/**
 * ```lang 펜스로 감싼 코드. 지금까지는 이런 블록이 없어서 백틱 세 개가 글자 그대로
 * 나왔다 — 본문과 똑같은 색·서체라 코드가 코드로 보이지 않는 원인이었다.
 */
export interface CodeBlock {
  type: 'code'
  lang: string
  code: string
  startChar: number
  endChar: number
}

export type ContentBlock = TextBlock | TableBlock | CodeBlock

const FENCE_RE = /^\s*```([A-Za-z0-9_+#-]*)\s*$/

function isTableLine(line: string): boolean {
  return /^\s*\|/.test(line) && line.indexOf('|', 1) !== -1
}

function isSepLine(line: string): boolean {
  // only |, -, :, space — no alphanumerics
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line) && !/[a-zA-Z0-9]/.test(line)
}

function parseCells(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim())
}

export function parseTableBlocks(content: string): ContentBlock[] {
  if (!content) return [{ type: 'text', text: '', startChar: 0, endChar: 0 }]

  const lines = content.split('\n')
  const blocks: ContentBlock[] = []
  let i = 0
  let charPos = 0

  // Length of line[idx] in the original string (includes trailing \n except for last line)
  const lineCharLen = (idx: number) => lines[idx].length + (idx < lines.length - 1 ? 1 : 0)

  while (i < lines.length) {
    const fence = FENCE_RE.exec(lines[i])
    if (fence) {
      const startChar = charPos
      const lang = (fence[1] || '').toLowerCase()
      charPos += lineCharLen(i)
      i++
      const codeLines: string[] = []
      let closed = false
      while (i < lines.length) {
        if (FENCE_RE.test(lines[i])) { charPos += lineCharLen(i); i++; closed = true; break }
        codeLines.push(lines[i])
        charPos += lineCharLen(i)
        i++
      }
      // 닫히지 않은 펜스는 코드로 보지 않는다 — 편집 도중의 반쪽 상태일 뿐이다
      if (closed) {
        blocks.push({ type: 'code', lang, code: codeLines.join('\n'), startChar, endChar: charPos })
      } else {
        blocks.push({ type: 'text', text: [lines[i - codeLines.length - 1], ...codeLines].join('\n'), startChar, endChar: charPos })
      }
      continue
    }

    const isTableStart =
      isTableLine(lines[i]) &&
      i + 1 < lines.length &&
      isSepLine(lines[i + 1])

    if (isTableStart) {
      const startChar = charPos
      const tableLines: string[] = []
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i])
        charPos += lineCharLen(i)
        i++
      }
      if (tableLines.length >= 3) {
        blocks.push({
          type: 'table',
          headers: parseCells(tableLines[0]),
          rows: tableLines.slice(2).map(parseCells),
          startChar,
          endChar: charPos,
        })
      } else {
        // header + sep only — not a valid table, treat as text
        blocks.push({ type: 'text', text: tableLines.join('\n'), startChar, endChar: charPos })
      }
    } else {
      const startChar = charPos
      const textLines: string[] = []
      while (i < lines.length) {
        if (isTableLine(lines[i]) && i + 1 < lines.length && isSepLine(lines[i + 1])) break
        if (FENCE_RE.test(lines[i])) break
        textLines.push(lines[i])
        charPos += lineCharLen(i)
        i++
      }
      blocks.push({ type: 'text', text: textLines.join('\n'), startChar, endChar: charPos })
    }
  }

  return blocks
}

/** 닫힌 코드 펜스가 하나라도 있는지 — 전체 파싱 없이 싸게 판정한다. */
export function hasCodeFence(content: string): boolean {
  if (!content || content.indexOf('```') === -1) return false
  let open = false
  for (const line of content.split('\n')) {
    if (!FENCE_RE.test(line)) continue
    if (open) return true      // 열고 닫혔다
    open = true
  }
  return false
}

/** 본문에 하이라이팅할 코드 블록이 있는지 — 없으면 하이라이터를 부르지 않는다. */
export function collectCodeBlocks(content: string): Array<{ lang: string; code: string }> {
  return parseTableBlocks(content)
    .filter((b): b is CodeBlock => b.type === 'code')
    .map(b => ({ lang: b.lang, code: b.code }))
}

export function hasTable(content: string): boolean {
  const lines = content.split('\n')
  for (let i = 0; i + 1 < lines.length; i++) {
    if (isTableLine(lines[i]) && isSepLine(lines[i + 1])) return true
  }
  return false
}
