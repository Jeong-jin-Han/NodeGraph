import { NodeGraph, GraphNode, NodeTemplate } from '../webview/types/graph'

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
    bodyHtml += `<details class="ng-toggle"${t.expanded ? ' open' : ''}><summary>${escHtml(t.title || '(untitled)')}</summary>
<div class="ng-toggle-body">${renderTextSegment(t.content).replace(/\n/g, '<br>')}</div></details>`
  }
  if (node.links.length) {
    bodyHtml += `<div class="ng-links">${node.links.map(l => {
      const icon = l.type === 'url' ? '🔗' : l.type === 'pdf' ? '📄' : l.type === 'obsidian' ? '🟣' : '⬡'
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
  const extraStyle = [
    node.nodeWidth  ? `min-width:${node.nodeWidth}px`  : (autoMinWidth > 432 ? `min-width:${autoMinWidth}px` : ''),
    node.nodeHeight && node.contentExpanded ? `min-height:${node.nodeHeight}px` : '',
  ].filter(Boolean).join(';')
  const minHAttr = node.nodeHeight ? ` data-min-h="${node.nodeHeight}"` : ''

  return `<div class="ng-node${hasTableClass}" id="node-${escHtml(node.id)}"${childrenAttr}${minHAttr} style="--color:${color};border-radius:${borderRadius};left:${nx}px;top:${ny}px${extraStyle ? ';' + extraStyle : ''}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${color} 22%,transparent);color:${color}">${label}</span>
    ${hasBody ? `<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${escHtml(node.title)}</span>` : `<span class="ng-title">${escHtml(node.title)}</span>`}
  </div>
  ${hasBody ? `<div class="ng-body"${bodyDisplay}${node.fontSize ? ` style="font-size:${node.fontSize}px"` : ''}>${bodyHtml}</div>` : ''}
</div>`
}

export function generateHtml(graph: NodeGraph, imageData: Record<string, string> = {}): string {
  let minX = Infinity, minY = Infinity
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
  }
  if (!isFinite(minX)) { minX = 0; minY = 0 }
  const offsetX = -minX + 100
  const offsetY = -minY + 100

  const nodesHtml = graph.nodes
    .map(n => renderNodeCard(n, graph.nodeTemplates[n.template], offsetX, offsetY, imageData))
    .join('\n')

  const nodesData = JSON.stringify(graph.nodes.map(n => ({
    id: n.id,
    lx: Math.round(n.position.x + offsetX),
    ly: Math.round(n.position.y + offsetY),
    children: n.children ?? [],
    template: n.template,
    contentExpanded: n.contentExpanded,
    isMain: (graph.nodeTemplates[n.template]?.shape ?? 'sharp') === 'sharp',
    nodeHeight: n.nodeHeight ?? null,
    naturalY: Math.round((n.nodeNaturalY ?? n.position.y) + offsetY),
    searchText: [n.title, n.content ?? '', n.original?.text ?? ''].join(' ').toLowerCase(),
  })))
  const edgeData = JSON.stringify(graph.edges.map(e => ({
    source: e.source, target: e.target, type: e.type, label: e.label || '',
  })))
  const source = graph.source ? `${escHtml(graph.source.authors)} · ${escHtml(graph.source.venue)}` : ''

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
#tb-source{opacity:.5;font-size:11px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tb-sel{opacity:.7;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0066cc}
button{background:#fff;color:#1a1a1a;border:1px solid #c0c0c0;border-radius:3px;padding:2px 10px;font-size:11px;cursor:pointer;flex-shrink:0}
button:hover{background:#e8e8e8;border-color:#aaa}
.tb-sep{width:1px;height:14px;background:#d4d4d4;flex-shrink:0}
#viewport{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;cursor:grab;}
#viewport.pan-drag{cursor:grabbing}
#canvas{position:absolute;transform-origin:0 0}
#wire-svg{position:absolute;top:0;left:0;width:10000px;height:10000px;pointer-events:none;overflow:visible}
.ng-node{position:absolute;min-width:432px;background:color-mix(in srgb,var(--color) 10%,#ffffff);border:1px solid color-mix(in srgb,var(--color) 40%,#e0e0e0);font-size:13px;transition:box-shadow .1s,top .35s ease,left .35s ease;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ng-node.ng-selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--color) 80%,transparent),0 2px 8px rgba(0,0,0,.12)}
.ng-node.ng-dragging{opacity:.88;transition:box-shadow .1s;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:100}
.ng-header{display:flex;align-items:center;gap:6px;padding:6px 10px;cursor:default;user-select:none}
.ng-header:hover{background:rgba(0,0,0,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap;cursor:move;user-select:none}
.ng-title{flex:1;font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;cursor:pointer;user-select:none}
.ng-body{padding:8px 10px 10px;font-size:12px}
.ng-content{line-height:1.6;color:#333;white-space:pre-wrap;word-break:break-word;margin-bottom:6px}
.ng-seg{white-space:pre-wrap;word-break:break-word;line-height:1.6;color:#333}
.ng-img-wrap{margin:4px 0}
.ng-table-wrap{overflow-x:auto;margin:6px 0}
.ng-table{border-collapse:collapse;background:#fff;font-size:inherit;white-space:normal}
.ng-table th{padding:5px 10px;border:1px solid #ddd;background:#f8f9fa;font-weight:600;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word}
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
.katex{color:inherit}.katex-display{overflow-x:auto;overflow-y:hidden}.katex-html{white-space:nowrap}
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
    <span id="tb-source">${source}</span>
  </div>
  <div id="tb-row2">
    <button onclick="fitView()">Fit View</button>
    <div class="tb-sep"></div>
    <button onclick="doExpand()" title="Expand selected node + children (all if none selected)">Expand↓</button>
    <button onclick="doCollapse()" title="Collapse selected node + children (all if none selected)">Collapse↑</button>
    <div class="tb-sep"></div>
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
var HEADER_H = 36;

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

function applyFold(nodeIds, expand) {
  nodeIds.forEach(function(id) {
    var el = document.getElementById('node-' + id);
    if (!el) return;
    var body = el.querySelector('.ng-body');
    var chevron = el.querySelector('.ng-chevron');
    if (body) body.style.display = expand ? '' : 'none';
    if (chevron) chevron.textContent = expand ? '▲' : '▼';
    syncMinHeight(el, expand);
    for (var i = 0; i < NODES_DATA.length; i++) {
      if (NODES_DATA[i].id === id) { NODES_DATA[i].contentExpanded = expand; break; }
    }
  });
  setTimeout(recomputePositions, 0);
}

// Recompute positions when <details> toggles change node height.
// 'toggle' does not bubble so we use capture phase.
canvas.addEventListener('toggle', function() {
  setTimeout(recomputePositions, 0);
}, true);

// Toolbar: context-aware expand/collapse
function doExpand() {
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
function doCollapse() {
  if (selectedNodeId) {
    applyFold([selectedNodeId].concat(getAllDescendants(selectedNodeId)), false);
  } else {
    applyFold(NODES_DATA.map(function(n){return n.id;}), false);
  }
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
    // 드롭된 렌더 좌표를 그대로 저장 — 밀려있던 노드에 delta를 더하면 드롭 위치와 어긋남
    if (moved) { lastWasDrag = true; if (nodeDatum) { nodeDatum.lx = left0 + finalDX; nodeDatum.ly = top0 + finalDY; nodeDatum.naturalY = nodeDatum.ly; } setTimeout(recomputePositions, 0); }
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function recomputePositions() {
  // Canvas.tsx의 computeRenderPositions와 동일한 알고리즘 (vanilla JS 버전)
  // main/sub 구분 없이 X 컬럼 단위로 묶어 그리디 패킹 → unfold 시 push-down, fold 시 pull-up

  var nodeMap = {};
  NODES_DATA.forEach(function(n) { nodeMap[n.id] = n; });

  function getH(n) {
    var el = document.getElementById('node-' + n.id);
    if (el) return el.offsetHeight;
    // DOM 미존재 fallback: 접힌 노드는 항상 헤더 높이
    return n.contentExpanded ? (n.nodeHeight || HEADER_H) : HEADER_H;
  }
  function getW(n) {
    var el = document.getElementById('node-' + n.id);
    return el ? el.offsetWidth : (n.nodeWidth || 432);
  }
  function isConn(aId, bId) {
    var a = nodeMap[aId], b = nodeMap[bId];
    if (!a || !b) return false;
    if ((a.children && a.children.indexOf(bId) !== -1) || (b.children && b.children.indexOf(aId) !== -1)) return true;
    return EDGES.some(function(e) {
      return (e.source === aId && e.target === bId) || (e.source === bId && e.target === aId);
    });
  }

  // union-find: X 범위가 겹치는 노드끼리 같은 컬럼으로 묶기
  var par = {};
  NODES_DATA.forEach(function(n) { par[n.id] = n.id; });
  function find(id) { if (par[id] !== id) par[id] = find(par[id]); return par[id]; }
  for (var i = 0; i < NODES_DATA.length; i++) {
    for (var j = i + 1; j < NODES_DATA.length; j++) {
      var a = NODES_DATA[i], b = NODES_DATA[j];
      if (a.lx < b.lx + getW(b) && b.lx < a.lx + getW(a)) {
        var ra = find(a.id), rb = find(b.id);
        if (ra !== rb) par[ra] = rb;
      }
    }
  }
  var colMap = {};
  NODES_DATA.forEach(function(n) {
    var root = find(n.id);
    if (!colMap[root]) colMap[root] = [];
    colMap[root].push(n);
  });

  // 컬럼을 min X 오름차순(왼→오)으로 정렬
  var columns = Object.keys(colMap).map(function(k) { return colMap[k]; }).sort(function(a, b) {
    var minXA = Math.min.apply(null, a.map(function(n) { return n.lx; }));
    var minXB = Math.min.apply(null, b.map(function(n) { return n.lx; }));
    return minXA - minXB;
  });

  var renderY = {};

  // 이미 팩킹된 왼쪽 컬럼의 연결 노드 기준으로 effectiveOriginY 계산
  function getEffY(node) {
    var effY = node.ly;
    NODES_DATA.forEach(function(other) {
      if (renderY[other.id] === undefined) return;
      if (!isConn(node.id, other.id)) return;
      var otherRY = renderY[other.id];
      var otherH = getH(other);
      var otherBottom = otherRY + otherH;
      var otherPush = Math.max(0, otherRY - other.ly);
      if (otherH > HEADER_H && otherBottom > node.ly) {
        // 확장된 노드가 이 노드 위치를 덮음 → bottom 아래로 (펼침 여백 48px)
        effY = Math.max(effY, otherBottom + 48);
      } else {
        // 접힌 상태: Y 이동 delta만 전파
        effY = Math.max(effY, node.ly + otherPush);
      }
    });
    return effY;
  }

  // 컬럼별 그리디 패킹 (왼→오)
  columns.forEach(function(col) {
    // effectiveOriginY를 팩킹 전에 모두 계산 (팩킹 중 renderY 변경 영향 차단)
    var effYMap = {};
    col.forEach(function(n) { effYMap[n.id] = getEffY(n); });

    // effectiveOriginY 오름차순 정렬, 동률이면 originalY 기준
    col.sort(function(a, b) {
      var ea = effYMap[a.id], eb = effYMap[b.id];
      return ea !== eb ? ea - eb : a.ly - b.ly;
    });

    // gap 규칙은 실제 X범위가 겹치는(pairwise) 노드끼리만 적용
    // — 체인으로만 같은 컬럼에 묶인 먼 노드가 밀어내지 않도록
    // 적응형 gap: 둘 다 접힘 → 촘촘(20/30), 한쪽이라도 펼침 → 48px (가독성)
    var placed = [];
    col.forEach(function(node) {
      var h = getH(node);
      var baseGap = node.isMain ? 20 : 30;
      var y = effYMap[node.id];
      var moved = true;
      while (moved) {
        moved = false;
        for (var pi = 0; pi < placed.length; pi++) {
          var p = placed[pi];
          var overlapX = node.lx < p.node.lx + getW(p.node) && p.node.lx < node.lx + getW(node);
          if (!overlapX) continue;
          var gap = (h > HEADER_H || p.h > HEADER_H) ? 48 : baseGap;
          if (y < p.y + p.h + gap && y + h + gap > p.y) {
            y = p.y + p.h + gap;
            moved = true;
          }
        }
      }
      renderY[node.id] = y;
      placed.push({ node: node, y: y, h: h });
    });
  });

  // Pass 3: line 엣지 버스 그룹 Y 정규화 (gap 30px)
  var lineBySource = {};
  EDGES.forEach(function(e) {
    if (e.type !== 'line') return;
    if (!lineBySource[e.source]) lineBySource[e.source] = [];
    lineBySource[e.source].push(e.target);
  });
  Object.keys(lineBySource).forEach(function(srcId) {
    var targetIds = lineBySource[srcId].filter(function(id) { return nodeMap[id]; });
    if (targetIds.length < 2) return;
    var xGroups = [];
    targetIds.forEach(function(id) {
      var el = document.getElementById('node-' + id);
      var nx = nodeMap[id].lx; var nw = el ? el.offsetWidth : 300;
      var placed = false;
      for (var gi = 0; gi < xGroups.length; gi++) {
        var firstId = xGroups[gi][0];
        var fEl = document.getElementById('node-' + firstId);
        var fx = nodeMap[firstId].lx; var fw = fEl ? fEl.offsetWidth : 300;
        if (nx < fx + fw && fx < nx + nw) { xGroups[gi].push(id); placed = true; break; }
      }
      if (!placed) xGroups.push([id]);
    });
    xGroups.forEach(function(grp) {
      if (grp.length < 2) return;
      var grpSorted = grp.map(function(id) {
        var el = document.getElementById('node-' + id);
        return { id: id, y: renderY[id] !== undefined ? renderY[id] : nodeMap[id].ly, h: el ? el.offsetHeight : HEADER_H };
      }).sort(function(a, b) { return a.y - b.y; });
      for (var i = 1; i < grpSorted.length; i++) {
        var minY = grpSorted[i-1].y + grpSorted[i-1].h + 30;
        var newY = Math.max(grpSorted[i].y, minY);
        grpSorted[i].y = newY;
        renderY[grpSorted[i].id] = newY;
      }
    });
  });

  // Pass 4: 가로 간격 확보 — 노드 단위 X-패킹 (Y-패킹을 90° 회전한 그리디)
  // 세로로 겹치는 두 노드가 가로로 H_GAP 이내로 붙으면 오른쪽 노드를 밀어냄
  var H_GAP = 60;
  var renderX = {};
  var byX = NODES_DATA.slice().sort(function(a, b) { return a.lx - b.lx; });
  byX.forEach(function(node) {
    var ny = renderY[node.id] !== undefined ? renderY[node.id] : node.ly;
    var nH = getH(node);
    var nW = getW(node);
    var x = node.lx;
    var moved = true;
    while (moved) {
      moved = false;
      for (var oi = 0; oi < byX.length; oi++) {
        var other = byX[oi];
        var ox = renderX[other.id];  // 이미 배치된(왼쪽부터 처리) 노드만 존재
        if (ox === undefined || other.id === node.id) continue;
        var oy = renderY[other.id] !== undefined ? renderY[other.id] : other.ly;
        if (!(ny < oy + getH(other) && oy < ny + nH)) continue;
        if (x < ox + getW(other) + H_GAP && ox < x + nW + H_GAP) {
          x = ox + getW(other) + H_GAP;
          moved = true;
        }
      }
    }
    renderX[node.id] = x;
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
function svgLine(x1,y1,x2,y2,stroke,sw){var l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);l.setAttribute('stroke',stroke);l.setAttribute('stroke-width',sw);return l;}
function svgCirc(cx,cy,r,fill){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r',r);c.setAttribute('fill',fill);return c;}
function drawEdges(fast) {
  var svg=document.getElementById('wire-svg');
  svg.querySelectorAll('.ng-eg').forEach(function(el){el.remove();});

  // Group line edges by source for bus routing
  var lineBySource={};
  EDGES.forEach(function(e){
    if(e.type!=='line') return;
    if(!lineBySource[e.source]) lineBySource[e.source]=[];
    lineBySource[e.source].push(e);
  });

  var busDrawn={};

  // Bus routing: one source → multiple line targets all on the same side (right)
  Object.keys(lineBySource).forEach(function(srcId){
    var group=lineBySource[srcId];
    if(group.length<2) return;
    var srcEl=document.getElementById('node-'+srcId);
    if(!srcEl) return;
    var sr=getNodeRect(srcEl);
    var targets=[];
    group.forEach(function(e){
      var tEl=document.getElementById('node-'+e.target);
      if(!tEl) return;
      targets.push({e:e,r:getNodeRect(tEl)});
    });
    if(targets.length<2) return;
    // 모든 타겟의 왼쪽 끝이 source 오른쪽 끝 + 40px 이상일 때만 bus (에디터와 조건 통일)
    var allRight=targets.every(function(t){return t.r.x>sr.x+sr.w+40;});
    if(!allRight) return;

    var busX=sr.x+sr.w+Math.min.apply(null,targets.map(function(t){return t.r.x-(sr.x+sr.w);})) * 0.5;
    var srcAnchorY=sr.cy;
    var minTY=Math.min.apply(null,targets.map(function(t){return t.r.cy;}));
    var maxTY=Math.max.apply(null,targets.map(function(t){return t.r.cy;}));
    var busMinY=Math.min(srcAnchorY,minTY);
    var busMaxY=Math.max(srcAnchorY,maxTY);

    // 세대 하이라이트: 루트가 source거나 타겟 중 하나면 트렁크(공용 구간)도 빨간색
    var srcSel=srcId===genRootId;
    var groupHl=srcSel||targets.some(function(t){return t.e.target===genRootId;});
    var trunkColor=groupHl?'#ef4444':'#888', trunkW=groupHl?'2.5':'1.5';

    var g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');
    g.appendChild(svgLine(sr.x+sr.w,srcAnchorY,busX,srcAnchorY,trunkColor,trunkW));
    g.appendChild(svgLine(busX,busMinY,busX,busMaxY,trunkColor,trunkW));
    g.appendChild(svgCirc(sr.x+sr.w,srcAnchorY,4,trunkColor));
    targets.forEach(function(t){
      var tHl=srcSel||t.e.target===genRootId;
      var branchColor=tHl?'#ef4444':'#888';
      g.appendChild(svgLine(busX,t.r.cy,t.r.x,t.r.cy,branchColor,tHl?'2.5':'1.5'));
      g.appendChild(svgCirc(t.r.x,t.r.cy,4,branchColor));
      busDrawn[t.e.source+'-'+t.e.target]=true;
    });
    svg.appendChild(g);
  });

  // 노드 rect 캐시 (엣지 라우팅 장애물 검사용 — drawEdges 1회당 1회만 DOM 조회)
  var rectById={};
  NODES_DATA.forEach(function(n){
    var el=document.getElementById('node-'+n.id);
    if(el) rectById[n.id]=getNodeRect(el);
  });

  // 같은 source에서 나가거나 같은 target으로 모이는 비-버스 엣지 분산 오프셋 (합산)
  var spreadByIdx={};
  (function(){
    var bySrc={},byTgt={};
    EDGES.forEach(function(e,idx){
      if(busDrawn[e.source+'-'+e.target]) return;
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

  // 그리드 A* 전역 라우팅 — 드래그 중(fast)에는 스킵하고 경량 휴리스틱 사용.
  // 레이아웃이 바뀌지 않은 재호출(하이라이트 색만 변경 등)은 캐시를 재사용해 즉시 처리
  var gridRoutes=null;
  if(!fast){
    if(routesDirty||!cachedRoutes){
      var reqs=[];
      EDGES.forEach(function(e,idx){
        if(busDrawn[e.source+'-'+e.target]) return;
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

  // Remaining edges: obstacle-avoiding curves
  EDGES.forEach(function(edge,edgeIdx){
    if(busDrawn[edge.source+'-'+edge.target]) return;
    var sr2=rectById[edge.source], tr2=rectById[edge.target];
    if(!sr2||!tr2) return;
    var ports=getBestPorts(sr2,tr2);
    if(!ports) return;
    var sp=ports.sp.p,spD=DIR[ports.sp.name],tp=ports.tp.p,tpD=DIR[ports.tp.name];
    var srcP={x:sp[0],y:sp[1]},tgtP={x:tp[0],y:tp[1]};
    var ddl=dlen(srcP,tgtP)||1;
    var nx=-(tgtP.y-srcP.y)/ddl, nyv=(tgtP.x-srcP.x)/ddl;
    var spread=spreadByIdx[edgeIdx]||0;
    var gridPts=gridRoutes?gridRoutes[String(edgeIdx)]:null;
    var d;
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
    // 세대 하이라이트: 루트 노드와 직접 연결된 wire는 빨간색
    var hl=genRootId&&(edge.source===genRootId||edge.target===genRootId);
    var strokeColor=hl?'#ef4444':'#666';
    var g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');
    var path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',strokeColor);path.setAttribute('stroke-width',hl?'2.5':'1.5');
    if(edge.type==='arrow') path.setAttribute('marker-end',hl?'url(#arrow-hl)':'url(#arrow)');
    g.appendChild(path);
    if(edge.type==='line'){[sp,tp].forEach(function(pt){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',pt[0]);c.setAttribute('cy',pt[1]);c.setAttribute('r','4');c.setAttribute('fill',strokeColor);g.appendChild(c);});}
    svg.appendChild(g);
  });
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
function doSearch(q){
  clearSearchHighlights();
  searchSelectedId=null;kbIdx=-1;
  var query=q.trim().toLowerCase();
  if(!query){document.getElementById('search-count').textContent='';closeDropdown();searchMatchNodes=[];return;}
  searchMatchNodes=NODES_DATA.filter(function(n){return n.searchText&&n.searchText.indexOf(query)!==-1;});
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
      if(!datum.contentExpanded){body.style.display='';datum.contentExpanded=true;}
    } else {
      if(datum.contentExpanded){body.style.display='none';datum.contentExpanded=false;}
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

window.addEventListener('load', function() {
  // Render KaTeX first so node heights are accurate
  initKatex();
  recomputePositions();
  drawEdges();
  fitView();
  // Recompute after images load (base64 images also finalize height asynchronously)
  var imgs = Array.from(document.querySelectorAll('.ng-node img'));
  var pending = imgs.filter(function(img) { return !img.complete; }).length;
  if (pending === 0) return;
  function onImgSettle() {
    pending--;
    if (pending <= 0) { recomputePositions(); drawEdges(); }
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
