import { NodeGraph, GraphNode, NodeTemplate } from '../webview/types/graph'

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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

// Text → HTML: parse [[IMG:filename|WxH]] tokens; LaTeX delimiters are left as-is for KaTeX auto-render
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
      ? `<img class="ng-img${sizeAttr ? ' ng-img-sized' : ''}" src="${src}"${sizeAttr} alt="${escHtml(filename)}" onclick="showLightbox(this.src)" title="Click to enlarge">`
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
    bodyHtml += `<details class="ng-toggle"${t.expanded ? ' open' : ''}><summary>${escHtml(t.title || '(untitled)')}</summary>
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

  // Compute required min-width from [[IMG:...:WxH]] tokens (mirrors NodeCard.tsx autoMinWidth logic)
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
#tb-row2{display:flex;align-items:center;gap:6px;padding:3px 12px 4px}
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
.ng-node{position:absolute;min-width:220px;background:color-mix(in srgb,var(--color) 10%,#ffffff);border:1px solid color-mix(in srgb,var(--color) 40%,#e0e0e0);font-size:13px;transition:box-shadow .1s,top .35s ease,left .35s ease;box-shadow:0 1px 4px rgba(0,0,0,.08)}
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
    if (label) { label.textContent = 'Selected: ' + (titleEl ? titleEl.textContent : nodeId); label.style.opacity = '0.9'; }
  } else {
    if (label) { label.textContent = 'Click a node to select'; label.style.opacity = '0.35'; }
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

// Title click = fold/unfold this node
function onTitleClick(e, titleEl) {
  e.stopPropagation();
  var nodeEl = titleEl.closest('.ng-node');
  var body = nodeEl.querySelector('.ng-body');
  if (!body) return;
  var expanding = body.style.display === 'none';
  body.style.display = expanding ? '' : 'none';
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

function recomputePositions() {
  var childToParent = {};
  NODES_DATA.forEach(function(n) {
    (n.children || []).forEach(function(childId) { childToParent[childId] = n.id; });
  });
  function getRootId(id) {
    var cur = id;
    while (childToParent[cur]) cur = childToParent[cur];
    return cur;
  }
  function isDescendantOf(descendant, ancestor) {
    var cur = descendant;
    while (childToParent[cur]) { cur = childToParent[cur]; if (cur === ancestor) return true; }
    return false;
  }
  function isDirectedConnected(sourceId, targetId) {
    return EDGES.some(function(e) { return e.source === sourceId && e.target === targetId; });
  }

  var sorted = NODES_DATA.slice().sort(function(a, b) {
    if (a.ly !== b.ly) return a.ly - b.ly;
    return a.lx - b.lx;
  });
  var renderY = {};
  var MAX_ITER = 8;

  for (var iter = 0; iter < MAX_ITER; iter++) {
    var prevSnapshot = {};
    NODES_DATA.forEach(function(n) { prevSnapshot[n.id] = renderY[n.id] !== undefined ? renderY[n.id] : n.ly; });

    // Pass 1: Y-overlap push-down
    sorted.forEach(function(node) {
      var nEl = document.getElementById('node-' + node.id);
      var nodeW = nEl ? nEl.offsetWidth : (node.nodeWidth || 300);
      var y = node.ly;

      sorted.forEach(function(other) {
        if (other.id === node.id) return;
        if (other.ly > node.ly) return;
        if (other.ly === node.ly && other.lx >= node.lx) return;

        var otherEl = document.getElementById('node-' + other.id);
        var otherW = otherEl ? otherEl.offsetWidth : (other.nodeWidth || 300);
        var otherY = renderY[other.id] !== undefined ? renderY[other.id] : other.ly;
        var otherH = otherEl ? otherEl.offsetHeight : HEADER_H;
        var otherBottom = otherY + otherH;
        if (otherBottom <= y) return;

        if (node.isMain && other.isMain) {
          // Main→Main: X 범위가 겹칠 때만 밀어냄 (다른 컬럼 cascade 방지)
          if (!(node.lx < other.lx + otherW && other.lx < node.lx + nodeW)) return;
          var naturalBottom = other.ly + (other.nodeHeight || HEADER_H);
          var delta = (otherY + otherH) - naturalBottom;
          var nodeNaturalY = node.naturalY !== undefined ? node.naturalY : node.ly;
          y = Math.max(y, nodeNaturalY + delta, otherBottom + 20);
        } else {
          // 방향 엣지 연결이면 X overlap 없어도 밀어냄
          var connected = isDirectedConnected(other.id, node.id);
          if (!connected && !(node.lx < other.lx + otherW && other.lx < node.lx + nodeW)) return;
          if (node.isMain) {
            if (isDescendantOf(other.id, node.id) && otherBottom <= node.ly) return;
            y = Math.max(y, otherBottom + 48);
          } else {
            var isSameRoot = getRootId(other.id) === getRootId(node.id);
            y = Math.max(y, otherBottom + (isSameRoot ? 30 : 48));
          }
        }
      });
      renderY[node.id] = y;
    });

    // Pass 2: 서브노드가 부모 main의 push delta만큼 따라 내려감
    NODES_DATA.forEach(function(node) {
      if (node.isMain) return;
      var parentMain = null;
      var bestDist = Infinity;
      NODES_DATA.forEach(function(m) {
        if (!m.isMain) return;
        var connected = (m.children && m.children.indexOf(node.id) !== -1) ||
          EDGES.some(function(e) {
            return (e.source === m.id && e.target === node.id) || (e.target === m.id && e.source === node.id);
          });
        if (connected) {
          var dist = Math.abs(m.ly - node.ly);
          if (dist < bestDist) { bestDist = dist; parentMain = m; }
        }
      });
      if (parentMain) {
        var parentPush = (renderY[parentMain.id] !== undefined ? renderY[parentMain.id] : parentMain.ly) - parentMain.ly;
        if (parentPush > 0) {
          var cur = renderY[node.id] !== undefined ? renderY[node.id] : node.ly;
          renderY[node.id] = Math.max(cur, node.ly + parentPush);
        }
      }
    });

    // 수렴 확인
    var converged = NODES_DATA.every(function(n) {
      var cur = renderY[n.id] !== undefined ? renderY[n.id] : n.ly;
      var prev = prevSnapshot[n.id] !== undefined ? prevSnapshot[n.id] : n.ly;
      return cur === prev;
    });
    if (converged) break;
  }

  // Pass 3: line 엣지 버스 그룹 Y 정규화 (gap 30px, 에디터와 동일)
  var lineBySource = {};
  EDGES.forEach(function(e) {
    if (e.type !== 'line') return;
    if (!lineBySource[e.source]) lineBySource[e.source] = [];
    lineBySource[e.source].push(e.target);
  });
  var ndMap = {};
  NODES_DATA.forEach(function(n) { ndMap[n.id] = n; });
  Object.keys(lineBySource).forEach(function(srcId) {
    var targetIds = lineBySource[srcId].filter(function(id) { return ndMap[id]; });
    if (targetIds.length < 2) return;
    var xGroups = [];
    targetIds.forEach(function(id) {
      var el = document.getElementById('node-' + id);
      var nx = ndMap[id].lx; var nw = el ? el.offsetWidth : 300;
      var placed = false;
      for (var gi = 0; gi < xGroups.length; gi++) {
        var firstId = xGroups[gi][0];
        var fEl = document.getElementById('node-' + firstId);
        var fx = ndMap[firstId].lx; var fw = fEl ? fEl.offsetWidth : 300;
        if (nx < fx + fw && fx < nx + nw) { xGroups[gi].push(id); placed = true; break; }
      }
      if (!placed) xGroups.push([id]);
    });
    xGroups.forEach(function(grp) {
      if (grp.length < 2) return;
      var grpSorted = grp.map(function(id) {
        var el = document.getElementById('node-' + id);
        return { id: id, y: renderY[id] !== undefined ? renderY[id] : ndMap[id].ly, h: el ? el.offsetHeight : HEADER_H };
      }).sort(function(a, b) { return a.y - b.y; });
      for (var i = 1; i < grpSorted.length; i++) {
        var minY = grpSorted[i-1].y + grpSorted[i-1].h + 30;
        var newY = Math.max(grpSorted[i].y, minY);
        grpSorted[i].y = newY;
        renderY[grpSorted[i].id] = newY;
      }
    });
  });

  NODES_DATA.forEach(function(n) {
    var el = document.getElementById('node-' + n.id);
    if (!el) return;
    el.style.left = n.lx + 'px';
    el.style.top = (renderY[n.id] !== undefined ? renderY[n.id] : n.ly) + 'px';
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
    // Check all targets are to the right
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

  // Remaining edges: Bezier curves
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
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();openSearch();return;}
  if(e.key==='Escape'){
    if(document.getElementById('search-wrap').classList.contains('open')){closeSearch();return;}
    closeLightbox();
  }
});
// Middle click: prevent X11 primary selection paste
vp.addEventListener('mousedown',function(e){if(e.button===1) e.preventDefault();});
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
  searchSelectedId=null;searchMatchNodes=[];kbIdx=-1;
  document.getElementById('search-wrap').classList.remove('open');
  document.getElementById('search-input').value='';
  document.getElementById('search-count').textContent='';
  closeDropdown();
}
function clearSearchHighlights(){
  document.querySelectorAll('.ng-search-match,.ng-search-active').forEach(function(el){el.classList.remove('ng-search-match','ng-search-active');});
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
