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

export type ContentBlock = TextBlock | TableBlock

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
        textLines.push(lines[i])
        charPos += lineCharLen(i)
        i++
      }
      blocks.push({ type: 'text', text: textLines.join('\n'), startChar, endChar: charPos })
    }
  }

  return blocks
}

export function hasTable(content: string): boolean {
  const lines = content.split('\n')
  for (let i = 0; i + 1 < lines.length; i++) {
    if (isTableLine(lines[i]) && isSepLine(lines[i + 1])) return true
  }
  return false
}
