import { NodeGraph, GraphNode, NodeTemplate } from '../webview/types/graph'

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── 마크다운 표 파싱 (htmlExporter 전용 TypeScript 버전) ──────────────────────
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

// 텍스트 → HTML ([[IMG:filename|WxH]] 토큰 파싱, LaTeX 구분자는 그대로 유지해 KaTeX auto-render가 처리)
function renderCellHtml(cellText: string, imageData: Record<string, string>): string {
  const IMG_RE = /\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g
  let result = ''
  let lastIdx = 0
  let match: RegExpExecArray | null
  while ((match = IMG_RE.exec(cellText)) !== null) {
    if (match.index > lastIdx) result += escHtml(cellText.slice(lastIdx, match.index))
    const filename = match[1]
    const imgW = match[2]
    const imgH = match[3]
    const sizeAttr = (imgW && imgH) ? ` width="${imgW}" height="${imgH}"` : ''
    const src = imageData[filename]
    result += src
      ? `<img class="ng-img${sizeAttr ? ' ng-img-sized' : ''}" src="${src}"${sizeAttr} alt="${escHtml(filename)}" onclick="showLightbox(this.src)" title="클릭하여 확대">`
      : `<span class="ng-img-missing">${escHtml(filename)}</span>`
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < cellText.length) result += escHtml(cellText.slice(lastIdx))
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
<div class="ng-orig-text">${escHtml(node.original.text).replace(/\n/g, '<br>')}</div></details>`
  }
  for (const t of node.toggleItems ?? []) {
    bodyHtml += `<details class="ng-toggle"${t.expanded ? ' open' : ''}><summary>${escHtml(t.title || '(제목 없음)')}</summary>
<div class="ng-toggle-body">${escHtml(t.content).replace(/\n/g, '<br>')}</div></details>`
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

  // content의 [[IMG:...:WxH]] 토큰에서 필요한 최소 너비 계산 (NodeCard.tsx autoMinWidth와 동일 로직)
  const IMG_SIZE_RE = /\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g
  let maxImgW = 0
  let _m: RegExpExecArray | null
  while ((_m = IMG_SIZE_RE.exec(content)) !== null) maxImgW = Math.max(maxImgW, Number(_m[1]))
  const autoMinWidth = maxImgW > 0
    ? (hasHtmlTable(content) ? maxImgW + 280 : maxImgW + 32)
    : 0

  const extraStyle = [
    node.nodeWidth  ? `min-width:${node.nodeWidth}px`  : (autoMinWidth > 220 ? `min-width:${autoMinWidth}px` : ''),
    node.nodeHeight ? `min-height:${node.nodeHeight}px` : '',
  ].filter(Boolean).join(';')

  return `<div class="ng-node${hasTableClass}" id="node-${escHtml(node.id)}"${childrenAttr} style="--color:${color};border-radius:${borderRadius};left:${nx}px;top:${ny}px${extraStyle ? ';' + extraStyle : ''}">
  <div class="ng-header" onclick="onHeaderClick(this)" onmousedown="onNodeHeaderMousedown(event,this.parentNode)" title="클릭: 노드 선택">
    <span class="ng-tag" style="background:color-mix(in srgb,${color} 22%,transparent);color:${color}">${label}</span>
    <span class="ng-title">${escHtml(node.title)}</span>
    ${hasBody ? `<span class="ng-chevron" onclick="toggleFold(event,this.closest('.ng-header'))" title="이 노드만 접기/펼치기">${node.contentExpanded ? '▲' : '▼'}</span>` : ''}
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
  })))
  const edgeData = JSON.stringify(graph.edges.map(e => ({
    source: e.source, target: e.target, type: e.type, label: e.label || '',
  })))
  const source = graph.source ? `${escHtml(graph.source.authors)} · ${escHtml(graph.source.venue)}` : ''

  return `<!DOCTYPE html>
<html lang="ko">
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
#tb-row2{display:flex;align-items:center;gap:6px;padding:3px 12px 4px}
#tb-title{font-weight:700;color:#1a1a1a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
#tb-source{opacity:.5;font-size:11px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tb-sel{opacity:.7;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0066cc}
button{background:#fff;color:#1a1a1a;border:1px solid #c0c0c0;border-radius:3px;padding:2px 10px;font-size:11px;cursor:pointer;flex-shrink:0}
button:hover{background:#e8e8e8;border-color:#aaa}
.tb-sep{width:1px;height:14px;background:#d4d4d4;flex-shrink:0}
#viewport{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;cursor:grab}
#viewport.pan-drag{cursor:grabbing}
#canvas{position:absolute;transform-origin:0 0}
#wire-svg{position:absolute;top:0;left:0;width:10000px;height:10000px;pointer-events:none;overflow:visible}
.ng-node{position:absolute;min-width:220px;max-width:500px;overflow:hidden;background:color-mix(in srgb,var(--color) 10%,#ffffff);border:1px solid color-mix(in srgb,var(--color) 40%,#e0e0e0);font-size:13px;transition:box-shadow .1s,top .35s ease,left .35s ease;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ng-has-table{max-width:none}
.ng-node.ng-selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--color) 80%,transparent),0 2px 8px rgba(0,0,0,.12)}
.ng-node.ng-dragging{opacity:.88;transition:box-shadow .1s;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:100}
.ng-header{display:flex;align-items:center;gap:6px;padding:6px 10px;cursor:pointer;user-select:none}
.ng-header:hover{background:rgba(0,0,0,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap}
.ng-title{flex:1;font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}
.ng-chevron{font-size:9px;opacity:.5;flex-shrink:0;padding:2px 4px;border-radius:2px}
.ng-chevron:hover{background:rgba(0,0,0,.08);opacity:.9}
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
    <button onclick="doExpand()" title="선택 노드+하위 펼치기 (선택 없으면 전체)">펼치기↓</button>
    <button onclick="doCollapse()" title="선택 노드+하위 접기 (선택 없으면 전체)">접기↑</button>
    <div class="tb-sep"></div>
    <span id="tb-sel" style="opacity:.35">클릭으로 노드 선택</span>
  </div>
</div>
<div id="viewport">
  <div id="canvas">
    <svg id="wire-svg">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#666"/>
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
(function() {
  var tb = document.getElementById('toolbar');
  vp.style.top = tb.offsetHeight + 'px';
})();
var tx = 0, ty = 0, scale = 1;

function applyTransform() {
  canvas.style.transform = 'translate('+tx+'px,'+ty+'px) scale('+scale+')';
}

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
    if (label) { label.textContent = '선택: ' + (titleEl ? titleEl.textContent : nodeId); label.style.opacity = '0.9'; }
  } else {
    if (label) { label.textContent = '클릭으로 노드 선택'; label.style.opacity = '0.35'; }
  }
}

// Header click = select node
var lastWasDrag = false;
function onHeaderClick(hdr) {
  if (lastWasDrag) { lastWasDrag = false; return; }
  var nodeEl = hdr.parentNode;
  var nodeId = nodeEl.id.replace('node-', '');
  selectNode(selectedNodeId === nodeId ? null : nodeId);
}

// Chevron click = toggle this node only (no cascade, stopPropagation)
function toggleFold(e, hdr) {
  e.stopPropagation();
  var body = hdr.nextElementSibling;
  if (!body) return;
  var chevron = hdr.querySelector('.ng-chevron');
  var expanding = body.style.display === 'none';
  body.style.display = expanding ? '' : 'none';
  if (chevron) chevron.textContent = expanding ? '▲' : '▼';
  var nodeEl = hdr.parentNode;
  var nodeId = nodeEl.id.replace('node-', '');
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) { NODES_DATA[i].contentExpanded = expanding; break; }
  }
  setTimeout(recomputePositions, 0);
}

// 노드 데이터 조회
function getNodeDatum(nodeId) {
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) return NODES_DATA[i];
  }
  return null;
}

// 모든 하위 노드 수집 (접기용 — 제한 없이 전체)
function getAllDescendants(nodeId, visited) {
  visited = visited || [];
  if (visited.indexOf(nodeId) !== -1) return [];
  visited.push(nodeId);
  var result = [];
  var datum = getNodeDatum(nodeId);
  if (!datum) return result;
  // children 배열 + edges 양쪽 모두 포함
  var childIds = (datum.children || []).slice();
  EDGES.forEach(function(e) { if (e.source === nodeId && childIds.indexOf(e.target) === -1) childIds.push(e.target); });
  childIds.forEach(function(childId) {
    result.push(childId);
    getAllDescendants(childId, visited).forEach(function(d) { result.push(d); });
  });
  return result;
}

// 펼치기용 하위 노드 수집 — main_topic 자식은 건너뜀 (그 하위도 포함 안 함)
// outgoing + incoming(non-main) 양방향 edge 포함하여 다중 부모 sub-node를 지원
function getExpandDescendants(nodeId, isRoot, visited) {
  visited = visited || [];
  if (visited.indexOf(nodeId) !== -1) return [];
  visited.push(nodeId);
  var datum = getNodeDatum(nodeId);
  if (!datum) return [];
  // 직사각형(sharp/main) 자식은 포함하지 않음
  if (!isRoot && datum.isMain) return [];
  var result = [nodeId];
  var childIds = (datum.children || []).slice();
  EDGES.forEach(function(e) {
    // outgoing: 이 노드에서 나가는 edge
    if (e.source === nodeId && childIds.indexOf(e.target) === -1) childIds.push(e.target);
    // incoming from non-main: non-main 노드가 이 노드를 향하는 edge (다중 부모 sub-node 지원)
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
function applyFold(nodeIds, expand) {
  nodeIds.forEach(function(id) {
    var el = document.getElementById('node-' + id);
    if (!el) return;
    var body = el.querySelector('.ng-body');
    var chevron = el.querySelector('.ng-chevron');
    if (body) body.style.display = expand ? '' : 'none';
    if (chevron) chevron.textContent = expand ? '▲' : '▼';
    for (var i = 0; i < NODES_DATA.length; i++) {
      if (NODES_DATA[i].id === id) { NODES_DATA[i].contentExpanded = expand; break; }
    }
  });
  setTimeout(recomputePositions, 0);
}

// <details> 토글(toggle items / original) 시 노드 높이가 변하므로 화살표 재계산
// toggle 이벤트는 버블링하지 않아 capture phase 필요
canvas.addEventListener('toggle', function() {
  setTimeout(recomputePositions, 0);
}, true);

// Toolbar: context-aware expand/collapse
function doExpand() {
  if (selectedNodeId) {
    applyFold(getExpandDescendants(selectedNodeId, true), true);
  } else {
    // 전체 펼치기 — main_topic는 포함하되 그 하위 main_topic는 skip
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

// Per-node drag with logical-position tracking
function onNodeHeaderMousedown(e, nodeEl) {
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
  function onMove(ev) {
    var rawDx = ev.clientX - x0, rawDy = ev.clientY - y0;
    if (!moved && (Math.abs(rawDx) > 5 || Math.abs(rawDy) > 5)) { moved = true; nodeEl.classList.add('ng-dragging'); }
    if (moved) {
      var dx = rawDx / scale, dy = rawDy / scale;
      nodeEl.style.left=(left0+dx)+'px'; nodeEl.style.top=(top0+dy)+'px'; finalDX=dx; finalDY=dy; drawEdges();
    }
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    nodeEl.classList.remove('ng-dragging');
    if (moved) { lastWasDrag = true; if (nodeDatum) { nodeDatum.lx += finalDX; nodeDatum.ly += finalDY; nodeDatum.naturalY = nodeDatum.ly; } setTimeout(recomputePositions, 0); }
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// 노드 위치를 원래 배치 그대로 유지 — 접기/펼치기 시 다른 노드를 밀지 않음
function getNodeRootId(nodeId) {
  var childToParent = getChildToParentMap();
  var cur = nodeId;
  while (childToParent[cur]) cur = childToParent[cur];
  return cur;
}
function getChildToParentMap() {
  var map = {};
  NODES_DATA.forEach(function(n) {
    (n.children || []).forEach(function(childId) { map[childId] = n.id; });
  });
  return map;
}
function recomputePositions() {
  var childToParent = getChildToParentMap();
  function rootOf(id) {
    var cur = id;
    while (childToParent[cur]) cur = childToParent[cur];
    return cur;
  }
  function isDescendantOf(descendant, ancestor) {
    var cur = descendant;
    while (childToParent[cur]) {
      cur = childToParent[cur];
      if (cur === ancestor) return true;
    }
    return false;
  }
  var sorted = NODES_DATA.slice().sort(function(a, b) {
    if (a.ly !== b.ly) return a.ly - b.ly;
    return a.lx - b.lx;
  });
  var renderY = {};
  sorted.forEach(function(n) {
    var nIsMain = n.isMain;
    var y = n.ly;
    var nEl = document.getElementById('node-' + n.id);
    var nW = nEl ? nEl.offsetWidth : 300;
    sorted.forEach(function(other) {
      if (other.id === n.id) return;
      if (other.ly > n.ly) return;
      if (other.ly === n.ly && other.lx >= n.lx) return;
      var otherY = renderY[other.id] !== undefined ? renderY[other.id] : other.ly;
      var otherEl = document.getElementById('node-' + other.id);
      var h = otherEl ? otherEl.offsetHeight : HEADER_H;
      var otherBottom = otherY + h;
      if (otherBottom <= y) return;
      if (nIsMain && other.isMain) {
        // Main → main: always push regardless of X offset
        var naturalBottom = other.ly + (other.nodeHeight || HEADER_H);
        var delta = (otherY + h) - naturalBottom;
        var nodeNaturalY = n.naturalY !== undefined ? n.naturalY : n.ly;
        y = Math.max(y, nodeNaturalY + delta, otherBottom + 20);
      } else {
        // Rounded pushes: only if X ranges actually overlap (different columns don't push each other)
        var oW = otherEl ? otherEl.offsetWidth : 300;
        if (!(n.lx < other.lx + oW && other.lx < n.lx + nW)) return;
        if (nIsMain) {
          // Rounded → main: skip only if descendant AND doesn't actually reach this node's Y
          if (isDescendantOf(other.id, n.id) && otherBottom <= n.ly) return;
          var wasPushed = otherY > other.ly;
          if (!other.contentExpanded && !wasPushed) return;
          y = Math.max(y, otherBottom + 48);
        } else {
          var wasPushed = otherY > other.ly;
          if (!other.contentExpanded && !wasPushed) return;
          var gap = (rootOf(other.id) === rootOf(n.id)) ? 20 : 48;
          y = Math.max(y, otherBottom + gap);
        }
      }
    });
    renderY[n.id] = y;
  });

  // Pass 2: 서브노드가 부모 backbone 노드의 push delta만큼 따라 내려가도록 보정
  // 부모 main 노드가 밀려 내려갔으면 자식 서브노드도 동일 delta 적용
  NODES_DATA.forEach(function(n) {
    if (n.isMain) return;
    var parentMain = null;
    var bestDist = Infinity;
    NODES_DATA.forEach(function(m) {
      if (!m.isMain) return;
      var connected = m.children && m.children.indexOf(n.id) !== -1;
      if (!connected) {
        EDGES.some(function(e) {
          if ((e.source === m.id && e.target === n.id) || (e.target === m.id && e.source === n.id)) {
            connected = true; return true;
          }
        });
      }
      if (connected) {
        var dist = Math.abs(m.ly - n.ly);
        if (dist < bestDist) { bestDist = dist; parentMain = m; }
      }
    });
    if (parentMain) {
      var parentPush = (renderY[parentMain.id] !== undefined ? renderY[parentMain.id] : parentMain.ly) - parentMain.ly;
      if (parentPush > 0) {
        var cur = renderY[n.id] !== undefined ? renderY[n.id] : n.ly;
        renderY[n.id] = Math.max(cur, n.ly + parentPush);
      }
    }
  });

  NODES_DATA.forEach(function(n) {
    var el = document.getElementById('node-' + n.id);
    if (!el) return;
    el.style.left = n.lx + 'px';
    el.style.top  = (renderY[n.id] !== undefined ? renderY[n.id] : n.ly) + 'px';
  });
  drawEdges();
}

// Edge drawing
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
function svgLine(x1,y1,x2,y2,stroke,sw){var l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);l.setAttribute('stroke',stroke);l.setAttribute('stroke-width',sw);return l;}
function svgCirc(cx,cy,r,fill){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r',r);c.setAttribute('fill',fill);return c;}
function drawEdges() {
  var svg=document.getElementById('wire-svg');
  svg.querySelectorAll('.ng-eg').forEach(function(el){el.remove();});

  // 같은 source에서 나가는 line 엣지를 grouping → bus 라우팅 후보
  var lineBySource={};
  EDGES.forEach(function(e){
    if(e.type!=='line') return;
    if(!lineBySource[e.source]) lineBySource[e.source]=[];
    lineBySource[e.source].push(e);
  });

  var busDrawn={};

  // Bus 라우팅: source 하나 → 복수의 line 타겟이 모두 같은 방향(우측 or 좌측)일 때
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
    // 모두 오른쪽에 있는지 확인
    var allRight=targets.every(function(t){return t.r.x>=sr.x+sr.w-5;});
    if(!allRight) return;

    var busX=sr.x+sr.w+Math.min.apply(null,targets.map(function(t){return t.r.x-(sr.x+sr.w);})) * 0.5;
    var srcAnchorY=sr.cy;
    var minTY=Math.min.apply(null,targets.map(function(t){return t.r.cy;}));
    var maxTY=Math.max.apply(null,targets.map(function(t){return t.r.cy;}));
    var busMinY=Math.min(srcAnchorY,minTY);
    var busMaxY=Math.max(srcAnchorY,maxTY);

    var g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');
    g.appendChild(svgLine(sr.x+sr.w,srcAnchorY,busX,srcAnchorY,'#888','1.5'));
    g.appendChild(svgLine(busX,busMinY,busX,busMaxY,'#888','1.5'));
    g.appendChild(svgCirc(sr.x+sr.w,srcAnchorY,4,'#888'));
    targets.forEach(function(t){
      g.appendChild(svgLine(busX,t.r.cy,t.r.x,t.r.cy,'#888','1.5'));
      g.appendChild(svgCirc(t.r.x,t.r.cy,4,'#888'));
      busDrawn[t.e.source+'-'+t.e.target]=true;
    });
    svg.appendChild(g);
  });

  // 나머지 엣지: Bezier 곡선
  EDGES.forEach(function(edge){
    if(busDrawn[edge.source+'-'+edge.target]) return;
    var srcEl=document.getElementById('node-'+edge.source), tgtEl=document.getElementById('node-'+edge.target);
    if(!srcEl||!tgtEl) return;
    var ports=getBestPorts(getNodeRect(srcEl),getNodeRect(tgtEl));
    if(!ports) return;
    var sp=ports.sp.p,spD=DIR[ports.sp.name],tp=ports.tp.p,tpD=DIR[ports.tp.name];
    var dist=Math.sqrt(Math.pow(tp[0]-sp[0],2)+Math.pow(tp[1]-sp[1],2));
    var bend=Math.min(dist*.45,150);
    var cx1=sp[0]+spD[0]*bend,cy1=sp[1]+spD[1]*bend,cx2=tp[0]+tpD[0]*bend,cy2=tp[1]+tpD[1]*bend;
    var d='M'+sp[0]+','+sp[1]+' C'+cx1+','+cy1+' '+cx2+','+cy2+' '+tp[0]+','+tp[1];
    var g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');
    var path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke','#666');path.setAttribute('stroke-width','1.5');
    if(edge.type==='arrow') path.setAttribute('marker-end','url(#arrow)');
    g.appendChild(path);
    if(edge.type==='line'){[sp,tp].forEach(function(pt){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',pt[0]);c.setAttribute('cy',pt[1]);c.setAttribute('r','4');c.setAttribute('fill','#666');g.appendChild(c);});}
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
document.addEventListener('keydown',function(e){if(e.key==='Escape') closeLightbox();});

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
  // KaTeX 먼저 렌더링해야 노드 높이가 정확함
  initKatex();
  recomputePositions();
  drawEdges();
  fitView();
  // 이미지 로드 후 노드 높이 재계산 (base64 이미지도 비동기로 높이 확정됨)
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
