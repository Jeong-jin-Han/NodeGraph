// Shared by NodeGraphEditorProvider (jump-to-line in the live editor) and
// htmlExporter (GitHub blob+line URLs in the exported HTML) so both parse a
// 'code' link's target the same way. Format: "path/to/file.ts" or
// "path/to/file.ts:42" or "path/to/file.ts:42-58" (1-indexed, inclusive).
export interface ParsedCodeTarget {
  path: string
  startLine?: number
  endLine?: number
}

export function parseCodeLinkTarget(target: string): ParsedCodeTarget {
  const m = target.match(/^(.+):(\d+)(?:-(\d+))?$/)
  if (!m) return { path: target }
  return {
    path: m[1],
    startLine: parseInt(m[2], 10),
    endLine: m[3] ? parseInt(m[3], 10) : undefined,
  }
}
