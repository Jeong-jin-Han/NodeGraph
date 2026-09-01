import * as path from 'path'
import { NodeGraph, GraphNode, NodeTemplate } from '../webview/types/graph'
import { parseCodeLinkTarget } from './codeLink'

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 검색어 인라인 하이라이트: 노드 템플릿 색의 반전색(보색) 계산
function invertRgbHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: 255 - parseInt(full.slice(0, 2), 16),
    g: 255 - parseInt(full.slice(2, 4), 16),
    b: 255 - parseInt(full.slice(4, 6), 16),
  }
}
const hitKeySafe = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_')

// ── Markdown table parser (htmlExporter-specific TypeScript version) ──────────
interface HtmlTextBlock { type: 'text'; text: string; startChar: number; endChar: number }
interface HtmlTableBlock { type: 'table'; headers: string[]; rows: string[][]; startChar: number; endChar: number }
type HtmlContentBlock = HtmlTextBlock | HtmlTableBlock

function isHtmlTableLine(line: string): boolean {
  return /^\s*\|/.test(line) && line.indexOf('|', 1) !== -1
}
function isHtmlSepLine(line: string): boolean {
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line) && !/[a-zA-Z0-9]/.test(line)
}
function parseHtmlCells(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim())
}

function parseHtmlTableBlocks(content: string): HtmlContentBlock[] {
  if (!content) return [{ type: 'text', text: '', startChar: 0, endChar: 0 }]
  const lines = content.split('\n')
  const blocks: HtmlContentBlock[] = []
  let i = 0
  let charPos = 0
  const lineLen = (idx: number) => lines[idx].length + (idx < lines.length - 1 ? 1 : 0)

  while (i < lines.length) {
    const isStart = isHtmlTableLine(lines[i]) && i + 1 < lines.length && isHtmlSepLine(lines[i + 1])
    if (isStart) {
      const startChar = charPos
      const tLines: string[] = []
      while (i < lines.length && isHtmlTableLine(lines[i])) {
        tLines.push(lines[i]); charPos += lineLen(i); i++
      }
      if (tLines.length >= 3) {
        blocks.push({ type: 'table', headers: parseHtmlCells(tLines[0]), rows: tLines.slice(2).map(parseHtmlCells), startChar, endChar: charPos })
      } else {
        blocks.push({ type: 'text', text: tLines.join('\n'), startChar, endChar: charPos })
      }
    } else {
      const startChar = charPos
      const tLines: string[] = []
      while (i < lines.length) {
        if (isHtmlTableLine(lines[i]) && i + 1 < lines.length && isHtmlSepLine(lines[i + 1])) break
        tLines.push(lines[i]); charPos += lineLen(i); i++
      }
      blocks.push({ type: 'text', text: tLines.join('\n'), startChar, endChar: charPos })
    }
  }
  return blocks
}

function hasHtmlTable(content: string): boolean {
  const lines = content.split('\n')
  for (let i = 0; i + 1 < lines.length; i++) {
    if (isHtmlTableLine(lines[i]) && isHtmlSepLine(lines[i + 1])) return true
  }
  return false
}

// \$ → 리터럴 달러(통화): 단독 <span>으로 분리해 KaTeX auto-render가 텍스트 노드 안에서
// math 구분자 $로 짝짓지 못하게 함 (auto-render는 텍스트 노드 단위로만 스캔)
function escDollar(s: string): string {
  return escHtml(s).replace(/\\\$/g, () => '<span class="ng-cur">$</span>')
}

// Text → HTML: parse [[IMG:...]] tokens + **bold** markers
// LaTeX delimiters ($...$) are left as-is for KaTeX auto-render
function renderTextSegment(text: string): string {
  // **...** → <strong> (bold, 1.1em, markers hidden in view)
  return escDollar(text).replace(/\*\*(.+?)\*\*/g, '<strong style="font-size:1.1em">$1</strong>')
}

function renderCellHtml(cellText: string, imageData: Record<string, string>): string {
  const IMG_RE = /\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g
  let result = ''
  let lastIdx = 0
  let match: RegExpExecArray | null
  while ((match = IMG_RE.exec(cellText)) !== null) {
    if (match.index > lastIdx) result += renderTextSegment(cellText.slice(lastIdx, match.index))
    const filename = match[1]
    const imgW = match[2]
    const imgH = match[3]
    const sizeAttr = (imgW && imgH) ? ` width="${imgW}" height="${imgH}"` : ''
    const src = imageData[filename]
    result += src
      ? `<img class="ng-img${sizeAttr ? ' ng-img-sized' : ''}" src="${src}"${sizeAttr} alt="${escHtml(filename)}" onclick="showLightbox(this.src)" title="Click to enlarge">`
      : `<span class="ng-img-missing">${escHtml(filename)}</span>`
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < cellText.length) result += renderTextSegment(cellText.slice(lastIdx))
  return result
}

function renderTableBlockHtml(block: HtmlTableBlock, imageData: Record<string, string>): string {
  const th = block.headers.map(h => `<th>${renderCellHtml(h, imageData)}</th>`).join('')
  const rows = block.rows.map(row =>
    `<tr>${row.map(cell => `<td>${renderCellHtml(cell, imageData)}</td>`).join('')}</tr>`
  ).join('')
  return `<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`
}

function renderNodeCard(
  node: GraphNode,
  template: NodeTemplate | undefined,
  offsetX: number,
  offsetY: number,
  imageData: Record<string, string>,
  codeLinkOpts: { githubBase: string | null; repoPrefix: string },
): string {
  const color = template?.color ?? '#888'
  const borderRadius = template?.shape === 'rounded' ? '22px' : '2px'
  const label = escHtml(template?.label ?? node.template)
  const nx = Math.round(node.position.x + offsetX)
  const ny = Math.round(node.position.y + offsetY)

  let bodyHtml = ''
  const content = node.content ?? ''
  if (hasHtmlTable(content)) {
    const blocks = parseHtmlTableBlocks(content)
    bodyHtml += '<div class="ng-content">'
    for (const block of blocks) {
      if (block.type === 'table') {
        bodyHtml += renderTableBlockHtml(block, imageData)
      } else if (block.text) {
        bodyHtml += `<div class="ng-seg">${renderCellHtml(block.text, imageData).replace(/\n/g, '<br>')}</div>`
      }
    }
    bodyHtml += '</div>'
  } else if (content) {
    bodyHtml += `<div class="ng-content">${renderCellHtml(content, imageData).replace(/\n/g, '<br>')}</div>`
  }
  if (node.original) {
    const origTitle = escHtml(node.original.title ?? 'Original')
    const openAttr = node.originalExpanded ? ' open' : ''
    bodyHtml += `<details class="ng-original"${openAttr}><summary>${origTitle}${node.original.location ? ` <span class="ng-loc">${escHtml(node.original.location)}</span>` : ''}</summary>
<div class="ng-orig-text">${renderTextSegment(node.original.text).replace(/\n/g, '<br>')}</div></details>`
  }
  for (const t of node.toggleItems ?? []) {
    bodyHtml += `<details class="ng-toggle" data-toggle-id="${escHtml(t.id)}"${t.expanded ? ' open' : ''}><summary>${escHtml(t.title || '(untitled)')}</summary>
<div class="ng-toggle-body">${renderTextSegment(t.content).replace(/\n/g, '<br>')}</div></details>`
  }
  if (node.links.length) {
    bodyHtml += `<div class="ng-links">${node.links.map(l => {
      const icon = l.type === 'url' ? '🔗' : l.type === 'pdf' ? '📄' : l.type === 'obsidian' ? '🟣' : l.type === 'code' ? '💻' : '⬡'
      if (l.type === 'code') {
        // No VS Code API in a static export, so a 'code' link only resolves if the
        // graph's own repo has a github.com origin (see gitInfo.ts) — otherwise it
        // renders as inert text, same degrade-gracefully treatment as canvasImages.
        const { path: relPath, startLine, endLine } = parseCodeLinkTarget(l.target)
        // repoPrefix (json dir relative to repo root) and relPath (target relative to
        // json dir) are joined then normalized, so a target like "../src/foo.ts" from a
        // json file that isn't at the repo root still resolves to a real repo-root-relative
        // path instead of leaving a literal "prefix/../" segment in the URL.
        const repoRelPath = path.posix.normalize(codeLinkOpts.repoPrefix + relPath)
        const href = (codeLinkOpts.githubBase && !repoRelPath.startsWith('..'))
          ? ` href="${escHtml(codeLinkOpts.githubBase)}/${escHtml(repoRelPath)}${startLine ? `#L${startLine}${endLine ? `-L${endLine}` : ''}` : ''}" target="_blank"`
          : ''
        return `<a class="ng-link"${href}>${icon} ${escHtml(l.label || l.target)}</a>`
      }
      const href = (l.type === 'url' || l.type === 'pdf') ? ` href="${escHtml(l.target)}" target="_blank"` : ''
      return `<a class="ng-link"${href}>${icon} ${escHtml(l.label || l.target)}</a>`
    }).join('')}</div>`
  }

  const hasBody = !!bodyHtml
  const bodyDisplay = node.contentExpanded ? '' : ' style="display:none"'
  const childrenAttr = node.children.length ? ` data-children="${node.children.join(',')}"` : ''
  const hasTableClass = hasHtmlTable(content) ? ' ng-has-table' : ''

  // Compute required min-width from [[IMG:...:WxH]] tokens (mirrors NodeCard.tsx autoMinWidth logic)
  const IMG_SIZE_RE = /\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g
  let maxImgW = 0
  let _m: RegExpExecArray | null
  while ((_m = IMG_SIZE_RE.exec(content)) !== null) maxImgW = Math.max(maxImgW, Number(_m[1]))
  const autoMinWidth = maxImgW > 0
    ? (hasHtmlTable(content) ? maxImgW + 280 : maxImgW + 32)
    : 0

  // min-height는 펼침 상태에서만 적용 — 접힌 노드가 수동 리사이즈 높이로 남는 버그 방지
  // (fold/unfold 시 JS가 data-min-h 값으로 토글)
  // 너비는 에디터(NodeCard.tsx)의 Math.max(nodeWidth, 432, autoMinWidth)와 동일하게
  // 항상 최댓값을 취해야 함 — 수동으로 좁게 리사이즈한 노드라도 표/이미지가 필요로
  // 하는 최소 너비보다 좁아지면 안 됨(이전엔 nodeWidth가 있으면 autoMinWidth를 아예
  // 무시하는 버그가 있었음).
  const finalMinWidth = Math.max(node.nodeWidth ?? 0, 432, autoMinWidth)
  const extraStyle = [
    finalMinWidth > 432 ? `min-width:${finalMinWidth}px` : '',
    node.nodeHeight && node.contentExpanded ? `min-height:${node.nodeHeight}px` : '',
  ].filter(Boolean).join(';')
  const minHAttr = node.nodeHeight ? ` data-min-h="${node.nodeHeight}"` : ''

  return `<div class="ng-node${hasTableClass}" id="node-${escHtml(node.id)}"${childrenAttr}${minHAttr} style="--color:${color};border-radius:${borderRadius};left:${nx}px;top:${ny}px${extraStyle ? ';' + extraStyle : ''}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${color} 20%,transparent);color:${color}">${label}</span>
    ${hasBody ? `<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${escHtml(node.title)}</span>` : `<span class="ng-title">${escHtml(node.title)}</span>`}
  </div>
  ${hasBody ? `<div class="ng-body"${bodyDisplay}${node.fontSize ? ` style="font-size:${node.fontSize}px"` : ''}>${bodyHtml}</div>` : ''}
</div>`
}

export function generateHtml(
  graph: NodeGraph,
  imageData: Record<string, string> = {},
  codeLinkOpts: { githubBase: string | null; repoPrefix: string } = { githubBase: null, repoPrefix: '' },
): string {
  let minX = Infinity, minY = Infinity
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
  }
  if (!isFinite(minX)) { minX = 0; minY = 0 }
  const offsetX = -minX + 100
  const offsetY = -minY + 100

  const nodesHtml = graph.nodes
    .map(n => renderNodeCard(n, graph.nodeTemplates[n.template], offsetX, offsetY, imageData, codeLinkOpts))
    .join('\n')

  const nodesData = JSON.stringify(graph.nodes.map(n => ({
    id: n.id,
    lx: Math.round(n.position.x + offsetX),
    ly: Math.round(n.position.y + offsetY),
    children: n.children ?? [],
    template: n.template,
    contentExpanded: n.contentExpanded,
    isMain: n.template === 'main_topic',
    nodeHeight: n.nodeHeight ?? null,
    naturalY: Math.round((n.nodeNaturalY ?? n.position.y) + offsetY),
    // 검색은 title/content/original(제목+텍스트)/toggle(제목+내용) 각각을 개별 필드로
    // 갖고 있어야 함 — 매치가 어느 필드에 있었는지 알아야 그 섹션(원본/토글)을 자동으로
    // 펼쳐서 실제로 보여줄 수 있음 (에디터의 handleSelectSearchNode와 동일한 규칙).
    title: n.title,
    content: n.content ?? '',
    originalTitle: n.original?.title ?? '',
    originalText: n.original?.text ?? '',
    toggles: (n.toggleItems ?? []).map(t => ({ id: t.id, title: t.title, content: t.content })),
  })))
  const edgeData = JSON.stringify(graph.edges.map(e => ({
    source: e.source, target: e.target, type: e.type, label: e.label || '',
  })))
  const nodeTemplatesData = JSON.stringify(
    Object.fromEntries(Object.entries(graph.nodeTemplates).map(([key, t]) => [key, t.label]))
  )

  // 검색어 인라인 하이라이트 스타일 — 템플릿 색의 반전색 + 밑줄 (에디터와 동일 규칙)
  const hitStyles = Object.entries(graph.nodeTemplates).map(([key, t]) => {
    const inv = invertRgbHex(t.color)
    const c = inv ? `rgb(${inv.r},${inv.g},${inv.b})` : '#ff3b30'
    const bg = inv ? `rgba(${inv.r},${inv.g},${inv.b},0.18)` : 'rgba(255,59,48,0.18)'
    return `::highlight(ng-hit-${hitKeySafe(key)}){color:${c};background-color:${bg};text-decoration:underline}`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(graph.title)}</title>
<!-- KaTeX for LaTeX rendering -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js"
  onload="initKatex()"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f4f4f5;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;height:100vh}
#toolbar{position:fixed;top:0;left:0;right:0;background:#ffffff;border-bottom:1px solid #d4d4d4;z-index:200;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#tb-row1{display:flex;align-items:baseline;gap:10px;padding:6px 12px 4px;border-bottom:1px solid #ececec;min-height:0}
#tb-row2{display:flex;align-items:center;gap:6px;padding:3px 12px 4px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x}
#tb-row2::-webkit-scrollbar{display:none}
#tb-row2>*{flex-shrink:0}
#tb-title{font-weight:700;color:#1a1a1a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
#tb-sel{opacity:.7;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0066cc}
button{background:#fff;color:#374151;border:1px solid #d1d5db;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:500;cursor:pointer;flex-shrink:0;box-shadow:0 1px 2px rgba(15,23,42,.06);transition:background .1s,color .1s,border-color .1s}
button:hover{background:#2563eb;color:#fff;border-color:#1d4ed8}
button:active{background:#1d4ed8;border-color:#1e40af}
select{background:#fff;color:#374151;border:1px solid #d1d5db;border-radius:6px;padding:4px 6px;font-size:11px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.06)}
select:hover{border-color:#93c5fd}
.tb-sep{width:1px;height:14px;background:#d4d4d4;flex-shrink:0}
#viewport{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;cursor:grab;}
#viewport.pan-drag{cursor:grabbing}
#canvas{position:absolute;transform-origin:0 0}
#wire-svg{position:absolute;top:0;left:0;width:10000px;height:10000px;pointer-events:none;overflow:visible}
#grid-svg{position:absolute;top:0;left:0;width:10000px;height:10000px;pointer-events:none;overflow:visible}
.ng-node{position:absolute;min-width:432px;background:color-mix(in srgb,var(--color) 15%,#ffffff);border:1px solid color-mix(in srgb,var(--color) 40%,#e0e0e0);font-size:13px;transition:box-shadow .1s,top .35s ease,left .35s ease;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ng-node.ng-selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--color) 80%,transparent),0 2px 8px rgba(0,0,0,.12)}
.ng-node.ng-dragging{opacity:.88;transition:box-shadow .1s;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:100}
.ng-header{display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:default;user-select:none}
.ng-header:hover{background:rgba(0,0,0,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:1px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap;cursor:move;user-select:none}
.ng-title{flex:1;font-size:12px;font-weight:500;color:#1a1a1a;white-space:nowrap;cursor:pointer;user-select:none}
.ng-body{padding:8px 10px;font-size:14px}
.ng-content{line-height:1.6;color:#333;white-space:pre-wrap;word-break:break-word;margin-bottom:6px}
.ng-more-btn{display:block;width:100%;margin-top:4px;padding:3px 0;background:transparent;border:none;color:inherit;opacity:.55;font-size:10px;cursor:pointer;text-align:center;user-select:none}
.ng-seg{white-space:pre-wrap;word-break:break-word;line-height:1.6;color:#333}
.ng-img-wrap{margin:4px 0}
.ng-table-wrap{overflow-x:auto;margin:6px 0}
.ng-table{border-collapse:collapse;background:#fff;font-size:inherit;white-space:normal}
.ng-table th{padding:5px 10px;border:1px solid #ddd;background:#f8f9fa;font-weight:600;text-align:left;vertical-align:top;white-space:pre}
.ng-table td{padding:5px 10px;border:1px solid #ddd;vertical-align:top;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word}
.ng-images{margin-top:6px;display:flex;flex-direction:column;gap:6px}
.ng-img{max-width:100%;border-radius:3px;border:1px solid rgba(0,0,0,.1);display:block;cursor:zoom-in}
.ng-img-sized{max-width:none}
.ng-img-missing{font-size:10px;opacity:.4;padding:3px 6px;background:rgba(0,0,0,.05);border-radius:3px}
details.ng-original{margin-top:6px}
details.ng-original summary{cursor:pointer;opacity:.6;list-style:none;padding:2px 0;user-select:none;color:#555}
details.ng-original summary::-webkit-details-marker{display:none}
.ng-loc{opacity:.55;font-size:10px;margin-left:4px}
.ng-orig-text{margin-top:4px;padding:5px 7px;background:rgba(0,0,0,.04);border-radius:3px;font-style:italic;line-height:1.5;color:#555;white-space:pre-wrap;word-break:break-word;font-size:11px}
details.ng-toggle{margin-top:3px}
details.ng-toggle summary{cursor:pointer;list-style:none;padding:2px 0;user-select:none;color:#444}
details.ng-toggle summary::-webkit-details-marker{display:none}
.ng-toggle-body{padding-left:12px;padding-top:3px;line-height:1.6;color:#333;white-space:pre-wrap;word-break:break-word}
.ng-links{margin-top:6px;display:flex;flex-direction:column;gap:2px}
.ng-link{color:#0066cc;text-decoration:none;font-size:11px;opacity:.85}
.ng-link:hover{opacity:1;text-decoration:underline}
/* KaTeX */
.katex{color:inherit}.katex-html{white-space:nowrap}
/* Lightbox */
#lightbox{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.75);align-items:center;justify-content:center;cursor:zoom-out}
#lightbox.active{display:flex}
#lightbox img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;box-shadow:0 4px 32px rgba(0,0,0,.4);cursor:default}
#lightbox-close{position:absolute;top:16px;right:20px;color:#fff;font-size:22px;opacity:.8;cursor:pointer;user-select:none}
/* Search */
#search-wrap{position:absolute;top:10px;right:14px;z-index:500;display:none}
#search-wrap.open{display:block}
#search-row{display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #d1d5db;border-radius:6px;padding:4px 6px;box-shadow:0 4px 16px rgba(0,0,0,0.15)}
#search-row.dropdown-open{border-radius:6px 6px 0 0}
#search-input{border:none;outline:none;font-size:13px;width:200px;background:transparent;color:#111}
#search-count{font-size:11px;color:#6b7280;white-space:nowrap;min-width:60px;text-align:right}
#search-drop{position:absolute;top:100%;right:0;min-width:100%;max-height:280px;overflow-y:auto;background:#fff;border:1px solid #d1d5db;border-top:none;border-radius:0 0 6px 6px;box-shadow:0 8px 16px rgba(0,0,0,0.15);z-index:501;display:none}
#search-drop.open{display:block}
.ng-drop-item{padding:6px 12px;font-size:12px;color:#1a1a1a;cursor:pointer;border-bottom:1px solid #f3f4f6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px}
.ng-drop-item:last-child{border-bottom:none}
.ng-drop-item:hover{background:#f3f4f6}
.ng-node.ng-search-match{border:2px solid #fcd34d !important}
.ng-node.ng-search-active{border:2px solid #f59e0b !important;box-shadow:0 0 0 3px rgba(245,158,11,0.35),0 2px 8px rgba(0,0,0,.18) !important}
${hitStyles}
/* 선택 노드의 한 세대(부모+자식) 하이라이트 — Esc로만 해제 */
.ng-node.ng-gen{border:2px solid #f87171 !important;box-shadow:0 0 0 3px rgba(248,113,113,.3),0 1px 4px rgba(0,0,0,.08) !important}
</style>
</head>
<body>
<div id="toolbar">
  <div id="tb-row1">
    <span id="tb-title">${escHtml(graph.title)}</span>
  </div>
  <div id="tb-row2">
    <select id="tb-filter" title="Filter Collapse/Expand to one node type"></select>
    <button onclick="doCollapse()" title="Collapse selected node + children (all if none selected; all if a type filter is set) — collapsing everything also fits the view">📁 Collapse</button>
    <button onclick="doExpand()" title="Expand selected node + children (all if none selected; only the filtered type if a type filter is set)">📂 Expand</button>
    <button onclick="fitView()">Fit View</button>
    <button id="tb-grid-btn" onclick="toggleGrid()" style="display:inline-flex;align-items:center;gap:4px" title="Toggle debug grid — vertical lines mark hop-level boundaries, horizontal lines mark main-topic cluster boundaries">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
      </svg>
      Grid
    </button>
    <button id="tb-more-btn" onclick="toggleMoreCaps()" title="Toggle the More/Less content cap — when off, every node's content is always fully expanded">More</button>
    <div class="tb-sep"></div>
    <span id="tb-sel" style="opacity:.35">Click a node to select</span>
  </div>
</div>
<div id="viewport">
  <div id="search-wrap">
    <div id="search-row">
      <input id="search-input" placeholder="Search nodes… (Ctrl+F)" oninput="doSearch(this.value)" onkeydown="onSearchKey(event)" onclick="onSearchInputClick()">
      <span id="search-count"></span>
      <div style="width:1px;height:16px;background:#e5e7eb;margin:0 2px;flex-shrink:0"></div>
      <button onclick="closeSearch()" title="Close (Escape)" style="background:none;border:none;cursor:pointer;padding:2px 6px;font-size:13px;color:#6b7280;border-radius:3px;line-height:1">✕</button>
    </div>
    <div id="search-drop"></div>
  </div>
  <div id="canvas">
    <svg id="grid-svg" style="display:none"></svg>
    <svg id="wire-svg">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#666"/>
        </marker>
        <marker id="arrow-hl" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#ef4444"/>
        </marker>
      </defs>
    </svg>
    ${nodesHtml}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">✕</span>
</div>
<script>
var NODES_DATA = ${nodesData};
var EDGES = ${edgeData};
var NODE_TEMPLATES = ${nodeTemplatesData};
var HEADER_H = 36;

// Collapse/Expand 라벨 필터 드롭다운 채우기 (에디터의 라벨 필터와 동일한 옵션/동작)
(function populateFilterSelect() {
  var sel = document.getElementById('tb-filter');
  var noneOpt = document.createElement('option');
  noneOpt.value = ''; noneOpt.textContent = 'None';
  sel.appendChild(noneOpt);
  Object.keys(NODE_TEMPLATES).forEach(function(key) {
    var opt = document.createElement('option');
    opt.value = key; opt.textContent = NODE_TEMPLATES[key];
    sel.appendChild(opt);
  });
})();

var vp = document.getElementById('viewport');
var canvas = document.getElementById('canvas');

// Set viewport top to match actual toolbar height
function syncViewportTop() {
  var tb = document.getElementById('toolbar');
  vp.style.top = tb.offsetHeight + 'px';
}
syncViewportTop();
var tx = 0, ty = 0, scale = 1;

function applyTransform() {
  canvas.style.transform = 'translate('+tx+'px,'+ty+'px) scale('+scale+')';
}

// 창 크기 변경: 화면 중앙에 보이던 지점을 중앙에 유지하면서,
// 창 너비 비율만큼 스케일도 함께 조정 (줄이면 축소, 다시 키우면 확대 — 대칭 동작)
var lastVW = 0, lastVH = 0;
(function() {
  var r = vp.getBoundingClientRect();
  lastVW = r.width; lastVH = r.height;
})();
window.addEventListener('resize', function() {
  syncViewportTop();
  var r = vp.getBoundingClientRect();
  if (lastVW > 0 && r.width > 0) {
    var cxw = (lastVW / 2 - tx) / scale;   // 기존 중앙의 월드 좌표
    var cyw = (lastVH / 2 - ty) / scale;
    scale = Math.max(0.1, Math.min(4, scale * (r.width / lastVW)));
    tx = r.width / 2 - cxw * scale;
    ty = r.height / 2 - cyw * scale;
    applyTransform();
    updateZoomLineWeights();
  }
  lastVW = r.width; lastVH = r.height;
});

// Zoom
vp.addEventListener('wheel', function(e) {
  e.preventDefault();
  var rect = vp.getBoundingClientRect();
  var mx = e.clientX - rect.left, my = e.clientY - rect.top;
  var factor = e.deltaY < 0 ? 1.1 : 0.91;
  var ns = Math.max(0.1, Math.min(4, scale * factor));
  tx = mx - (mx - tx) * (ns / scale);
  ty = my - (my - ty) * (ns / scale);
  scale = ns;
  applyTransform();
  updateZoomLineWeights();
}, { passive: false });

// Canvas pan
var panState = null;
vp.addEventListener('mousedown', function(e) {
  if (e.target.closest('.ng-node')) return;
  selectNode(null);
  panState = { sx: e.clientX - tx, sy: e.clientY - ty };
  vp.classList.add('pan-drag');
});
window.addEventListener('mousemove', function(e) {
  if (!panState) return;
  tx = e.clientX - panState.sx; ty = e.clientY - panState.sy;
  applyTransform();
});
window.addEventListener('mouseup', function() {
  panState = null; vp.classList.remove('pan-drag');
});

// Node selection
var selectedNodeId = null;
// 세대 하이라이트의 루트(pin): 배경 클릭으로 선택이 풀려도 유지, Esc로만 해제
var genRootId = null;
function selectNode(nodeId) {
  if (selectedNodeId) {
    var prev = document.getElementById('node-' + selectedNodeId);
    if (prev) prev.classList.remove('ng-selected');
  }
  selectedNodeId = nodeId;
  var label = document.getElementById('tb-sel');
  if (nodeId) {
    var el = document.getElementById('node-' + nodeId);
    if (el) el.classList.add('ng-selected');
    var titleEl = el ? el.querySelector('.ng-title') : null;
    if (label) { label.textContent = 'Selected: ' + (titleEl ? titleEl.textContent : nodeId); label.style.opacity = '0.9'; }
  } else {
    if (label) { label.textContent = 'Click a node to select'; label.style.opacity = '0.35'; }
  }
  // 하이라이트 루트는 tag 클릭(onNodeTagMousedown)에서만 갱신 — 일반 클릭/fold는
  // 하이라이트를 바꾸지 않음. 선택 스타일 우선 규칙만 재적용 (wire 색은 불변)
  updateGenHighlight();
}

// 선택 노드의 한 세대(부모+자식) 이웃 ID 수집 — edges 양방향 + children 배열
function getGenNeighbors(nodeId) {
  var ids = [];
  EDGES.forEach(function(e) {
    if (e.source === nodeId && ids.indexOf(e.target) === -1) ids.push(e.target);
    if (e.target === nodeId && ids.indexOf(e.source) === -1) ids.push(e.source);
  });
  NODES_DATA.forEach(function(n) {
    if (n.id === nodeId) {
      (n.children || []).forEach(function(c) { if (ids.indexOf(c) === -1) ids.push(c); });
    } else if ((n.children || []).indexOf(nodeId) !== -1 && ids.indexOf(n.id) === -1) {
      ids.push(n.id);
    }
  });
  var self = ids.indexOf(nodeId);
  if (self !== -1) ids.splice(self, 1);
  return ids;
}

// 고정된 루트와 그 이웃 노드들에 빨간 테두리 적용 (wire 색은 drawEdges에서 처리)
// 루트 자신도 빨간색 — 선택 상태여도 하이라이트가 우선 (에디터와 동일)
function updateGenHighlight() {
  document.querySelectorAll('.ng-gen').forEach(function(el) { el.classList.remove('ng-gen'); });
  if (!genRootId) return;
  var ids = getGenNeighbors(genRootId);
  ids.push(genRootId);
  ids.forEach(function(id) {
    var el = document.getElementById('node-' + id);
    if (el) el.classList.add('ng-gen');
  });
}

// Header click = select node
var lastWasDrag = false;
function onHeaderClick(hdr) {
  if (lastWasDrag) { lastWasDrag = false; return; }
  var nodeEl = hdr.parentNode;
  var nodeId = nodeEl.id.replace('node-', '');
  selectNode(selectedNodeId === nodeId ? null : nodeId);
}

// Title click = fold/unfold this node
function onTitleClick(e, titleEl) {
  e.stopPropagation();
  var nodeEl = titleEl.closest('.ng-node');
  var body = nodeEl.querySelector('.ng-body');
  if (!body) return;
  var expanding = body.style.display === 'none';
  body.style.display = expanding ? '' : 'none';
  syncMinHeight(nodeEl, expanding);
  var nodeId = nodeEl.id.replace('node-', '');
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) { NODES_DATA[i].contentExpanded = expanding; break; }
  }
  // 접혀 있는 동안엔 .ng-content가 display:none이라 측정이 전부 0으로 나와 More
  // 버튼이 필요없다고 잘못 판단되므로, 다시 보이게 될 때 이 노드만 재측정
  if (expanding) { widenForFormulas(nodeEl); applyContentCaps(nodeEl); }
  applyKatexWidthForFold(nodeEl, expanding);
  setTimeout(recomputePositions, 0);
  // 검색 드롭다운이 열려있으면 search input 포커스 복원 (화살표 키 유지)
  if (document.getElementById('search-wrap').classList.contains('open') && searchSelectedId === null) {
    setTimeout(function() { document.getElementById('search-input').focus(); }, 0);
  }
}

// Get node datum by id
function getNodeDatum(nodeId) {
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) return NODES_DATA[i];
  }
  return null;
}

// Collect all descendants recursively (for collapse — no depth limit)
function getAllDescendants(nodeId, visited) {
  visited = visited || [];
  if (visited.indexOf(nodeId) !== -1) return [];
  visited.push(nodeId);
  var result = [];
  var datum = getNodeDatum(nodeId);
  if (!datum) return result;
  // Include both children array and edge targets
  var childIds = (datum.children || []).slice();
  EDGES.forEach(function(e) { if (e.source === nodeId && childIds.indexOf(e.target) === -1) childIds.push(e.target); });
  childIds.forEach(function(childId) {
    result.push(childId);
    getAllDescendants(childId, visited).forEach(function(d) { result.push(d); });
  });
  return result;
}

// Collect descendants for expand — skip main_topic children (and their subtrees)
// Includes both outgoing and incoming (non-main) edges to support multi-parent sub-nodes
function getExpandDescendants(nodeId, isRoot, visited) {
  visited = visited || [];
  if (visited.indexOf(nodeId) !== -1) return [];
  visited.push(nodeId);
  var datum = getNodeDatum(nodeId);
  if (!datum) return [];
  // Do not recurse into other main (sharp) nodes
  if (!isRoot && datum.isMain) return [];
  var result = [nodeId];
  var childIds = (datum.children || []).slice();
  EDGES.forEach(function(e) {
    // Outgoing edges from this node
    if (e.source === nodeId && childIds.indexOf(e.target) === -1) childIds.push(e.target);
    // Incoming from non-main: support sub-nodes with multiple parents
    if (e.target === nodeId && childIds.indexOf(e.source) === -1) {
      var srcDatum = getNodeDatum(e.source);
      if (srcDatum && !srcDatum.isMain) childIds.push(e.source);
    }
  });
  childIds.forEach(function(childId) {
    getExpandDescendants(childId, false, visited).forEach(function(d) { result.push(d); });
  });
  return result;
}

// Apply expand/collapse to a list of node IDs
// 접힘/펼침 시 min-height 동기화 — 접힌 노드가 수동 리사이즈 높이로 남는 버그 방지
function syncMinHeight(el, expand) {
  var minH = el.getAttribute('data-min-h');
  el.style.minHeight = (expand && minH) ? minH + 'px' : '';
}

function applyFold(nodeIds, expand, after) {
  nodeIds.forEach(function(id) {
    var el = document.getElementById('node-' + id);
    if (!el) return;
    var body = el.querySelector('.ng-body');
    var chevron = el.querySelector('.ng-chevron');
    if (body) body.style.display = expand ? '' : 'none';
    if (chevron) chevron.textContent = expand ? '▲' : '▼';
    syncMinHeight(el, expand);
    if (expand) widenForFormulas(el);
    applyKatexWidthForFold(el, expand);
    for (var i = 0; i < NODES_DATA.length; i++) {
      if (NODES_DATA[i].id === id) { NODES_DATA[i].contentExpanded = expand; break; }
    }
  });
  setTimeout(function() { recomputePositions(); if (after) after(); }, 0);
}

// Recompute positions when <details> toggles change node height.
// 'toggle' does not bubble so we use capture phase.
canvas.addEventListener('toggle', function() {
  setTimeout(recomputePositions, 0);
}, true);

// Toolbar: context-aware expand/collapse
// 라벨 필터: None이면 기존 동작 그대로. 특정 타입이면 Collapse는 항상 전체 접음,
// Expand는 그 타입 노드만 펼치고 나머지는 강제로 접음 (부모/자식 관계 무시, 에디터와 동일 규칙)
function doExpand() {
  var filter = document.getElementById('tb-filter').value;
  if (filter) {
    var matching = [], rest = [];
    NODES_DATA.forEach(function(n) { (n.template === filter ? matching : rest).push(n.id); });
    applyFold(rest, false);
    applyFold(matching, true);
    return;
  }
  if (selectedNodeId) {
    applyFold(getExpandDescendants(selectedNodeId, true), true);
  } else {
    // Expand all — include main_topic roots but skip nested main_topic subtrees
    var toExpand = [];
    NODES_DATA.forEach(function(n) {
      if (toExpand.indexOf(n.id) !== -1) return;
      getExpandDescendants(n.id, true).forEach(function(d) { if (toExpand.indexOf(d) === -1) toExpand.push(d); });
    });
    applyFold(toExpand, true);
  }
}
// 전체 collapse(선택 없이, 또는 필터가 걸려 있어도 결국 전체)일 때만 자동으로
// Fit View — 선택 서브트리만 접을 땐 사용자가 보던 영역을 유지해야 하므로 대상에서
// 제외 (에디터와 동일 규칙).
function doCollapse() {
  var filter = document.getElementById('tb-filter').value;
  if (filter) {
    applyFold(NODES_DATA.map(function(n){return n.id;}), false, fitView);
    return;
  }
  if (selectedNodeId) {
    applyFold([selectedNodeId].concat(getAllDescendants(selectedNodeId)), false);
  } else {
    applyFold(NODES_DATA.map(function(n){return n.id;}), false, fitView);
  }
}

// 드롭된 노드의 raw 위치(lx/ly)를 형제들 사이에서 실제로 어디 떨어졌는지에 맞춰 다시
// 계산한다. onUp이 그냥 "드롭된 렌더 좌표를 그대로 저장"하면, 그 렌더 좌표는 raw 좌표와
// 전혀 다른 좌표계(레이아웃 알고리즘이 raw를 대폭 재배치하는 게 이 알고리즘의 존재
// 이유)라 형제들의 raw ly 범위를 완전히 벗어나는 경우가 흔하고, 그 결과 다음 재배치 때
// 항상 맨 위/맨 아래로 튕기는 것처럼 보인다(에디터에서도 같은 버그가 있었음). 드롭 시점의
// DOM 위치(형제들은 이 드래그 동안 한 번도 안 움직였으므로 여전히 정확한 배치 상태를
// 반영함)를 기준으로 어느 두 형제 사이에 놓였는지 찾아 그 사이 값으로 raw ly를 맞춘다.
function reconcileDroppedPosition(nodeId, nodeDatum) {
  var nodeMap = {};
  NODES_DATA.forEach(function(n) { nodeMap[n.id] = n; });
  var tree = buildHopTreeJs();
  var parentId = tree.parentOf[nodeId];
  if (!parentId) return;

  function findRootId(fromId) {
    var cur = fromId, visited = {};
    while (!visited[cur]) {
      visited[cur] = true;
      var n = nodeMap[cur];
      if (!n) return cur;
      if (n.isMain) return cur;
      var p = tree.parentOf[cur];
      if (!p) return cur;
      cur = p;
    }
    return cur;
  }
  var root = nodeMap[findRootId(nodeId)];
  function sideOfNode(n) { return (root && n.lx >= root.lx) ? 1 : -1; }
  var draggedSide = sideOfNode(nodeDatum);

  var sameSideSiblings = [];
  NODES_DATA.forEach(function(n) {
    if (n.id === nodeId) return;
    if (tree.parentOf[n.id] === parentId && sideOfNode(n) === draggedSide) sameSideSiblings.push(n.id);
  });
  if (sameSideSiblings.length === 0) return;

  var draggedRenderY = nodeDatum.ly;
  var ordered = sameSideSiblings.map(function(sid) {
    var el = document.getElementById('node-' + sid);
    var ry = el ? (parseFloat(el.style.top) || 0) : nodeMap[sid].ly;
    return { id: sid, renderY: ry };
  }).sort(function(a, b) { return a.renderY - b.renderY; });

  var belowIdx = -1;
  for (var i = 0; i < ordered.length; i++) {
    if (ordered[i].renderY > draggedRenderY) { belowIdx = i; break; }
  }
  var newY;
  if (belowIdx === -1) newY = nodeMap[ordered[ordered.length - 1].id].ly + 1;
  else if (belowIdx === 0) newY = nodeMap[ordered[0].id].ly - 1;
  else newY = (nodeMap[ordered[belowIdx - 1].id].ly + nodeMap[ordered[belowIdx].id].ly) / 2;

  // lx도 드래그 중 렌더 좌표가 raw에 섞여 들어가 오염됐을 수 있으므로, 같은 side 형제의
  // raw lx를 빌려 바로잡는다(side 전환처럼 형제가 없는 경우는 건드리지 않음).
  nodeDatum.lx = nodeMap[sameSideSiblings[0]].lx;
  nodeDatum.ly = newY;
  nodeDatum.naturalY = newY;
}

// Tag drag handle
function onNodeTagMousedown(e, nodeEl) {
  e.stopPropagation();
  lastWasDrag = false;
  var x0 = e.clientX, y0 = e.clientY;
  var left0 = parseFloat(nodeEl.style.left) || 0;
  var top0  = parseFloat(nodeEl.style.top)  || 0;
  var moved = false, finalDX = 0, finalDY = 0;
  var nodeId = nodeEl.id.replace('node-', '');
  var nodeDatum = null;
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) { nodeDatum = NODES_DATA[i]; break; }
  }
  // tag 클릭 = 세대 하이라이트 pin (배치 불변 → A* 캐시 재사용, 색만 즉시 갱신)
  genRootId = nodeId;
  updateGenHighlight();
  drawEdges();
  function onMove(ev) {
    var rawDx = ev.clientX - x0, rawDy = ev.clientY - y0;
    if (!moved && (Math.abs(rawDx) > 5 || Math.abs(rawDy) > 5)) { moved = true; nodeEl.classList.add('ng-dragging'); }
    if (moved) {
      var dx = rawDx / scale, dy = rawDy / scale;
      nodeEl.style.left=(left0+dx)+'px'; nodeEl.style.top=(top0+dy)+'px'; finalDX=dx; finalDY=dy; drawEdges(true);
    }
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    nodeEl.classList.remove('ng-dragging');
    // 드롭된 렌더 좌표를 일단 그대로 저장한 뒤, 형제들 사이 실제 위치에 맞춰 raw로
    // 재해석한다(reconcileDroppedPosition — 위 참고, 렌더 좌표를 raw에 그대로 쓰면 안
    // 되는 이유).
    if (moved) {
      lastWasDrag = true;
      if (nodeDatum) {
        nodeDatum.lx = left0 + finalDX; nodeDatum.ly = top0 + finalDY; nodeDatum.naturalY = nodeDatum.ly;
        reconcileDroppedPosition(nodeId, nodeDatum);
      }
      setTimeout(recomputePositions, 0);
    }
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// Canvas.tsx의 computeRenderPositions와 완전히 동일한 hop-tree bottom-up/top-down
// 알고리즘의 vanilla JS 이식 — 예전엔 X 겹침 기준 union-find 컬럼 + 그리디 Y-패킹이라는
// 완전히 다른(더 오래된) 알고리즘을 썼는데, 그 방식은 hop depth 개념이 없어서 브랜치마다
// hop-1/hop-2가 서로 다른 X에서 시작하는 문제가 있었음(사용자가 Grid 오버레이로 직접
// 확인해서 발견 — "hop1과 hop2 가로 시작 위치가 동일하지 않아서"). 에디터와 정확히 같은
// 결과가 나오도록 알고리즘 자체를 교체.
function recomputePositions() {
  var nodeMap = {};
  NODES_DATA.forEach(function(n) { nodeMap[n.id] = n; });

  function getH(n) {
    var el = document.getElementById('node-' + n.id);
    if (el) return el.offsetHeight;
    return n.contentExpanded ? (n.nodeHeight || HEADER_H) : HEADER_H;
  }
  function getW(n) {
    var el = document.getElementById('node-' + n.id);
    return el ? el.offsetWidth : (n.nodeWidth || 432);
  }

  var tree = buildHopTreeJs();

  // main topic(백본) 기준 좌/우 — 세로 배치(아래)와 가로 정렬(Pass 4) 양쪽에서 왼쪽/오른쪽
  // 자식을 독립적으로 다루기 위해 먼저 계산해둔다.
  var sideOf = {};
  NODES_DATA.forEach(function(n) {
    if (tree.depthOf[n.id] === 0) { sideOf[n.id] = 0; return; }
    var root = nodeMap[tree.rootOf[n.id]];
    sideOf[n.id] = n.lx >= root.lx ? 1 : -1;
  });

  // 각 부모의 자식들을 저장된 상대 Y(디자인 의도상 순서) 기준으로 정렬
  var childrenOf = {};
  NODES_DATA.forEach(function(n) {
    var p = tree.parentOf[n.id];
    if (!p) return;
    (childrenOf[p] = childrenOf[p] || []).push(n.id);
  });
  Object.keys(childrenOf).forEach(function(pid) {
    var parent = nodeMap[pid];
    childrenOf[pid].sort(function(a, b) {
      return (nodeMap[a].ly - parent.ly) - (nodeMap[b].ly - parent.ly);
    });
  });

  // 형제 그룹을 부모의 원래 Y 기준 위/아래로, 그리고 좌/우(side)로 분리한다. 왼쪽/오른쪽
  // 자식은 서로 다른 X에 그려져 세로 공간을 절대 공유하지 않으므로 독립적으로 계산해야
  // 한쪽이 커질 때 반대쪽 분기점까지 같이 밀리는 걸 막는다. above 배열은 reverse해서
  // "부모와 가장 가까운 것부터" 순서로 맞춘다 — kids는 상대 Y 오름차순 정렬이라 below
  // 그룹(부모에서 멀어지는 방향으로 순서대로 진행)엔 그대로 맞지만, above 그룹은 같은
  // 진행 방향(위로 멀어짐)인데 오름차순이면 가장 먼 자식이 배열 맨 앞이라 오히려 부모와
  // 가장 가깝게 배치되고 그다음이 더 멀리 밀리는 식으로 시각적 순서가 뒤집힌다.
  function splitByOriginalSide(parentId, side) {
    var parent = nodeMap[parentId];
    var kids = (childrenOf[parentId] || []).filter(function(k) { return sideOf[k] === side; });
    var above = kids.filter(function(k) { return nodeMap[k].ly < parent.ly; }).reverse();
    return {
      below: kids.filter(function(k) { return nodeMap[k].ly >= parent.ly; }),
      above: above,
    };
  }

  // main topic끼리(백본)만 20px 기준, 그 외(hop 자식)는 항상 30px 기준
  function gapFor(a, b) {
    var base = (a.isMain && b.isMain) ? 20 : 30;
    return (getH(a) > HEADER_H || getH(b) > HEADER_H) ? 48 : base;
  }

  // ── bottom-up: 각 서브트리가 자기 중심 기준 위/아래로 필요한 공간 ──
  var infoCache = {};
  function stackSize(group, parentNode) {
    if (!group.length) return 0;
    var total = 0;
    for (var i = 0; i < group.length; i++) {
      var kid = nodeMap[group[i]];
      var prev = i === 0 ? parentNode : nodeMap[group[i - 1]];
      total += gapFor(prev, kid);
      var kInfo = layoutInfo(group[i]);
      total += kInfo.above + kInfo.below;
    }
    return total;
  }

  // above+below 블록을 부모 중심에 맞추기 위한 분기점 이동량(shift). 이상적으로는
  // (belowSize-aboveSize)/2만큼 옮기면 블록 전체가 정확히 부모 중심에 오지만, 양쪽에 다
  // 형제가 있는 상태에서 두 그룹 크기 차이가 크면(예: 3:1 이상) 그 이동량이 큰 쪽 그룹의
  // "부모와 가장 가까운 자식"을 부모 중심 반대편으로 밀어버린다(below의 첫 자식이 부모
  // 보다 위에 렌더되는 등, 자식이 부모를 시각적으로 뛰어넘는 버그). 두 그룹이 다 있을
  // 때만, "더 큰 쪽의 첫 자식이 부모 중심을 넘지 않는 한도"로 이동량을 clamp한다.
  function splitShift(id, side) {
    var node = nodeMap[id];
    var split = splitByOriginalSide(id, side);
    var above = split.above, below = split.below;
    var belowSize = stackSize(below, node);
    var aboveSize = stackSize(above, node);
    var shift = (belowSize - aboveSize) / 2;
    if (above.length > 0 && below.length > 0) {
      if (shift > 0) {
        var firstBelow = nodeMap[below[0]];
        var firstBelowInfo = layoutInfo(below[0]);
        shift = Math.min(shift, gapFor(node, firstBelow) + firstBelowInfo.above);
      } else if (shift < 0) {
        var firstAbove = nodeMap[above[0]];
        var firstAboveInfo = layoutInfo(above[0]);
        shift = Math.max(shift, -(gapFor(node, firstAbove) + firstAboveInfo.below));
      }
    }
    return { above: above, below: below, belowSize: belowSize, aboveSize: aboveSize, shift: shift };
  }

  function layoutInfo(id) {
    if (infoCache[id]) return infoCache[id];
    var node = nodeMap[id];
    var ownHalf = getH(node) / 2;
    // side별로 독립적으로 above+below 블록을 재센터링하므로, 이 노드가 자기 부모에게
    // 보고하는 "필요 공간"도 side별로 따로 구해서(왼쪽·오른쪽은 세로 공간을 안 겹치므로
    // 더하지 않고 더 많이 필요한 쪽 기준) splitShift가 clamp한 실제 shift를 반영한다 —
    // 안 그러면 assign()이 실제로 만드는 위치와 어긋나 다른 클러스터와 겹칠 수 있다.
    var aboveReach = 0, belowReach = 0;
    [1, -1].forEach(function(side) {
      var s = splitShift(id, side);
      aboveReach = Math.max(aboveReach, s.aboveSize + s.shift);
      belowReach = Math.max(belowReach, s.belowSize - s.shift);
    });
    var info = { above: Math.max(ownHalf, aboveReach), below: Math.max(ownHalf, belowReach) };
    infoCache[id] = info;
    return info;
  }

  // ── top-down: center Y 확정 ──
  var centerY = {};
  function assign(id, cy) {
    var node = nodeMap[id];
    centerY[id] = cy;
    // 왼쪽/오른쪽을 완전히 독립적으로 배치한다 — stackSize가 같은 side의 형제끼리만
    // 더해지므로 한쪽 크기가 반대쪽 분기점에 영향을 주지 않는다.
    [1, -1].forEach(function(side) {
      var s = splitShift(id, side);
      var below = s.below, above = s.above;
      var split = cy - s.shift;

      var cursor = split;
      for (var i = 0; i < below.length; i++) {
        var kid = nodeMap[below[i]];
        var kInfo = layoutInfo(below[i]);
        var prev = i === 0 ? node : nodeMap[below[i - 1]];
        cursor += gapFor(prev, kid) + kInfo.above;
        assign(below[i], cursor);
        cursor += kInfo.below;
      }
      cursor = split;
      for (var j = 0; j < above.length; j++) {
        var kid2 = nodeMap[above[j]];
        var kInfo2 = layoutInfo(above[j]);
        var prev2 = j === 0 ? node : nodeMap[above[j - 1]];
        cursor -= gapFor(prev2, kid2) + kInfo2.below;
        assign(above[j], cursor);
        cursor -= kInfo2.above;
      }
    });
  }

  // ── 루트 시퀀싱: X 범위가 겹치는 루트끼리만 그룹으로 묶어 원래 순서(Y)대로 배치 ──
  var roots = NODES_DATA.filter(function(n) { return tree.isRoot[n.id]; });
  var rootPar = {};
  roots.forEach(function(r) { rootPar[r.id] = r.id; });
  function rootFind(id) {
    var p = rootPar[id];
    if (p === id) return id;
    var r = rootFind(p); rootPar[id] = r; return r;
  }
  for (var ri = 0; ri < roots.length; ri++) {
    for (var rj = ri + 1; rj < roots.length; rj++) {
      var a = roots[ri], b = roots[rj];
      if (a.lx < b.lx + getW(b) && b.lx < a.lx + getW(a)) {
        var fa = rootFind(a.id), fb = rootFind(b.id);
        if (fa !== fb) rootPar[fa] = fb;
      }
    }
  }
  var rootGroups = {};
  roots.forEach(function(r) {
    var g = rootFind(r.id);
    (rootGroups[g] = rootGroups[g] || []).push(r);
  });
  Object.keys(rootGroups).forEach(function(gk) {
    var group = rootGroups[gk];
    group.sort(function(a, b) { return (a.ly - b.ly) || (a.lx - b.lx); });
    var cursorBottom = -Infinity;
    for (var i = 0; i < group.length; i++) {
      var root = group[i];
      var info = layoutInfo(root.id);
      var naturalCenter = root.ly + getH(root) / 2;
      var gap = i === 0 ? 0 : gapFor(group[i - 1], root);
      var cy = i === 0 ? naturalCenter : Math.max(naturalCenter, cursorBottom + gap + info.above);
      assign(root.id, cy);
      cursorBottom = (centerY[root.id] !== undefined ? centerY[root.id] : cy) + info.below;
    }
  });

  var renderY = {};
  NODES_DATA.forEach(function(n) {
    var cy = centerY[n.id] !== undefined ? centerY[n.id] : (n.ly + getH(n) / 2);
    renderY[n.id] = cy - getH(n) / 2;
  });

  // ── hop tier(깊이)별 X 정렬 — 같은 depth의 모든 노드가 항상 같은 X에서 시작 ──
  var MIN_HOP_GAP = 750, COL_PAD = 60;
  // main topic(백본)도 hop1/hop2처럼 하나의 세로줄로 자동 정렬 — depth 0 노드는 raw
  // 좌표를 그대로 쓰지 않고, main topic들 중 가장 왼쪽(raw x 최소값)으로 전부 통일한다.
  // depth 0에는 main topic 외에 연결 끊긴 고아 노드도 섞이므로 n.isMain으로 필터링
  // (고아 노드는 원래 자유 좌표 유지).
  var mainTopicAnchorX = 0;
  var mainTopicXs = NODES_DATA.filter(function(n) { return n.isMain; }).map(function(n) { return n.lx; });
  if (mainTopicXs.length > 0) mainTopicAnchorX = Math.min.apply(null, mainTopicXs);

  var maxDepth = 0;
  NODES_DATA.forEach(function(n) { maxDepth = Math.max(maxDepth, tree.depthOf[n.id] || 0); });
  // 전역에서 가장 넓은 main topic 폭 — 어느 main topic 하나가 표 등으로 넓어지면, 그
  // main topic 자신의 왼쪽·오른쪽 hop1 간격이 똑같이 유지되는 것은 물론(오른쪽 변만
  // 넓어지므로 오른쪽 계산에만 필요), 다른(안 넓어진) main topic들의 hop1도 전부 같은
  // 만큼 같이 밀려서 hop1 열이 문서 전체에서 계속 나란히 정렬돼야 한다. "이 브랜치 자신의
  // 폭"이 아니라 "전역에서 제일 넓은 main topic의 폭"을 모든 브랜치의 오른쪽 오프셋에
  // 똑같이 더한다 — 표가 없는 보통 상황(모든 main topic 폭이 같음)에서는 이 값이 곧 자기
  // 폭과 같아서 좌우 간격이 정확히 MIN_HOP_GAP으로 대칭이다. 왼쪽은 main topic이 아무리
  // 넓어져도 왼쪽 변 자체는 움직이지 않으므로 항상 고정 MIN_HOP_GAP.
  var globalWidestMainTopic = 0;
  NODES_DATA.forEach(function(n) {
    if (tree.depthOf[n.id] === 0) globalWidestMainTopic = Math.max(globalWidestMainTopic, getW(n));
  });
  var colOffset = {};
  [1, -1].forEach(function(side) {
    var offset = side === 1 ? globalWidestMainTopic + MIN_HOP_GAP : MIN_HOP_GAP;
    var prevMaxWidth = 0;
    for (var d = 1; d <= maxDepth; d++) {
      if (d > 1) offset += Math.max(MIN_HOP_GAP, prevMaxWidth + COL_PAD);
      colOffset[d + ':' + side] = offset;
      var widest = 0;
      NODES_DATA.forEach(function(n) {
        if (tree.depthOf[n.id] === d && sideOf[n.id] === side) widest = Math.max(widest, getW(n));
      });
      prevMaxWidth = widest;
    }
  });
  var renderX = {};
  NODES_DATA.forEach(function(n) {
    var depth = tree.depthOf[n.id] || 0;
    if (depth === 0) { renderX[n.id] = n.isMain ? mainTopicAnchorX : n.lx; return; }
    var side = sideOf[n.id] || 1;
    var root = nodeMap[tree.rootOf[n.id]];
    // root가 main topic이면(항상 그렇진 않음 — 연결 끊긴 고아 노드도 자기 자손의 root가
    // 될 수 있음) raw 좌표가 아니라 위에서 통일한 mainTopicAnchorX를 기준 삼아야, main
    // topic 자신의 렌더 위치와 그 hop 자식들의 렌더 위치가 서로 어긋나지 않는다.
    var rootX = root.isMain ? mainTopicAnchorX : root.lx;
    var offset = colOffset[depth + ':' + side];
    if (offset === undefined) offset = depth * MIN_HOP_GAP;
    // offset은 "root와 가장 가까운 쪽 모서리"까지의 거리다. side=1(오른쪽)은 그 모서리가
    // 곧 CSS left(카드의 왼쪽 변)라 그대로 쓰면 되지만, side=-1(왼쪽)은 root와 가장 가까운
    // 모서리가 카드의 오른쪽 변이므로, CSS left를 구하려면 거기서 카드 너비만큼 더 빼야
    // 한다(왼쪽 형제들의 "왼쪽 변"만 정렬되고 main topic과 가까운 "오른쪽 변"은 카드
    // 너비에 따라 들쭉날쭉해지는 걸 막기 위함).
    var nearRootEdge = rootX + side * offset;
    renderX[n.id] = side === 1 ? nearRootEdge : nearRootEdge - getW(n);
  });

  NODES_DATA.forEach(function(n) {
    var el = document.getElementById('node-' + n.id);
    if (!el) return;
    el.style.left = (renderX[n.id] !== undefined ? renderX[n.id] : n.lx) + 'px';
    el.style.top = (renderY[n.id] !== undefined ? renderY[n.id] : n.ly) + 'px';
  });
  // 배치가 바뀌었으므로 A* 캐시 무효화 — 즉시 경량으로 그리고 잠잠해지면 정밀화
  routesDirty=true;
  drawEdges(true);
  scheduleEdgeRefine();
  drawGrid();
}

// ── main topic(백본) 기준 hop 트리 — Canvas.tsx의 buildHopTree와 동일한 규칙
// (main_topic은 항상 루트, 그 외는 children[]/edge로 찾은 부모에 귀속, 부모를 못
// 찾으면 독립 루트). 디버그 격자와 Ctrl+F 검색의 BFS 정렬 둘 다 이 트리를 공유한다
// (레이아웃 재구현마다 두 곳이 서로 다른 로직으로 어긋나는 것을 피하기 위함 — 에디터
// 쪽에서 layoutInfo/assign이 따로 놀아서 겹침 버그가 났던 것과 같은 종류의 실수를
// 여기서도 반복하지 않기 위함).
function buildHopTreeJs() {
  var nodeById = {};
  NODES_DATA.forEach(function(n) { nodeById[n.id] = n; });
  function parentIdOf(nodeId) {
    var byChildren = null;
    NODES_DATA.forEach(function(n) {
      if (!byChildren && (n.children || []).indexOf(nodeId) !== -1) byChildren = n.id;
    });
    if (byChildren) return byChildren;
    var byEdge = null;
    EDGES.forEach(function(e) { if (!byEdge && e.target === nodeId) byEdge = e.source; });
    if (byEdge) return byEdge;
    // 포트를 반대 방향(새 노드 → 기존 노드)으로 끌어 만든 엣지는 source/target이 뒤바뀐
    // 채로 저장돼 있을 수 있다(source=이 노드, target=main topic) — Canvas.tsx의
    // buildHopTree와 동일하게, 이런 기존 데이터도 여기서 인식해줘야 에디터와 같은
    // 트리 구조가 나온다(안 그러면 이 노드가 잘못 독립 루트로 취급됨).
    //
    // Canvas.tsx와 동일: "여러 source → 하나의 target" 수렴 구조에서 target의 실제
    // 부모로 안 뽑힌 나머지 source들이 orphan으로 빠지는 걸 막기 위해, target이
    // main_topic이 아니어도 가상 부모로 채택한다 — 단 target 쪽 "자신을 향하는 첫
    // edge"가 바로 이 edge라면(서로가 서로의 부모가 되는 2노드 순환) 제외.
    var outgoing = null;
    EDGES.forEach(function(e) {
      if (!outgoing && e.source === nodeId && nodeById[e.target]) outgoing = e;
    });
    if (outgoing) {
      var targetsFirstIncoming = null;
      EDGES.forEach(function(e) {
        if (!targetsFirstIncoming && e.target === outgoing.target) targetsFirstIncoming = e;
      });
      if (targetsFirstIncoming !== outgoing) return outgoing.target;
    }
    return null;
  }
  var isRoot = {}, parentOf = {};
  NODES_DATA.forEach(function(n) {
    if (n.isMain) { isRoot[n.id] = true; return; }
    var p = parentIdOf(n.id);
    if (p && nodeById[p]) parentOf[n.id] = p; else isRoot[n.id] = true;
  });
  var depthOf = {}, rootOf = {};
  function computeDepth(id) {
    if (depthOf[id] !== undefined) return;
    if (isRoot[id]) { depthOf[id] = 0; rootOf[id] = id; return; }
    computeDepth(parentOf[id]);
    depthOf[id] = depthOf[parentOf[id]] + 1;
    rootOf[id] = rootOf[parentOf[id]];
  }
  NODES_DATA.forEach(function(n) { computeDepth(n.id); });
  return { isRoot: isRoot, parentOf: parentOf, depthOf: depthOf, rootOf: rootOf };
}

// ── 디버그 격자 — Canvas.tsx의 computeGridLines와 동일한 규칙(가로선: main topic
// 클러스터 경계, 세로선: hop depth별 X 경계). recomputePositions()가 이제 에디터와
// 동일한 hop-tree 레이아웃 알고리즘을 쓰지만, 격자 자체는 그 계산 결과에 의존하지
// 않고 현재 DOM에 실제로 그려진 위치(el.style.left/top + offsetWidth/offsetHeight)를
// 그대로 읽어서 계산하므로 어떤 배치 알고리즘을 쓰든 항상 실제 렌더 결과와 일치한다.
var showGrid = false;
function computeGridLinesJs() {
  var tree = buildHopTreeJs();
  var nodeById = {};
  NODES_DATA.forEach(function(n) { nodeById[n.id] = n; });
  var rectById = {};
  NODES_DATA.forEach(function(n) {
    var el = document.getElementById('node-' + n.id);
    if (el) rectById[n.id] = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0, w: el.offsetWidth, h: el.offsetHeight };
  });
  function rootIsMain(id) {
    var r = nodeById[tree.rootOf[id]];
    return !!(r && r.isMain);
  }

  // 가로선: main topic 클러스터(자신+hop 자손 전체)의 Y 범위 경계
  var clusterYRange = {};
  NODES_DATA.forEach(function(n) {
    if (!rootIsMain(n.id)) return;
    var rect = rectById[n.id];
    if (!rect) return;
    var root = tree.rootOf[n.id];
    var top = rect.y, bottom = rect.y + rect.h;
    if (!clusterYRange[root]) clusterYRange[root] = { min: top, max: bottom };
    else { clusterYRange[root].min = Math.min(clusterYRange[root].min, top); clusterYRange[root].max = Math.max(clusterYRange[root].max, bottom); }
  });
  var roots = NODES_DATA.filter(function(n) { return tree.depthOf[n.id] === 0 && clusterYRange[n.id]; });
  var rootPar = {};
  roots.forEach(function(r) { rootPar[r.id] = r.id; });
  function rfind(id) {
    var p = rootPar[id];
    if (p === id) return id;
    var r = rfind(p); rootPar[id] = r; return r;
  }
  for (var i = 0; i < roots.length; i++) {
    for (var j = i + 1; j < roots.length; j++) {
      var a = roots[i], b = roots[j];
      var ra = rectById[a.id], rb = rectById[b.id];
      if (!ra || !rb) continue;
      if (ra.x < rb.x + rb.w && rb.x < ra.x + ra.w) {
        var fa = rfind(a.id), fb = rfind(b.id);
        if (fa !== fb) rootPar[fa] = fb;
      }
    }
  }
  var groups = {};
  roots.forEach(function(r) {
    var g = rfind(r.id);
    (groups[g] = groups[g] || []).push(r);
  });
  var hLines = [];
  Object.keys(groups).forEach(function(gk) {
    var group = groups[gk];
    group.sort(function(a, b) { return (rectById[a.id] ? rectById[a.id].y : 0) - (rectById[b.id] ? rectById[b.id].y : 0); });
    for (var k = 1; k < group.length; k++) {
      var prevR = clusterYRange[group[k - 1].id], curR = clusterYRange[group[k].id];
      hLines.push((prevR.max + curR.min) / 2);
    }
  });

  // 세로선: hop depth별 X 범위 경계 (main topic 기준 좌/우 방향 분리)
  var depthSideXRange = {};
  NODES_DATA.forEach(function(n) {
    if (!rootIsMain(n.id)) return;
    var rect = rectById[n.id];
    if (!rect) return;
    var d = tree.depthOf[n.id];
    var rootRect = rectById[tree.rootOf[n.id]];
    var side = d === 0 ? 0 : (rootRect && rect.x >= rootRect.x ? 1 : -1);
    var key = d + ':' + side;
    var left = rect.x, right = rect.x + rect.w;
    if (!depthSideXRange[key]) depthSideXRange[key] = { min: left, max: right };
    else { depthSideXRange[key].min = Math.min(depthSideXRange[key].min, left); depthSideXRange[key].max = Math.max(depthSideXRange[key].max, right); }
  });
  var vLines = [];
  var mainRange = depthSideXRange['0:0'];
  if (mainRange) {
    [1, -1].forEach(function(side) {
      var prev = mainRange, d = 1;
      while (depthSideXRange[d + ':' + side]) {
        var cur = depthSideXRange[d + ':' + side];
        if (side === 1 && cur.min > prev.max) vLines.push((prev.max + cur.min) / 2);
        else if (side === -1 && prev.min > cur.max) vLines.push((cur.max + prev.min) / 2);
        prev = cur; d++;
      }
    });
  }
  return { hLines: hLines, vLines: vLines };
}
// data-base-sw/-dash: 확대/축소해도 화면상 두께가 유지되도록(에디터의 WireLayer
// zoom 보정과 동일 규칙) zoom=1 기준 값을 기록해두고, updateZoomLineWeights()가
// 현재 scale에 맞춰 실제 stroke-width/dasharray를 매번 다시 계산한다.
function svgGridLine(x1, y1, x2, y2, stroke) {
  var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
  l.setAttribute('stroke', stroke);
  l.setAttribute('data-base-sw', '1.5');
  l.setAttribute('data-base-dash', '6 4');
  l.setAttribute('opacity', '0.55');
  return l;
}
function drawGrid() {
  var svg = document.getElementById('grid-svg');
  svg.innerHTML = '';
  if (!showGrid) { svg.style.display = 'none'; return; }
  svg.style.display = '';
  var lines = computeGridLinesJs();
  lines.vLines.forEach(function(x) { svg.appendChild(svgGridLine(x, -10000, x, 10000, '#22c55e')); });
  lines.hLines.forEach(function(y) { svg.appendChild(svgGridLine(-10000, y, 10000, y, '#f97316')); });
  updateZoomLineWeights();
}
function toggleGrid() {
  showGrid = !showGrid;
  var btn = document.getElementById('tb-grid-btn');
  if (showGrid) { btn.style.background = '#2563eb'; btn.style.color = '#fff'; btn.style.borderColor = '#1d4ed8'; }
  else { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
  drawGrid();
}

// Edge drawing
// A* 라우팅 캐시: 노드 배치가 바뀔 때만(routesDirty) 재계산 — 색상 변경 등은 재사용
var cachedRoutes=null, routesDirty=true;
var edgeRefineTimer=null;
// fold/드롭 직후: 경량 휴리스틱으로 즉시 그린 뒤 150ms 후 A* 정밀 경로로 교체
function scheduleEdgeRefine(){
  if(edgeRefineTimer) clearTimeout(edgeRefineTimer);
  edgeRefineTimer=setTimeout(function(){edgeRefineTimer=null;drawEdges();},150);
}
function getNodeRect(el) {
  var x = parseFloat(el.style.left)||0, y = parseFloat(el.style.top)||0;
  return { x:x, y:y, w:el.offsetWidth, h:el.offsetHeight, cx:x+el.offsetWidth*.5, cy:y+el.offsetHeight*.5 };
}
function getBestPorts(sr, tr) {
  var sp=[{name:'right',p:[sr.x+sr.w,sr.cy]},{name:'left',p:[sr.x,sr.cy]},{name:'bottom',p:[sr.cx,sr.y+sr.h]},{name:'top',p:[sr.cx,sr.y]}];
  var tp=[{name:'left',p:[tr.x,tr.cy]},{name:'right',p:[tr.x+tr.w,tr.cy]},{name:'top',p:[tr.cx,tr.y]},{name:'bottom',p:[tr.cx,tr.y+tr.h]}];
  var best=null,bestD=Infinity;
  sp.forEach(function(s){tp.forEach(function(t){var dx=s.p[0]-t.p[0],dy=s.p[1]-t.p[1],d=dx*dx+dy*dy;if(d<bestD){bestD=d;best={sp:s,tp:t};}});});
  return best;
}
var DIR={right:[1,0],left:[-1,0],bottom:[0,1],top:[0,-1]};

// ── 장애물 회피 라우팅 (에디터 wireGeometry.getRoutedPath와 동일 알고리즘) ──
// 선분이 (pad만큼 부풀린) 사각형과 교차하면 진입 t(0~1), 아니면 null (Liang-Barsky)
function segRectT(x1,y1,x2,y2,r,pad){
  var rx=r.x-pad,ry=r.y-pad,rw=r.w+pad*2,rh=r.h+pad*2;
  var dx=x2-x1,dy=y2-y1,t0=0,t1=1;
  var p=[-dx,dx,-dy,dy],q=[x1-rx,rx+rw-x1,y1-ry,ry+rh-y1];
  for(var i=0;i<4;i++){
    if(p[i]===0){if(q[i]<0)return null;}
    else{var t=q[i]/p[i];
      if(p[i]<0){if(t>t1)return null;if(t>t0)t0=t;}
      else{if(t<t0)return null;if(t<t1)t1=t;}}
  }
  return t0;
}
function dlen(a,b){return Math.hypot(b.x-a.x,b.y-a.y);}
// src→tgt 직선이 노드를 관통하면 위/아래(또는 좌/우) 짧은 쪽으로 우회 경유점 삽입
function routeAround(src,tgt,obstacles){
  var PAD=10,CLEAR=34;
  var pts=[src,tgt],guard=0,i=0;
  while(i<pts.length-1&&guard<16&&pts.length<8){
    guard++;
    var a=pts[i],b=pts[i+1],hit=null,hitT=Infinity;
    for(var oi=0;oi<obstacles.length;oi++){
      var t=segRectT(a.x,a.y,b.x,b.y,obstacles[oi],PAD);
      if(t!==null&&t<hitT){hitT=t;hit=obstacles[oi];}
    }
    if(!hit){i++;continue;}
    var horiz=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y),w;
    if(horiz){
      var top={x:hit.x+hit.w/2,y:hit.y-CLEAR},bot={x:hit.x+hit.w/2,y:hit.y+hit.h+CLEAR};
      w=dlen(a,top)+dlen(top,b)<=dlen(a,bot)+dlen(bot,b)?top:bot;
    }else{
      var lft={x:hit.x-CLEAR,y:hit.y+hit.h/2},rgt={x:hit.x+hit.w+CLEAR,y:hit.y+hit.h/2};
      w=dlen(a,lft)+dlen(lft,b)<=dlen(a,rgt)+dlen(rgt,b)?lft:rgt;
    }
    var dup=pts.some(function(p){return Math.abs(p.x-w.x)<1&&Math.abs(p.y-w.y)<1;});
    if(dup){i++;continue;}
    pts.splice(i+1,0,w);
    // i 유지 → a→w 세그먼트 재검사
  }
  return pts;
}
// 경유점 폴리라인 → 부드러운 path (경유점 = Q 제어점, 다음 경유점과의 중점 연결)
function ptsToPath(P){
  if(P.length<2) return '';
  if(P.length===2) return 'M'+P[0].x+','+P[0].y+' L'+P[1].x+','+P[1].y;
  var d='M'+P[0].x+','+P[0].y;
  for(var k=1;k<P.length-1;k++){
    var ex,ey;
    if(k<P.length-2){ex=(P[k].x+P[k+1].x)/2;ey=(P[k].y+P[k+1].y)/2;}
    else{ex=P[P.length-1].x;ey=P[P.length-1].y;}
    d+=' Q'+P[k].x+','+P[k].y+' '+ex+','+ey;
  }
  return d;
}
// 폴리라인 중간 경유점들을 법선 방향으로 spread만큼 이동 (평행 엣지 분산)
function spreadPts(pts,spread){
  if(!spread||pts.length<3) return pts;
  var s=pts[0],t=pts[pts.length-1];
  var dl=dlen(s,t)||1;
  var nx=-(t.y-s.y)/dl,ny=(t.x-s.x)/dl;
  var mid=pts.slice(1,-1).map(function(p){return{x:p.x+nx*spread,y:p.y+ny*spread};});
  return [s].concat(mid,[t]);
}
// ── 그리드 A* 전역 라우팅 (에디터 wireGeometry.routeEdgesOnGrid와 동일 알고리즘) ──
// 셀 비용: 노드 내부 200(불가피하면 통과 가능), 노드 주변 밴드 3(거리 유지),
// 이미 확정된 선이 지나간 셀 +4(선끼리 분산 — 빈 공간이 있으면 그쪽으로 우회)
function routeEdgesGrid(reqs,rects){
  var out={};
  if(!reqs.length) return out;
  var NEAR=3,INSIDE=200,USE=4,TURN=0.2;
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  rects.forEach(function(o){var r=o.rect;
    minX=Math.min(minX,r.x);minY=Math.min(minY,r.y);
    maxX=Math.max(maxX,r.x+r.w);maxY=Math.max(maxY,r.y+r.h);});
  reqs.forEach(function(r){
    minX=Math.min(minX,r.src.x,r.tgt.x);minY=Math.min(minY,r.src.y,r.tgt.y);
    maxX=Math.max(maxX,r.src.x,r.tgt.x);maxY=Math.max(maxY,r.src.y,r.tgt.y);});
  minX-=80;minY-=80;maxX+=80;maxY+=80;
  var cell=24;
  while(((maxX-minX)/cell)*((maxY-minY)/cell)>150000) cell*=2;
  var gw=Math.max(2,Math.ceil((maxX-minX)/cell));
  var gh=Math.max(2,Math.ceil((maxY-minY)/cell));
  var N=gw*gh;
  function cellX(x){return Math.min(gw-1,Math.max(0,Math.floor((x-minX)/cell)));}
  function cellY(y){return Math.min(gh-1,Math.max(0,Math.floor((y-minY)/cell)));}
  var baseCost=new Float64Array(N);
  rects.forEach(function(o){var r=o.rect;
    var ox0=cellX(r.x-cell),ox1=cellX(r.x+r.w+cell);
    var oy0=cellY(r.y-cell),oy1=cellY(r.y+r.h+cell);
    var ix0=cellX(r.x),ix1=cellX(r.x+r.w),iy0=cellY(r.y),iy1=cellY(r.y+r.h);
    for(var gy=oy0;gy<=oy1;gy++)for(var gx=ox0;gx<=ox1;gx++){
      var inside=gx>=ix0&&gx<=ix1&&gy>=iy0&&gy<=iy1;
      baseCost[gy*gw+gx]+=inside?INSIDE:NEAR;
    }});
  var useCost=new Float64Array(N),gScore=new Float64Array(N);
  var stampArr=new Int32Array(N),fromArr=new Int32Array(N),dirArr=new Int8Array(N);
  var stamp=0;
  var DIRS8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  var STEP8=[1,1,1,1,Math.SQRT2,Math.SQRT2,Math.SQRT2,Math.SQRT2];
  // 짧은 엣지부터 (동률이면 srcId/tgtId 사전순 — 에디터와 결과 일치 보장)
  var order=reqs.slice().sort(function(a,b){
    return (dlen(a.src,a.tgt)-dlen(b.src,b.tgt))||
      (a.srcId<b.srcId?-1:a.srcId>b.srcId?1:0)||
      (a.tgtId<b.tgtId?-1:a.tgtId>b.tgtId?1:0);});
  order.forEach(function(req){
    var sIdx=cellY(req.src.y)*gw+cellX(req.src.x);
    var tIdx=cellY(req.tgt.y)*gw+cellX(req.tgt.x);
    if(sIdx===tIdx){out[req.key]=[req.src,req.tgt];return;}
    stamp++;
    var heapF=[],heapI=[];
    function hpush(f,idx){
      var i=heapF.length;heapF.push(f);heapI.push(idx);
      while(i>0){var p=(i-1)>>1;
        if(heapF[p]<=heapF[i])break;
        var tf=heapF[p];heapF[p]=heapF[i];heapF[i]=tf;
        var ti=heapI[p];heapI[p]=heapI[i];heapI[i]=ti;i=p;}
    }
    function hpop(){
      var top=heapI[0];var lf=heapF.pop(),li=heapI.pop();
      if(heapF.length){heapF[0]=lf;heapI[0]=li;var i=0;
        for(;;){var l=i*2+1,r=l+1,m=i;
          if(l<heapF.length&&heapF[l]<heapF[m])m=l;
          if(r<heapF.length&&heapF[r]<heapF[m])m=r;
          if(m===i)break;
          var tf=heapF[m];heapF[m]=heapF[i];heapF[i]=tf;
          var ti=heapI[m];heapI[m]=heapI[i];heapI[i]=ti;i=m;}}
      return top;
    }
    var tgx=tIdx%gw,tgy=(tIdx/gw)|0;
    function hDist(idx){return Math.hypot((idx%gw)-tgx,((idx/gw)|0)-tgy);}
    gScore[sIdx]=0;stampArr[sIdx]=stamp;fromArr[sIdx]=-1;dirArr[sIdx]=-1;
    hpush(hDist(sIdx),sIdx);
    var found=false,iter=0;
    while(heapF.length&&iter<60000){
      iter++;
      var cur=hpop();
      if(cur===tIdx){found=true;break;}
      var cgx=cur%gw,cgy=(cur/gw)|0,cg=gScore[cur],cd=dirArr[cur];
      for(var di=0;di<8;di++){
        var ngx=cgx+DIRS8[di][0],ngy=cgy+DIRS8[di][1];
        if(ngx<0||ngy<0||ngx>=gw||ngy>=gh)continue;
        var nIdx=ngy*gw+ngx;
        var ng=cg+STEP8[di]+baseCost[nIdx]+useCost[nIdx]+(cd!==-1&&cd!==di?TURN:0);
        if(stampArr[nIdx]===stamp&&gScore[nIdx]<=ng)continue;
        stampArr[nIdx]=stamp;gScore[nIdx]=ng;fromArr[nIdx]=cur;dirArr[nIdx]=di;
        hpush(ng+hDist(nIdx),nIdx);
      }
    }
    if(!found){out[req.key]=null;return;}
    // 경로 복원 (셀 중심) — 양 끝은 실제 포트 좌표로 대체
    var cellsRev=[];
    for(var c=tIdx;c!==-1;c=fromArr[c])cellsRev.push(c);
    cellsRev.reverse();
    var raw=cellsRev.map(function(c2){return{x:minX+(c2%gw)*cell+cell/2,y:minY+((c2/gw)|0)*cell+cell/2};});
    raw[0]={x:req.src.x,y:req.src.y};
    raw[raw.length-1]={x:req.tgt.x,y:req.tgt.y};
    // string pulling: 자기 양끝 노드를 제외한 노드 내부를 지나지 않는 한 직선화
    var blockers=[];
    rects.forEach(function(o){if(o.id!==req.srcId&&o.id!==req.tgtId)blockers.push(o.rect);});
    function clearSeg(a,b){
      for(var bi=0;bi<blockers.length;bi++)
        if(segRectT(a.x,a.y,b.x,b.y,blockers[bi],12)!==null)return false;
      return true;
    }
    var pts=[raw[0]];
    var i2=0;
    while(i2<raw.length-1){
      var j=raw.length-1;
      while(j>i2+1&&!clearSeg(raw[i2],raw[j]))j--;
      pts.push(raw[j]);i2=j;
    }
    out[req.key]=pts;
    // 이후 엣지의 congestion 비용: 확정 경로가 지나는 셀에 가산
    for(var k=0;k<pts.length-1;k++){
      var a2=pts[k],b2=pts[k+1];
      var steps=Math.max(1,Math.ceil(dlen(a2,b2)/cell));
      for(var s2=0;s2<=steps;s2++){
        var px=a2.x+(b2.x-a2.x)*(s2/steps);
        var py=a2.y+(b2.y-a2.y)*(s2/steps);
        useCost[cellY(py)*gw+cellX(px)]+=USE;
      }
    }
  });
  return out;
}
// 확대(zoom>=100%)면 기본 두께, 축소(zoom<100%)면 화면상 두께가 유지되도록 반비례로
// 키움(에디터의 WireLayer.tsx의 zc = zoom<1 ? 1/zoom : 1 과 동일 규칙). 레이아웃이
// 안 바뀌는 순수 줌 조작(wheel)에서는 경로를 다시 그리지 않고 이미 그려진 요소들의
// stroke-width/dasharray만 갱신 — 가볍고, wheel마다 A* 재계산할 필요가 없음.
function updateZoomLineWeights() {
  var zc = scale < 1 ? 1 / scale : 1;
  document.querySelectorAll('[data-base-sw]').forEach(function(el) {
    var base = parseFloat(el.getAttribute('data-base-sw'));
    el.setAttribute('stroke-width', String(base * zc));
  });
  document.querySelectorAll('[data-base-dash]').forEach(function(el) {
    var parts = el.getAttribute('data-base-dash').split(' ').map(Number);
    el.setAttribute('stroke-dasharray', parts.map(function(p) { return p * zc; }).join(' '));
  });
}
function drawEdges(fast) {
  var svg=document.getElementById('wire-svg');
  svg.querySelectorAll('.ng-eg').forEach(function(el){el.remove();});

  // 노드 rect 캐시 (엣지 라우팅 장애물 검사용 — drawEdges 1회당 1회만 DOM 조회)
  var rectById={};
  NODES_DATA.forEach(function(n){
    var el=document.getElementById('node-'+n.id);
    if(el) rectById[n.id]=getNodeRect(el);
  });

  // hop 자식(line) 엣지: 버스 라우팅도, A*/커브 라우팅도 없이 그냥 평범한 직선
  // (에디터 WireLayer.tsx와 동일 — 예전엔 "같은 source에서 나가는 line 엣지 여럿을
  // 세로 트렁크로 묶는 버스 라우팅"이 있었는데, 에디터가 이미 그걸 버리고 순수 직선으로
  // 바꾼 지 오래라 여기만 안 따라와 있었음). 포트는 항상 좌/우만 강제 — getBestPorts처럼
  // top/bottom까지 유클리드 최솟값으로 고르면, 타겟이 부모 중심에서 수직으로 많이
  // 떨어진 형제 하나만 포트가 top/bottom으로 뒤집혀 다른 형제 선을 가로질러 지나가
  // 버리는 문제가 있었다(사용자가 export html 스크린샷으로 재지적: "선이 왜 깔끔하게
  // 정리되지 않은 거지" — 첫 main topic만 깔끔하고 나머지는 선이 교차해 보임).
  function horizontalPorts(sr,tr){
    var scx=sr.x+sr.w/2, tcx=tr.x+tr.w/2;
    return tcx>=scx ? {sp:'right',tp:'left'} : {sp:'left',tp:'right'};
  }
  function portXY(r,name){
    if(name==='right') return [r.x+r.w,r.cy];
    if(name==='left') return [r.x,r.cy];
    if(name==='bottom') return [r.cx,r.y+r.h];
    return [r.cx,r.y];
  }

  // 같은 source에서 나가거나 같은 target으로 모이는 백본(arrow) 엣지 분산 오프셋(합산).
  // hop 자식(line)은 이제 라우팅 없는 고정 직선이라 분산이 필요 없음(에디터와 동일 이유).
  var spreadByIdx={};
  (function(){
    var bySrc={},byTgt={};
    EDGES.forEach(function(e,idx){
      if(e.type!=='arrow') return;
      if(!rectById[e.source]||!rectById[e.target]) return;
      (bySrc[e.source]=bySrc[e.source]||[]).push(idx);
      (byTgt[e.target]=byTgt[e.target]||[]).push(idx);
    });
    function add(groups,cyOf){
      Object.keys(groups).forEach(function(gk){
        var idxs=groups[gk];
        if(idxs.length<2) return;
        idxs.sort(function(ia,ib){return cyOf(ia)-cyOf(ib);});
        idxs.forEach(function(ei,k){spreadByIdx[ei]=(spreadByIdx[ei]||0)+(k-(idxs.length-1)/2)*16;});
      });
    }
    add(bySrc,function(i){return rectById[EDGES[i].target].cy;});
    add(byTgt,function(i){return rectById[EDGES[i].source].cy;});
  })();

  // 그리드 A* 전역 라우팅 — main topic 백본(arrow) 엣지만 대상(hop 자식은 고정 직선이라
  // 라우팅 대상 아님, 에디터와 동일). 드래그 중(fast)에는 스킵하고 경량 휴리스틱 사용.
  // 레이아웃이 바뀌지 않은 재호출(하이라이트 색만 변경 등)은 캐시를 재사용해 즉시 처리
  var gridRoutes=null;
  if(!fast){
    if(routesDirty||!cachedRoutes){
      var reqs=[];
      EDGES.forEach(function(e,idx){
        if(e.type!=='arrow') return;
        var sr3=rectById[e.source],tr3=rectById[e.target];
        if(!sr3||!tr3) return;
        var ports3=getBestPorts(sr3,tr3);
        if(!ports3) return;
        reqs.push({key:String(idx),
          src:{x:ports3.sp.p[0],y:ports3.sp.p[1]},
          tgt:{x:ports3.tp.p[0],y:ports3.tp.p[1]},
          srcId:e.source,tgtId:e.target});
      });
      var rectList=Object.keys(rectById).map(function(nid){return{id:nid,rect:rectById[nid]};});
      cachedRoutes=routeEdgesGrid(reqs,rectList);
      routesDirty=false;
    }
    gridRoutes=cachedRoutes;
  }

  EDGES.forEach(function(edge,edgeIdx){
    var sr2=rectById[edge.source], tr2=rectById[edge.target];
    if(!sr2||!tr2) return;

    var d, sp, tp, strokeColor;
    var hl=genRootId&&(edge.source===genRootId||edge.target===genRootId);
    strokeColor=hl?'#ef4444':'#666';

    if(edge.type!=='arrow'){
      // hop 자식: 라우팅/커브 없이 좌/우 포트 사이 직선 그대로
      var hp=horizontalPorts(sr2,tr2);
      sp=portXY(sr2,hp.sp); tp=portXY(tr2,hp.tp);
      d='M'+sp[0]+','+sp[1]+' L'+tp[0]+','+tp[1];
    } else {
      var ports=getBestPorts(sr2,tr2);
      if(!ports) return;
      sp=ports.sp.p; var spD=DIR[ports.sp.name]; tp=ports.tp.p; var tpD=DIR[ports.tp.name];
      var srcP={x:sp[0],y:sp[1]},tgtP={x:tp[0],y:tp[1]};
      var ddl=dlen(srcP,tgtP)||1;
      var nx=-(tgtP.y-srcP.y)/ddl, nyv=(tgtP.x-srcP.x)/ddl;
      var spread=spreadByIdx[edgeIdx]||0;
      var gridPts=gridRoutes?gridRoutes[String(edgeIdx)]:null;
      if(gridPts&&gridPts.length>2){
        // 그리드 A* 경로 (노드 회피 + congestion 분산) + 같은 소스/타겟 묶음 분산
        d=ptsToPath(spreadPts(gridPts,spread));
      } else if(gridPts){
        // 직선 경로: 기존 bezier 모양 유지 (spread만큼 제어점을 법선 방향 이동)
        var bend=Math.min(ddl*.45,150);
        var cx1=sp[0]+spD[0]*bend+nx*spread,cy1=sp[1]+spD[1]*bend+nyv*spread;
        var cx2=tp[0]+tpD[0]*bend+nx*spread,cy2=tp[1]+tpD[1]*bend+nyv*spread;
        d='M'+sp[0]+','+sp[1]+' C'+cx1+','+cy1+' '+cx2+','+cy2+' '+tp[0]+','+tp[1];
      } else {
        // 드래그 중(fast) 또는 A* 실패: 경량 우회 휴리스틱
        var obstacles=[];
        Object.keys(rectById).forEach(function(nid){
          if(nid!==edge.source&&nid!==edge.target) obstacles.push(rectById[nid]);
        });
        var pts=routeAround(srcP,tgtP,obstacles);
        if(pts.length===2){
          var bend2=Math.min(ddl*.45,150);
          var bx1=sp[0]+spD[0]*bend2+nx*spread,by1=sp[1]+spD[1]*bend2+nyv*spread;
          var bx2=tp[0]+tpD[0]*bend2+nx*spread,by2=tp[1]+tpD[1]*bend2+nyv*spread;
          d='M'+sp[0]+','+sp[1]+' C'+bx1+','+by1+' '+bx2+','+by2+' '+tp[0]+','+tp[1];
        } else {
          d=ptsToPath(spreadPts(pts,spread));
        }
      }
    }

    var g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');
    var path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',strokeColor);path.setAttribute('data-base-sw',hl?'2.5':'1.5');
    if(edge.type==='arrow') path.setAttribute('marker-end',hl?'url(#arrow-hl)':'url(#arrow)');
    g.appendChild(path);
    if(edge.type==='line'){[sp,tp].forEach(function(pt){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',pt[0]);c.setAttribute('cy',pt[1]);c.setAttribute('r','4');c.setAttribute('fill',strokeColor);g.appendChild(c);});}
    svg.appendChild(g);
  });
  updateZoomLineWeights();
}

// Fit view
function fitView() {
  var nodes=document.querySelectorAll('.ng-node');
  if(!nodes.length) return;
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(function(n){var x=parseFloat(n.style.left)||0,y=parseFloat(n.style.top)||0;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+n.offsetWidth);maxY=Math.max(maxY,y+n.offsetHeight);});
  var rect=vp.getBoundingClientRect(),W=rect.width,H=rect.height;
  var cw=maxX-minX+80,ch=maxY-minY+80;
  scale=Math.min(W/cw,H/ch,1.5);
  tx=(W-cw*scale)/2-(minX-40)*scale;
  ty=(H-ch*scale)/2-(minY-40)*scale;
  applyTransform();
  updateZoomLineWeights();
}

// Lightbox
function showLightbox(src){document.getElementById('lightbox-img').src=src;document.getElementById('lightbox').classList.add('active');}
function closeLightbox(){document.getElementById('lightbox').classList.remove('active');document.getElementById('lightbox-img').src='';}
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();openSearch();return;}
  if(e.key==='Escape'){
    if(document.getElementById('search-wrap').classList.contains('open')){closeSearch();return;}
    closeLightbox();
    // Esc = 세대 하이라이트 해제 (배경 클릭으로는 해제되지 않음)
    if(genRootId){genRootId=null;updateGenHighlight();drawEdges();}
  }
});
// Middle click: prevent X11 primary selection paste
vp.addEventListener('mousedown',function(e){if(e.button===1) e.preventDefault();});
// 좁은 화면: 툴바 버튼 행 가로 슬라이드 (Shift+휠 / 가로휠 / 터치 스와이프는 native)
var tbRow2=document.getElementById('tb-row2');
tbRow2.addEventListener('wheel',function(e){
  if(tbRow2.scrollWidth<=tbRow2.clientWidth) return;
  var d=e.shiftKey?(e.deltaY||e.deltaX):e.deltaX;
  if(d){e.preventDefault();tbRow2.scrollLeft+=d;}
},{passive:false});
// Background click: close search if open
vp.addEventListener('mouseup',function(e){
  if(e.button!==0) return;
  if(!e.target.closest('.ng-node')&&!e.target.closest('#search-wrap')){
    if(document.getElementById('search-wrap').classList.contains('open')) closeSearch();
  }
});

// Search
var searchSelectedId=null;
var searchMatchNodes=[];
var kbIdx=-1;

function openSearch(){
  document.getElementById('search-wrap').classList.add('open');
  var inp=document.getElementById('search-input');
  inp.focus();inp.select();
  kbIdx=-1;
  if(inp.value) doSearch(inp.value);
}
function closeSearch(){
  clearSearchHighlights();
  clearTextHits();
  searchSelectedId=null;searchMatchNodes=[];kbIdx=-1;
  document.getElementById('search-wrap').classList.remove('open');
  document.getElementById('search-input').value='';
  document.getElementById('search-count').textContent='';
  closeDropdown();
}
function clearSearchHighlights(){
  document.querySelectorAll('.ng-search-match,.ng-search-active').forEach(function(el){el.classList.remove('ng-search-match','ng-search-active');});
}
// 검색어 인라인 하이라이트 (CSS Custom Highlight API — 미지원 브라우저는 조용히 무시)
// 매치 노드의 텍스트에서 검색어 부분만 Range로 수집, 템플릿별 반전색 스타일 적용
function hitKey(t){return 'ng-hit-'+String(t).replace(/[^a-zA-Z0-9_-]/g,'_');}
var HIT_KEYS=[];
function clearTextHits(){
  if(!window.CSS||!CSS.highlights) return;
  HIT_KEYS.forEach(function(k){CSS.highlights.delete(k);});
  HIT_KEYS=[];
}
function updateTextHits(){
  if(!window.CSS||!CSS.highlights||typeof Highlight==='undefined') return;
  clearTextHits();
  var q=document.getElementById('search-input').value.trim().toLowerCase();
  if(!q||!document.getElementById('search-wrap').classList.contains('open')) return;
  var byTmpl={};
  searchMatchNodes.forEach(function(n){
    var el=document.getElementById('node-'+n.id);
    if(!el) return;
    var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    var tn;
    while((tn=walker.nextNode())){
      var par=tn.parentElement;
      if(!par||par.closest('.katex')) continue;
      var lower=(tn.textContent||'').toLowerCase();
      var idx=lower.indexOf(q);
      while(idx!==-1){
        var r=new Range();
        r.setStart(tn,idx);r.setEnd(tn,idx+q.length);
        var k=hitKey(n.template);
        if(!byTmpl[k]) byTmpl[k]=new Highlight();
        byTmpl[k].add(r);
        idx=lower.indexOf(q,idx+q.length);
      }
    }
  });
  Object.keys(byTmpl).forEach(function(k){CSS.highlights.set(k,byTmpl[k]);HIT_KEYS.push(k);});
}
function closeDropdown(){
  document.getElementById('search-drop').classList.remove('open');
  document.getElementById('search-row').classList.remove('dropdown-open');
  kbIdx=-1;
}
// 매치 노드가 toggle 제목/내용 안에 있을 수도 있으므로 단순 concat 문자열이 아니라
// title/content/original(제목+텍스트)/toggle(제목+내용) 각각을 개별로 확인 (에디터의
// searchMatchNodes 필터와 동일한 규칙 — 이래야 selectSearchNode에서 어느 섹션을
// 펼쳐야 하는지도 알 수 있음).
function nodeMatchesQuery(n, q){
  if((n.title||'').toLowerCase().indexOf(q)!==-1) return true;
  if((n.content||'').toLowerCase().indexOf(q)!==-1) return true;
  if((n.originalText||'').toLowerCase().indexOf(q)!==-1) return true;
  if((n.originalTitle||'').toLowerCase().indexOf(q)!==-1) return true;
  return (n.toggles||[]).some(function(t){
    return (t.title||'').toLowerCase().indexOf(q)!==-1 || (t.content||'').toLowerCase().indexOf(q)!==-1;
  });
}
function doSearch(q){
  clearSearchHighlights();
  searchSelectedId=null;kbIdx=-1;
  var query=q.trim().toLowerCase();
  if(!query){document.getElementById('search-count').textContent='';closeDropdown();searchMatchNodes=[];return;}
  searchMatchNodes=NODES_DATA.filter(function(n){return nodeMatchesQuery(n,query);});
  // main topic BFS 순서로 정렬: 한 main topic의 모든 hop1, 모든 hop2, ... 를 다 훑은
  // 뒤에야 다음 main topic으로 (에디터의 searchMatchNodes 정렬과 동일 규칙)
  var tree=buildHopTreeJs();
  var roots=NODES_DATA.filter(function(n){return tree.depthOf[n.id]===0;})
    .sort(function(a,b){return (a.ly-b.ly)||(a.lx-b.lx);});
  var rootIndex={};
  roots.forEach(function(r,i){rootIndex[r.id]=i;});
  searchMatchNodes.sort(function(a,b){
    var ra=rootIndex[tree.rootOf[a.id]]||0, rb=rootIndex[tree.rootOf[b.id]]||0;
    if(ra!==rb) return ra-rb;
    var da=tree.depthOf[a.id]||0, db=tree.depthOf[b.id]||0;
    if(da!==db) return da-db;
    return (a.ly-b.ly)||(a.lx-b.lx);
  });
  searchMatchNodes.forEach(function(n){var el=document.getElementById('node-'+n.id);if(el) el.classList.add('ng-search-match');});
  updateSearchCount();
  renderDropdown();
  updateTextHits();
}
function renderDropdown(){
  var drop=document.getElementById('search-drop');
  var row=document.getElementById('search-row');
  drop.innerHTML='';
  if(!searchMatchNodes.length){closeDropdown();return;}
  searchMatchNodes.forEach(function(n,i){
    var div=document.createElement('div');
    div.className='ng-drop-item';
    div.setAttribute('data-kb-idx',i);
    var nodeEl=document.getElementById('node-'+n.id);
    var titleEl=nodeEl?nodeEl.querySelector('.ng-title'):null;
    div.textContent=titleEl?titleEl.textContent:n.id;
    div.addEventListener('mousedown',function(e){e.preventDefault();selectSearchNode(n.id);});
    div.addEventListener('mouseenter',function(){setKbActive(i);});
    drop.appendChild(div);
  });
  if(kbIdx>=0&&kbIdx<searchMatchNodes.length) applyKbHighlight();
  drop.classList.add('open');
  row.classList.add('dropdown-open');
}
function setKbActive(idx){
  kbIdx=idx;
  applyKbHighlight();
  var drop=document.getElementById('search-drop');
  var el=drop.querySelector('[data-kb-idx="'+idx+'"]');
  if(el) el.scrollIntoView({block:'nearest'});
}
function applyKbHighlight(){
  var drop=document.getElementById('search-drop');
  drop.querySelectorAll('.ng-drop-item').forEach(function(el){
    var active=el.getAttribute('data-kb-idx')===String(kbIdx);
    el.style.background=active?'#e8f0fe':'transparent';
    el.style.fontWeight=active?'500':'400';
  });
}
function selectSearchNode(id){
  clearSearchHighlights();
  searchSelectedId=id;
  var el=document.getElementById('node-'+id);
  if(el) el.classList.add('ng-search-active');
  var q=document.getElementById('search-input').value.trim().toLowerCase();
  // Enter 확정: 선택된 노드만 expand, 나머지 매치 노드 collapse
  searchMatchNodes.forEach(function(n){
    var nodeEl=document.getElementById('node-'+n.id);
    if(!nodeEl) return;
    var body=nodeEl.querySelector('.ng-body');
    if(!body) return;
    var datum=null;
    for(var i=0;i<NODES_DATA.length;i++){if(NODES_DATA[i].id===n.id){datum=NODES_DATA[i];break;}}
    if(!datum) return;
    if(n.id===id){
      if(!datum.contentExpanded){body.style.display='';datum.contentExpanded=true;widenForFormulas(nodeEl);applyContentCaps(nodeEl);applyKatexWidthForFold(nodeEl,true);}
      // 매치가 toggle 제목/내용 또는 original 제목/텍스트 안에 있을 수 있으므로,
      // 접혀 있으면 펼쳐서 실제로 보이게 함 (에디터의 handleSelectSearchNode와 동일)
      (n.toggles||[]).forEach(function(t){
        if(q&&((t.title||'').toLowerCase().indexOf(q)!==-1||(t.content||'').toLowerCase().indexOf(q)!==-1)){
          var togEl=nodeEl.querySelector('details.ng-toggle[data-toggle-id="'+t.id+'"]');
          if(togEl&&!togEl.open) togEl.open=true;
        }
      });
      if(q&&((n.originalTitle||'').toLowerCase().indexOf(q)!==-1||(n.originalText||'').toLowerCase().indexOf(q)!==-1)){
        var origEl=nodeEl.querySelector('details.ng-original');
        if(origEl&&!origEl.open) origEl.open=true;
      }
    } else {
      if(datum.contentExpanded){body.style.display='none';datum.contentExpanded=false;applyKatexWidthForFold(nodeEl,false);}
    }
  });
  setTimeout(function(){recomputePositions();flyToNode(id);},0);
  closeDropdown();
  updateSearchCount();
  updateTextHits();
}
function onSearchInputClick(){
  if(searchSelectedId!==null){
    // 이전 선택 노드의 인덱스를 찾아 kbIdx 복원
    var idx=-1;
    for(var i=0;i<searchMatchNodes.length;i++){if(searchMatchNodes[i].id===searchSelectedId){idx=i;break;}}
    clearSearchHighlights();
    searchSelectedId=null;
    searchMatchNodes.forEach(function(n){var el=document.getElementById('node-'+n.id);if(el) el.classList.add('ng-search-match');});
    updateSearchCount();
    renderDropdown();
    if(idx>=0){kbIdx=idx;applyKbHighlight();}
  }
}
function updateSearchCount(){
  var el=document.getElementById('search-count');
  if(!el) return;
  var q=document.getElementById('search-input').value.trim();
  if(!q){el.textContent='';return;}
  if(searchSelectedId){el.style.color='#6b7280';el.textContent='1 selected';return;}
  if(!searchMatchNodes.length){el.style.color='#ef4444';el.textContent='0 results';return;}
  el.style.color='#6b7280';el.textContent=searchMatchNodes.length+' results';
}
function flyToNode(nodeId){
  var el=document.getElementById('node-'+nodeId);
  if(!el) return;
  var rect=vp.getBoundingClientRect();
  var W=rect.width,H=rect.height;
  var nodeX=parseFloat(el.style.left)||0;
  var nodeY=parseFloat(el.style.top)||0;
  tx=W/2-(nodeX+el.offsetWidth/2)*scale;
  ty=H/2-(nodeY+el.offsetHeight/2)*scale;
  applyTransform();
}
function onSearchKey(e){
  var n=searchMatchNodes.length;
  if(e.key==='ArrowDown'){
    e.preventDefault();
    if(n>0){var newIdx=kbIdx<0?0:(kbIdx+1)%n;setKbActive(newIdx);flyToNode(searchMatchNodes[newIdx].id);}
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    if(n>0){var newIdx=kbIdx<0?n-1:(kbIdx-1+n)%n;setKbActive(newIdx);flyToNode(searchMatchNodes[newIdx].id);}
  } else if(e.key==='Enter'){
    e.preventDefault();
    if(n>0) selectSearchNode(searchMatchNodes[kbIdx>=0?kbIdx:0].id);
  } else if(e.key==='Escape'){
    closeSearch();e.preventDefault();
  }
  e.stopPropagation();
}

// KaTeX rendering
function initKatex() {
  if(typeof renderMathInElement === 'undefined') return;
  renderMathInElement(document.getElementById('canvas'), {
    delimiters: [
      {left:'$$', right:'$$', display:true},
      {left:'$',  right:'$',  display:false}
    ],
    throwOnError: false,
    output: 'html'
  });
}

// 노드 폭보다 넓은 display 수식은 (에디터의 자동 확장과 동일하게) 스크롤바 대신
// 노드 min-width를 넘친 양만큼 늘려서 수용. offsetWidth/scrollWidth는 CSS transform과
// 무관한 레이아웃 값이라 줌 상태와 상관없이 언제든 안전하게 측정 가능 — fold를
// 펼칠 때(scope 지정)도 그대로 재사용한다.
function widenForFormulas(scope) {
  (scope ? [scope] : Array.prototype.slice.call(document.querySelectorAll('.ng-node'))).forEach(function(nodeEl) {
    var maxOv = 0;
    nodeEl.querySelectorAll('.katex-display').forEach(function(kd) {
      var ov = kd.scrollWidth - kd.clientWidth;
      if (ov > maxOv) maxOv = ov;
    });
    if (maxOv > 0) {
      // 접을 때 원래 폭으로 복귀할 수 있도록 원본 inline min-width를 먼저 보관
      // (에디터의 katexMinWidth와 동일하게, 수식 확장 폭은 펼친 동안만 적용).
      if (!nodeEl.hasAttribute('data-orig-minw')) nodeEl.setAttribute('data-orig-minw', nodeEl.style.minWidth || '');
      var widened = Math.ceil(nodeEl.offsetWidth + maxOv + 4) + 'px';
      nodeEl.setAttribute('data-katex-minw', widened);
      nodeEl.style.minWidth = widened;
    }
  });
}

// fold/unfold 시 수식 확장 폭을 적용/해제 — 접힌 노드는 원래 폭으로 돌아간다.
function applyKatexWidthForFold(nodeEl, expanded) {
  if (!nodeEl.hasAttribute('data-katex-minw')) return;
  nodeEl.style.minWidth = expanded
    ? nodeEl.getAttribute('data-katex-minw')
    : nodeEl.getAttribute('data-orig-minw');
}

// 본문 높이 상한(More/Less) — NodeCard.tsx의 DEFAULT_CONTENT_MAX 로직을 그대로 이식.
// .ng-content는 node.content 전용 클래스라서(toggle/original은 각각
// .ng-toggle-body / .ng-orig-text 를 씀) 이 셀렉터만으로 이미 "content만" 범위가
// 잡힌다 — 에디터와 동일하게 toggle/original에는 캡을 적용하지 않음.
// scope를 주면 그 안의 .ng-content만 재측정(fold/unfold나 검색으로 처음 보이게
// 될 때 — display:none 상태에서 측정하면 전부 0으로 나와서 버튼이 필요 없다고
// 잘못 판단하기 때문에 다시 보이게 된 시점에 재측정이 필요함).
var DEFAULT_CONTENT_MAX = 500;
// 기본값 꺼짐(항상 전체 펼침) — 에디터 툴바의 More 토글 기본값과 동일하게 유지.
var capsEnabled = false;
function applyContentCaps(scope) {
  (scope || document).querySelectorAll('.ng-content').forEach(function(el) {
    var measure = function() {
      if (!capsEnabled) return;
      if (el.getAttribute('data-more-expanded') === '1') return;
      var elTop = el.getBoundingClientRect().top;
      var requiredBottom = 0;
      el.querySelectorAll('table, img').forEach(function(media) {
        var bottom = media.getBoundingClientRect().bottom - elTop;
        if (bottom > requiredBottom) requiredBottom = bottom;
      });
      var max = Math.max(DEFAULT_CONTENT_MAX, Math.ceil(requiredBottom) + 8);
      el.setAttribute('data-cap', String(max));
      var needsBtn = el.scrollHeight > max + 1;
      el.style.maxHeight = max + 'px';
      el.style.overflowY = 'auto';
      el.style.overflowX = 'hidden';
      var next = el.nextElementSibling;
      var btn = (next && next.classList.contains('ng-more-btn')) ? next : null;
      if (needsBtn) {
        if (!btn) {
          btn = document.createElement('button');
          btn.className = 'ng-more-btn';
          btn.textContent = '▼ More';
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var expanded = el.getAttribute('data-more-expanded') === '1';
            if (expanded) {
              el.removeAttribute('data-more-expanded');
              el.style.maxHeight = el.getAttribute('data-cap') + 'px';
              el.style.overflowY = 'auto';
              el.style.overflowX = 'hidden';
              btn.textContent = '▼ More';
            } else {
              el.setAttribute('data-more-expanded', '1');
              el.style.maxHeight = '';
              el.style.overflowY = '';
              el.style.overflowX = '';
              btn.textContent = '▲ Less';
            }
            setTimeout(function() { recomputePositions(); drawEdges(); }, 0);
          });
          el.parentNode.insertBefore(btn, el.nextSibling);
        }
      } else if (btn) {
        btn.remove();
      }
    };
    measure();
    var imgs = Array.from(el.querySelectorAll('img'));
    var pending = imgs.filter(function(img) { return !img.complete; });
    pending.forEach(function(img) { img.addEventListener('load', measure); });
  });
}

// 툴바 More 토글 — 끄면 모든 노드의 콘텐츠 캡과 More/Less 버튼이 사라지고 항상
// 전체 펼침(에디터 툴바의 동일 토글과 짝을 이룸). 다시 켜면 applyContentCaps()가
// 캡과 버튼을 원래대로 복원한다.
function toggleMoreCaps() {
  capsEnabled = !capsEnabled;
  var btn = document.getElementById('tb-more-btn');
  if (capsEnabled) { btn.style.background = '#2563eb'; btn.style.color = '#fff'; btn.style.borderColor = '#1d4ed8'; }
  else { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
  if (!capsEnabled) {
    document.querySelectorAll('.ng-content').forEach(function(el) {
      el.style.maxHeight = ''; el.style.overflowY = ''; el.style.overflowX = '';
    });
    document.querySelectorAll('.ng-more-btn').forEach(function(b) { b.style.display = 'none'; });
  } else {
    document.querySelectorAll('.ng-more-btn').forEach(function(b) { b.style.display = ''; });
    applyContentCaps();
  }
  setTimeout(function() { recomputePositions(); drawEdges(); }, 0);
}

window.addEventListener('load', function() {
  // Render KaTeX first so node heights are accurate
  initKatex();
  widenForFormulas();
  // KaTeX 웹폰트는 load 이벤트 이후에 도착할 수 있고, 그러면 수식 폭이 바뀐다 —
  // 폰트 적용 후 한 번 더 측정/확장하고 레이아웃 재계산 (에디터 NodeCard와 동일 보강).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      widenForFormulas();
      recomputePositions();
      drawEdges();
    });
  }
  // scale는 아직 초기값 1이라(fitView가 아직 안 돌아서) getBoundingClientRect()
  // 측정값이 캔버스 local 좌표와 일치함 — fitView 이후로 미루면 축소된 화면 픽셀을
  // local px로 착각해서 캡 높이가 잘못 계산됨.
  applyContentCaps();
  recomputePositions();
  drawEdges();
  fitView();
  // Recompute after images load (base64 images also finalize height asynchronously)
  var imgs = Array.from(document.querySelectorAll('.ng-node img'));
  var pending = imgs.filter(function(img) { return !img.complete; }).length;
  if (pending === 0) return;
  function onImgSettle() {
    pending--;
    if (pending <= 0) { applyContentCaps(); recomputePositions(); drawEdges(); }
  }
  imgs.forEach(function(img) {
    if (!img.complete) {
      img.addEventListener('load', onImgSettle);
      img.addEventListener('error', onImgSettle);
    }
  });
});
</script>
</body>
</html>`
}
