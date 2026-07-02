import { NodeGraph, GraphNode, NodeTemplate } from '../webview/types/graph'

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderNodeCard(
  node: GraphNode,
  template: NodeTemplate | undefined,
  offsetX: number,
  offsetY: number,
  imageData: Record<string, string>,
): string {
  const color = template?.color ?? '#888'
  const borderRadius = template?.shape === 'rounded' ? '12px' : '2px'
  const label = escHtml(template?.label ?? node.template)
  const nx = Math.round(node.position.x + offsetX)
  const ny = Math.round(node.position.y + offsetY)

  let bodyHtml = ''
  if (node.content) {
    bodyHtml += `<div class="ng-content">${escHtml(node.content).replace(/\n/g, '<br>')}</div>`
  }
  if (node.images.length) {
    bodyHtml += `<div class="ng-images">${node.images.map(img => {
      const src = imageData[img.filename]
      if (!src) return `<div class="ng-img-missing">${escHtml(img.filename)}</div>`
      return `<img class="ng-img" src="${src}" alt="${escHtml(img.caption || img.filename)}" onclick="showLightbox(this.src)" title="클릭하여 확대">`
    }).join('')}</div>`
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

  return `<div class="ng-node" id="node-${escHtml(node.id)}"${childrenAttr} style="--color:${color};border-radius:${borderRadius};left:${nx}px;top:${ny}px">
  <div class="ng-header" onclick="toggleNode(this)" onmousedown="onNodeHeaderMousedown(event,this.parentNode)" title="클릭: 이 노드+하위 접기/펼치기">
    <span class="ng-tag" style="background:color-mix(in srgb,${color} 22%,transparent);color:${color}">${label}</span>
    <span class="ng-title">${escHtml(node.title)}</span>
    ${hasBody ? `<span class="ng-chevron">${node.contentExpanded ? '▲' : '▼'}</span>` : ''}
  </div>
  ${hasBody ? `<div class="ng-body"${bodyDisplay}>${bodyHtml}</div>` : ''}
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

  // Logical positions and children hierarchy for JS
  const nodesData = JSON.stringify(graph.nodes.map(n => ({
    id: n.id,
    lx: Math.round(n.position.x + offsetX),
    ly: Math.round(n.position.y + offsetY),
    children: n.children ?? [],
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
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1a1a1a;color:#ccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;height:100vh}
#toolbar{position:fixed;top:0;left:0;right:0;height:36px;background:#252526;border-bottom:1px solid #3c3c3c;display:flex;align-items:center;gap:8px;padding:0 12px;z-index:200;font-size:12px}
#tb-title{font-weight:600;color:#eee;margin-right:8px}
#tb-source{opacity:.45;font-size:11px}
button{background:#0e639c;color:#fff;border:none;border-radius:3px;padding:3px 10px;font-size:11px;cursor:pointer}
button:hover{background:#1177bb}
#viewport{position:fixed;top:36px;left:0;right:0;bottom:0;overflow:hidden;cursor:grab}
#viewport.pan-drag{cursor:grabbing}
#canvas{position:absolute;transform-origin:0 0}
#wire-svg{position:absolute;top:0;left:0;width:10000px;height:10000px;pointer-events:none;overflow:visible}
.ng-node{position:absolute;width:260px;background:color-mix(in srgb,var(--color) 12%,#1a1a1a);border:1px solid color-mix(in srgb,var(--color) 35%,transparent);font-size:13px}
.ng-node.ng-dragging{opacity:.88}
.ng-header{display:flex;align-items:center;gap:6px;padding:6px 10px;cursor:grab;user-select:none}
.ng-header:hover{background:rgba(255,255,255,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap}
.ng-title{flex:1;font-size:13px;font-weight:500;color:#e8e8e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ng-chevron{font-size:9px;opacity:.5;flex-shrink:0}
.ng-body{padding:8px 10px 10px;font-size:12px}
.ng-content{line-height:1.6;color:#c8c8c8;white-space:pre-wrap;word-break:break-word;margin-bottom:6px}
.ng-images{margin-top:6px;display:flex;flex-direction:column;gap:6px}
.ng-img{max-width:100%;border-radius:3px;border:1px solid rgba(128,128,128,.2);display:block;cursor:zoom-in}
.ng-img-missing{font-size:10px;opacity:.4;padding:3px 6px;background:rgba(128,128,128,.1);border-radius:3px}
details.ng-original{margin-top:6px}
details.ng-original summary{cursor:pointer;opacity:.7;list-style:none;padding:2px 0;user-select:none}
details.ng-original summary::-webkit-details-marker{display:none}
.ng-loc{opacity:.55;font-size:10px;margin-left:4px}
.ng-orig-text{margin-top:4px;padding:5px 7px;background:rgba(128,128,128,.08);border-radius:3px;font-style:italic;line-height:1.5;color:#b0b0b0;white-space:pre-wrap;word-break:break-word;font-size:11px}
details.ng-toggle{margin-top:3px}
details.ng-toggle summary{cursor:pointer;list-style:none;padding:2px 0;user-select:none}
details.ng-toggle summary::-webkit-details-marker{display:none}
.ng-toggle-body{padding-left:12px;padding-top:3px;line-height:1.6;color:#c8c8c8;white-space:pre-wrap;word-break:break-word}
.ng-links{margin-top:6px;display:flex;flex-direction:column;gap:2px}
.ng-link{color:#4fc1ff;text-decoration:none;font-size:11px;opacity:.85}
.ng-link:hover{opacity:1;text-decoration:underline}
/* Lightbox */
#lightbox{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.88);align-items:center;justify-content:center;cursor:zoom-out}
#lightbox.active{display:flex}
#lightbox img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;box-shadow:0 4px 32px rgba(0,0,0,.6);cursor:default}
#lightbox-close{position:absolute;top:16px;right:20px;color:#fff;font-size:22px;opacity:.7;cursor:pointer;user-select:none}
</style>
</head>
<body>
<div id="toolbar">
  <span id="tb-title">${escHtml(graph.title)}</span>
  <span id="tb-source">${source}</span>
  <button onclick="fitView()">Fit View</button>
  <button onclick="expandAll()">전체 펼치기↓</button>
  <button onclick="collapseAll()">전체 접기↑</button>
  <span style="margin-left:auto;opacity:.35;font-size:10px">헤더 드래그: 노드이동 · 배경 드래그: 화면이동 · 스크롤: 줌 · 헤더 클릭: 하위 접기/펼치기</span>
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
<!-- Lightbox -->
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">✕</span>
</div>
<script>
var NODES_DATA = ${nodesData};
var EDGES = ${edgeData};
var HEADER_H = 36;

// Pan/zoom
var vp = document.getElementById('viewport');
var canvas = document.getElementById('canvas');
var tx = 0, ty = 0, scale = 1;
function applyTransform() {
  canvas.style.transform = 'translate('+tx+'px,'+ty+'px) scale('+scale+')';
}

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

var panState = null;
vp.addEventListener('mousedown', function(e) {
  if (e.target.closest('.ng-node')) return;
  panState = { sx: e.clientX - tx, sy: e.clientY - ty };
  vp.classList.add('pan-drag');
});
window.addEventListener('mousemove', function(e) {
  if (!panState) return;
  tx = e.clientX - panState.sx;
  ty = e.clientY - panState.sy;
  applyTransform();
});
window.addEventListener('mouseup', function() {
  panState = null;
  vp.classList.remove('pan-drag');
});

// Recompute rendered positions based on logical positions + expanded heights above
function recomputePositions() {
  NODES_DATA.forEach(function(n) {
    var el = document.getElementById('node-' + n.id);
    if (!el) return;
    var yOff = 0;
    NODES_DATA.forEach(function(other) {
      if (other.id === n.id || other.ly >= n.ly) return;
      var otherEl = document.getElementById('node-' + other.id);
      if (!otherEl) return;
      var body = otherEl.querySelector('.ng-body');
      if (body && body.style.display !== 'none') {
        yOff += Math.max(0, otherEl.offsetHeight - HEADER_H);
      }
    });
    el.style.left = n.lx + 'px';
    el.style.top = (n.ly + yOff) + 'px';
  });
  drawEdges();
}

// Per-node drag
var lastWasDrag = false;
function onNodeHeaderMousedown(e, nodeEl) {
  e.stopPropagation();
  lastWasDrag = false;
  var x0 = e.clientX, y0 = e.clientY;
  var left0 = parseFloat(nodeEl.style.left) || 0;
  var top0  = parseFloat(nodeEl.style.top)  || 0;
  var moved = false;
  var finalDX = 0, finalDY = 0;
  var nodeId = nodeEl.id.replace('node-', '');
  var nodeDatum = null;
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) { nodeDatum = NODES_DATA[i]; break; }
  }

  function onMove(ev) {
    var dx = (ev.clientX - x0) / scale;
    var dy = (ev.clientY - y0) / scale;
    if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      moved = true;
      nodeEl.classList.add('ng-dragging');
    }
    if (moved) {
      nodeEl.style.left = (left0 + dx) + 'px';
      nodeEl.style.top  = (top0  + dy) + 'px';
      finalDX = dx; finalDY = dy;
      drawEdges();
    }
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    nodeEl.classList.remove('ng-dragging');
    if (moved) {
      lastWasDrag = true;
      if (nodeDatum) {
        nodeDatum.lx += finalDX;
        nodeDatum.ly += finalDY;
      }
      setTimeout(recomputePositions, 0);
    }
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// Get all descendant node IDs (recursive)
function getAllDescendants(nodeId) {
  var result = [];
  var datum = null;
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) { datum = NODES_DATA[i]; break; }
  }
  if (!datum || !datum.children || !datum.children.length) return result;
  datum.children.forEach(function(childId) {
    result.push(childId);
    getAllDescendants(childId).forEach(function(d) { result.push(d); });
  });
  return result;
}

// Toggle node body + all descendants; recompute positions after
function toggleNode(hdr) {
  if (lastWasDrag) { lastWasDrag = false; return; }
  var nodeEl = hdr.parentNode;
  var body = hdr.nextElementSibling;
  if (!body) return;
  var chevron = hdr.querySelector('.ng-chevron');
  var expanding = body.style.display === 'none';

  // Toggle this node
  body.style.display = expanding ? '' : 'none';
  if (chevron) chevron.textContent = expanding ? '▲' : '▼';

  // Cascade to all descendants
  var nodeId = nodeEl.id.replace('node-', '');
  getAllDescendants(nodeId).forEach(function(childId) {
    var childEl = document.getElementById('node-' + childId);
    if (!childEl) return;
    var childBody = childEl.querySelector('.ng-body');
    if (childBody) {
      childBody.style.display = expanding ? '' : 'none';
    }
    var childChevron = childEl.querySelector('.ng-chevron');
    if (childChevron) childChevron.textContent = expanding ? '▲' : '▼';
  });

  setTimeout(recomputePositions, 0);
}

function expandAll() {
  document.querySelectorAll('.ng-body').forEach(function(b) {
    b.style.display = '';
    var c = b.previousElementSibling && b.previousElementSibling.querySelector('.ng-chevron');
    if (c) c.textContent = '▲';
  });
  setTimeout(recomputePositions, 0);
}
function collapseAll() {
  document.querySelectorAll('.ng-body').forEach(function(b) {
    b.style.display = 'none';
    var c = b.previousElementSibling && b.previousElementSibling.querySelector('.ng-chevron');
    if (c) c.textContent = '▼';
  });
  setTimeout(recomputePositions, 0);
}

// Lightbox
function showLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.getElementById('lightbox-img').src = '';
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLightbox();
});

// Edge drawing — uses actual DOM bounding boxes
function getNodeRect(el) {
  var x = parseFloat(el.style.left) || 0;
  var y = parseFloat(el.style.top)  || 0;
  var w = el.offsetWidth, h = el.offsetHeight;
  return { x: x, y: y, w: w, h: h, cx: x + w * 0.5, cy: y + h * 0.5 };
}

function getBestPorts(sr, tr) {
  var sp = [
    { name: 'right',  p: [sr.x + sr.w, sr.cy] },
    { name: 'left',   p: [sr.x,         sr.cy] },
    { name: 'bottom', p: [sr.cx, sr.y + sr.h]  },
    { name: 'top',    p: [sr.cx, sr.y]          }
  ];
  var tp = [
    { name: 'left',   p: [tr.x,         tr.cy] },
    { name: 'right',  p: [tr.x + tr.w,  tr.cy] },
    { name: 'top',    p: [tr.cx, tr.y]          },
    { name: 'bottom', p: [tr.cx, tr.y + tr.h]  }
  ];
  var best = null, bestD = Infinity;
  for (var i = 0; i < sp.length; i++) {
    for (var j = 0; j < tp.length; j++) {
      var dx = sp[i].p[0] - tp[j].p[0], dy = sp[i].p[1] - tp[j].p[1];
      var d = dx*dx + dy*dy;
      if (d < bestD) { bestD = d; best = { sp: sp[i], tp: tp[j] }; }
    }
  }
  return best;
}

var DIR = { right: [1,0], left: [-1,0], bottom: [0,1], top: [0,-1] };

function drawEdges() {
  var svg = document.getElementById('wire-svg');
  svg.querySelectorAll('.ng-eg').forEach(function(el) { el.remove(); });

  EDGES.forEach(function(edge) {
    var srcEl = document.getElementById('node-' + edge.source);
    var tgtEl = document.getElementById('node-' + edge.target);
    if (!srcEl || !tgtEl) return;

    var sr = getNodeRect(srcEl), tr = getNodeRect(tgtEl);
    var ports = getBestPorts(sr, tr);
    if (!ports) return;

    var sp = ports.sp.p, spD = DIR[ports.sp.name];
    var tp = ports.tp.p, tpD = DIR[ports.tp.name];
    var dist = Math.sqrt(Math.pow(tp[0]-sp[0],2) + Math.pow(tp[1]-sp[1],2));
    var bend = Math.min(dist * 0.45, 150);
    var cx1 = sp[0] + spD[0]*bend, cy1 = sp[1] + spD[1]*bend;
    var cx2 = tp[0] + tpD[0]*bend, cy2 = tp[1] + tpD[1]*bend;
    var d = 'M'+sp[0]+','+sp[1]+' C'+cx1+','+cy1+' '+cx2+','+cy2+' '+tp[0]+','+tp[1];

    var g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');

    var path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', d);
    path.setAttribute('fill','none');
    path.setAttribute('stroke','#666');
    path.setAttribute('stroke-width','1.5');
    if (edge.type === 'arrow') path.setAttribute('marker-end','url(#arrow)');
    g.appendChild(path);

    if (edge.type === 'line') {
      [sp, tp].forEach(function(pt) {
        var c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx', pt[0]); c.setAttribute('cy', pt[1]);
        c.setAttribute('r','4'); c.setAttribute('fill','#666');
        g.appendChild(c);
      });
    }

    if (edge.label) {
      var mx = 0.125*sp[0] + 0.375*cx1 + 0.375*cx2 + 0.125*tp[0];
      var my = 0.125*sp[1] + 0.375*cy1 + 0.375*cy2 + 0.125*tp[1];
      var txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', mx); txt.setAttribute('y', my - 6);
      txt.setAttribute('fill','#aaa'); txt.setAttribute('font-size','11');
      txt.setAttribute('text-anchor','middle');
      txt.textContent = edge.label;
      g.appendChild(txt);
    }

    svg.appendChild(g);
  });
}

function fitView() {
  var nodes = document.querySelectorAll('.ng-node');
  if (!nodes.length) return;
  var minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  nodes.forEach(function(n) {
    var x = parseFloat(n.style.left)||0, y = parseFloat(n.style.top)||0;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + n.offsetWidth);
    maxY = Math.max(maxY, y + n.offsetHeight);
  });
  var rect = vp.getBoundingClientRect();
  var W = rect.width, H = rect.height;
  var cw = maxX - minX + 80, ch = maxY - minY + 80;
  scale = Math.min(W / cw, H / ch, 1.5);
  tx = (W - cw * scale) / 2 - (minX - 40) * scale;
  ty = (H - ch * scale) / 2 - (minY - 40) * scale;
  applyTransform();
}

window.addEventListener('load', function() {
  recomputePositions();
  drawEdges();
  fitView();
});
</script>
</body>
</html>`
}
