"use strict";var K=Object.create;var P=Object.defineProperty;var J=Object.getOwnPropertyDescriptor;var Z=Object.getOwnPropertyNames;var Q=Object.getPrototypeOf,ee=Object.prototype.hasOwnProperty;var te=(t,e)=>{for(var n in e)P(t,n,{get:e[n],enumerable:!0})},H=(t,e,n,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Z(e))!ee.call(t,i)&&i!==n&&P(t,i,{get:()=>e[i],enumerable:!(o=J(e,i))||o.enumerable});return t};var S=(t,e,n)=>(n=t!=null?K(Q(t)):{},H(e||!t||!t.__esModule?P(n,"default",{value:t,enumerable:!0}):n,t)),ne=t=>H(P({},"__esModule",{value:!0}),t);var ue={};te(ue,{activate:()=>ce,deactivate:()=>pe});module.exports=ne(ue);var M=S(require("vscode"));var l=S(require("vscode")),G=S(require("path"));var w=S(require("vscode"));function _(t){let e=w.Uri.joinPath(t,".."),n=t.path.split("/").pop()?.replace(/\.nodegraph\.json$/,"")??"graph";return w.Uri.joinPath(e,`.${n}-imgs`)}function oe(t,e,n){let o=w.Uri.joinPath(_(e),n);return t.asWebviewUri(o).toString()}var L=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;function O(t,e,n){let o={},i=a=>{a&&!o[a]&&(o[a]=oe(t,e,a))};for(let a of n.nodes){L.lastIndex=0;let p;for(;(p=L.exec(a.content??""))!==null;)i(p[1])}for(let a of n.canvasImages??[])i(a.filename);return o}async function F(t,e,n,o="png"){let i=_(e);try{await w.workspace.fs.createDirectory(i)}catch{}let a=`img_${Date.now()}.${o}`,p=w.Uri.joinPath(i,a);return await w.workspace.fs.writeFile(p,Buffer.from(n,"base64")),{filename:a,webviewUri:t.asWebviewUri(p).toString()}}async function j(t,e){let n=w.Uri.joinPath(_(t),e);try{await w.workspace.fs.delete(n)}catch{}}function f(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function T(t){return/^\s*\|/.test(t)&&t.indexOf("|",1)!==-1}function U(t){return/^\s*\|[\s\-:|]+\|\s*$/.test(t)&&!/[a-zA-Z0-9]/.test(t)}function z(t){return t.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(e=>e.trim())}function re(t){if(!t)return[{type:"text",text:"",startChar:0,endChar:0}];let e=t.split(`
`),n=[],o=0,i=0,a=p=>e[p].length+(p<e.length-1?1:0);for(;o<e.length;)if(T(e[o])&&o+1<e.length&&U(e[o+1])){let c=i,s=[];for(;o<e.length&&T(e[o]);)s.push(e[o]),i+=a(o),o++;s.length>=3?n.push({type:"table",headers:z(s[0]),rows:s.slice(2).map(z),startChar:c,endChar:i}):n.push({type:"text",text:s.join(`
`),startChar:c,endChar:i})}else{let c=i,s=[];for(;o<e.length&&!(T(e[o])&&o+1<e.length&&U(e[o+1]));)s.push(e[o]),i+=a(o),o++;n.push({type:"text",text:s.join(`
`),startChar:c,endChar:i})}return n}function R(t){let e=t.split(`
`);for(let n=0;n+1<e.length;n++)if(T(e[n])&&U(e[n+1]))return!0;return!1}function B(t,e){let n=/\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g,o="",i=0,a;for(;(a=n.exec(t))!==null;){a.index>i&&(o+=f(t.slice(i,a.index)));let p=a[1],c=a[2],s=a[3],d=c&&s?` width="${c}" height="${s}"`:"",r=e[p];o+=r?`<img class="ng-img${d?" ng-img-sized":""}" src="${r}"${d} alt="${f(p)}" onclick="showLightbox(this.src)" title="Click to enlarge">`:`<span class="ng-img-missing">${f(p)}</span>`,i=a.index+a[0].length}return i<t.length&&(o+=f(t.slice(i))),o}function ie(t,e){let n=t.headers.map(i=>`<th>${B(i,e)}</th>`).join(""),o=t.rows.map(i=>`<tr>${i.map(a=>`<td>${B(a,e)}</td>`).join("")}</tr>`).join("");return`<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${n}</tr></thead><tbody>${o}</tbody></table></div>`}function se(t,e,n,o,i){let a=e?.color??"#888",p=e?.shape==="rounded"?"22px":"2px",c=f(e?.label??t.template),s=Math.round(t.position.x+n),d=Math.round(t.position.y+o),r="",u=t.content??"";if(R(u)){let h=re(u);r+='<div class="ng-content">';for(let m of h)m.type==="table"?r+=ie(m,i):m.text&&(r+=`<div class="ng-seg">${B(m.text,i).replace(/\n/g,"<br>")}</div>`);r+="</div>"}else u&&(r+=`<div class="ng-content">${B(u,i).replace(/\n/g,"<br>")}</div>`);if(t.original){let h=f(t.original.title??"Original"),m=t.originalExpanded?" open":"";r+=`<details class="ng-original"${m}><summary>${h}${t.original.location?` <span class="ng-loc">${f(t.original.location)}</span>`:""}</summary>
<div class="ng-orig-text">${f(t.original.text).replace(/\n/g,"<br>")}</div></details>`}for(let h of t.toggleItems??[])r+=`<details class="ng-toggle"${h.expanded?" open":""}><summary>${f(h.title||"(untitled)")}</summary>
<div class="ng-toggle-body">${f(h.content).replace(/\n/g,"<br>")}</div></details>`;t.links.length&&(r+=`<div class="ng-links">${t.links.map(h=>{let m=h.type==="url"?"\u{1F517}":h.type==="pdf"?"\u{1F4C4}":h.type==="obsidian"?"\u{1F7E3}":"\u2B21";return`<a class="ng-link"${h.type==="url"||h.type==="pdf"?` href="${f(h.target)}" target="_blank"`:""}>${m} ${f(h.label||h.target)}</a>`}).join("")}</div>`);let E=!!r,b=t.contentExpanded?"":' style="display:none"',D=t.children.length?` data-children="${t.children.join(",")}"`:"",$=R(u)?" ng-has-table":"",k=/\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g,y=0,I;for(;(I=k.exec(u))!==null;)y=Math.max(y,Number(I[1]));let v=y>0?R(u)?y+280:y+32:0,g=[t.nodeWidth?`min-width:${t.nodeWidth}px`:v>220?`min-width:${v}px`:"",t.nodeHeight?`min-height:${t.nodeHeight}px`:""].filter(Boolean).join(";");return`<div class="ng-node${$}" id="node-${f(t.id)}"${D} style="--color:${a};border-radius:${p};left:${s}px;top:${d}px${g?";"+g:""}">
  <div class="ng-header" onclick="onHeaderClick(this)" onmousedown="onNodeHeaderMousedown(event,this.parentNode)" title="Click to select node">
    <span class="ng-tag" style="background:color-mix(in srgb,${a} 22%,transparent);color:${a}">${c}</span>
    <span class="ng-title">${f(t.title)}</span>
    ${E?`<span class="ng-chevron" onclick="toggleFold(event,this.closest('.ng-header'))" title="Fold / unfold this node">${t.contentExpanded?"\u25B2":"\u25BC"}</span>`:""}
  </div>
  ${E?`<div class="ng-body"${b}${t.fontSize?` style="font-size:${t.fontSize}px"`:""}>${r}</div>`:""}
</div>`}function W(t,e={}){let n=1/0,o=1/0;for(let r of t.nodes)n=Math.min(n,r.position.x),o=Math.min(o,r.position.y);isFinite(n)||(n=0,o=0);let i=-n+100,a=-o+100,p=t.nodes.map(r=>se(r,t.nodeTemplates[r.template],i,a,e)).join(`
`),c=JSON.stringify(t.nodes.map(r=>({id:r.id,lx:Math.round(r.position.x+i),ly:Math.round(r.position.y+a),children:r.children??[],template:r.template,contentExpanded:r.contentExpanded,isMain:(t.nodeTemplates[r.template]?.shape??"sharp")==="sharp",nodeHeight:r.nodeHeight??null,naturalY:Math.round((r.nodeNaturalY??r.position.y)+a)}))),s=JSON.stringify(t.edges.map(r=>({source:r.source,target:r.target,type:r.type,label:r.label||""}))),d=t.source?`${f(t.source.authors)} \xB7 ${f(t.source.venue)}`:"";return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${f(t.title)}</title>
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
.ng-node{position:absolute;min-width:220px;background:color-mix(in srgb,var(--color) 10%,#ffffff);border:1px solid color-mix(in srgb,var(--color) 40%,#e0e0e0);font-size:13px;transition:box-shadow .1s,top .35s ease,left .35s ease;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ng-node.ng-selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--color) 80%,transparent),0 2px 8px rgba(0,0,0,.12)}
.ng-node.ng-dragging{opacity:.88;transition:box-shadow .1s;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:100}
.ng-header{display:flex;align-items:center;gap:6px;padding:6px 10px;cursor:pointer;user-select:none}
.ng-header:hover{background:rgba(0,0,0,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap}
.ng-title{flex:1;font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap}
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
    <span id="tb-title">${f(t.title)}</span>
    <span id="tb-source">${d}</span>
  </div>
  <div id="tb-row2">
    <button onclick="fitView()">Fit View</button>
    <div class="tb-sep"></div>
    <button onclick="doExpand()" title="Expand selected node + children (all if none selected)">Expand\u2193</button>
    <button onclick="doCollapse()" title="Collapse selected node + children (all if none selected)">Collapse\u2191</button>
    <div class="tb-sep"></div>
    <span id="tb-sel" style="opacity:.35">Click a node to select</span>
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
    ${p}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${c};
var EDGES = ${s};
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

// Chevron click = toggle this node only (no cascade, stopPropagation)
function toggleFold(e, hdr) {
  e.stopPropagation();
  var body = hdr.nextElementSibling;
  if (!body) return;
  var chevron = hdr.querySelector('.ng-chevron');
  var expanding = body.style.display === 'none';
  body.style.display = expanding ? '' : 'none';
  if (chevron) chevron.textContent = expanding ? '\u25B2' : '\u25BC';
  var nodeEl = hdr.parentNode;
  var nodeId = nodeEl.id.replace('node-', '');
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) { NODES_DATA[i].contentExpanded = expanding; break; }
  }
  setTimeout(recomputePositions, 0);
}

// Get node datum by id
function getNodeDatum(nodeId) {
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) return NODES_DATA[i];
  }
  return null;
}

// Collect all descendants recursively (for collapse \u2014 no depth limit)
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

// Collect descendants for expand \u2014 skip main_topic children (and their subtrees)
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
    if (chevron) chevron.textContent = expand ? '\u25B2' : '\u25BC';
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
    // Expand all \u2014 include main_topic roots but skip nested main_topic subtrees
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

// Keep original node positions \u2014 collapse/expand does not push other nodes
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
        // Main \u2192 main: always push regardless of X offset
        var naturalBottom = other.ly + (other.nodeHeight || HEADER_H);
        var delta = (otherY + h) - naturalBottom;
        var nodeNaturalY = n.naturalY !== undefined ? n.naturalY : n.ly;
        y = Math.max(y, nodeNaturalY + delta, otherBottom + 20);
      } else {
        // Rounded pushes: only if X ranges actually overlap (different columns don't push each other)
        var oW = otherEl ? otherEl.offsetWidth : 300;
        if (!(n.lx < other.lx + oW && other.lx < n.lx + nW)) return;
        if (nIsMain) {
          // Rounded \u2192 main: skip only if descendant AND doesn't reach this node's Y
          if (isDescendantOf(other.id, n.id) && otherBottom <= n.ly) return;
          var wasPushed = otherY > other.ly;
          if (!other.contentExpanded && !wasPushed) return;
          y = Math.max(y, otherBottom + 48);
        } else {
          // Sub \u2192 sub: always push when X ranges overlap, regardless of expand state
          var gap = (rootOf(other.id) === rootOf(n.id)) ? 20 : 48;
          y = Math.max(y, otherBottom + gap);
        }
      }
    });
    renderY[n.id] = y;
  });

  // Pass 2: sub-nodes follow their parent main node's push delta
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

  // Pass 3: normalize Y spacing within each bus group (same source, same X column)
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
    // Group targets by X column
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
    // Sort and space within each X column group
    xGroups.forEach(function(grp) {
      if (grp.length < 2) return;
      var sorted = grp.map(function(id) {
        var el = document.getElementById('node-' + id);
        return { id: id, y: renderY[id] !== undefined ? renderY[id] : ndMap[id].ly, h: el ? el.offsetHeight : HEADER_H };
      }).sort(function(a, b) { return a.y - b.y; });
      for (var i = 1; i < sorted.length; i++) {
        var minY = sorted[i-1].y + sorted[i-1].h + 20;
        var newY = Math.max(sorted[i].y, minY);
        sorted[i].y = newY;
        renderY[sorted[i].id] = newY;
      }
    });
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

  // Group line edges by source for bus routing
  var lineBySource={};
  EDGES.forEach(function(e){
    if(e.type!=='line') return;
    if(!lineBySource[e.source]) lineBySource[e.source]=[];
    lineBySource[e.source].push(e);
  });

  var busDrawn={};

  // Bus routing: one source \u2192 multiple line targets all on the same side (right)
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
</html>`}var Y=class t{constructor(e){this.context=e;this._pendingSaves=new Set}static register(e){let n=new t(e);return l.window.registerCustomEditorProvider("nodegraph.editor",n,{webviewOptions:{retainContextWhenHidden:!0}})}async resolveCustomTextEditor(e,n,o){let i=l.Uri.joinPath(e.uri,"..");n.webview.options={enableScripts:!0,localResourceRoots:[this.context.extensionUri,i]},n.webview.html=this._getHtmlForWebview(n.webview);let a=s=>{try{let d=JSON.parse(e.getText()),r=O(n.webview,e.uri,d);n.webview.postMessage({type:s,data:d,imageUris:r})}catch{}},p=n.webview.onDidReceiveMessage(async s=>{if(s.type==="ready")a("load");else if(s.type==="save"){let d=e.uri.toString();this._pendingSaves.add(d);try{let r=new l.WorkspaceEdit,u=new l.Range(e.positionAt(0),e.positionAt(e.getText().length));r.replace(e.uri,u,JSON.stringify(s.data,null,2)),await l.workspace.applyEdit(r),await e.save()}finally{this._pendingSaves.delete(d)}}else if(s.type==="openLink"){let d=s.link;if(d.type==="url")l.env.openExternal(l.Uri.parse(d.target));else if(d.type==="pdf"){let r=l.Uri.joinPath(l.Uri.joinPath(e.uri,".."),d.target);l.env.openExternal(r)}else d.type==="obsidian"&&l.env.openExternal(l.Uri.parse(d.target))}else if(s.type==="exportHtml")try{let d=s.data,r=l.Uri.joinPath(e.uri,".."),u=G.basename(e.uri.fsPath,".nodegraph.json"),E=l.Uri.joinPath(r,`.${u}-imgs`),b={},D=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g,$=async v=>{if(!(!v||b[v]))try{let g=l.Uri.joinPath(E,v),h=await l.workspace.fs.readFile(g),m=v.split(".").pop()?.toLowerCase()??"png",N=m==="jpg"||m==="jpeg"?"image/jpeg":m==="gif"?"image/gif":m==="webp"?"image/webp":"image/png";b[v]=`data:${N};base64,${Buffer.from(h).toString("base64")}`}catch{}};for(let v of d.nodes){D.lastIndex=0;let g;for(;(g=D.exec(v.content??""))!==null;)await $(g[1])}let k=W(d,b),y=l.Uri.joinPath(r,`${u}.html`);await l.workspace.fs.writeFile(y,Buffer.from(k,"utf-8"));let I=await l.window.showInformationMessage(`HTML exported: ${u}.html`,"Open in Browser","Show in Explorer");I==="Open in Browser"?l.env.openExternal(y):I==="Show in Explorer"&&l.commands.executeCommand("revealFileInOS",y)}catch(d){l.window.showErrorMessage(`HTML export failed: ${d}`)}else if(s.type==="saveImage")try{let{filename:d,webviewUri:r}=await F(n.webview,e.uri,s.data,s.ext??"png");n.webview.postMessage({type:"imageSaved",nodeId:s.nodeId,filename:d,webviewUri:r})}catch(d){l.window.showErrorMessage(`Failed to save image: ${d}`)}else if(s.type==="deleteImageFile")await j(e.uri,s.filename);else if(s.type==="reload")try{let d=await l.workspace.fs.readFile(e.uri),r=Buffer.from(d).toString("utf-8"),u=JSON.parse(r),E=O(n.webview,e.uri,u);n.webview.postMessage({type:"load",data:u,imageUris:E})}catch{a("load")}}),c=l.workspace.onDidChangeTextDocument(s=>{s.document.uri.toString()===e.uri.toString()&&(this._pendingSaves.has(e.uri.toString())||a("externalChange"))});n.onDidDispose(()=>{p.dispose(),c.dispose()})}_getHtmlForWebview(e){let n=e.asWebviewUri(l.Uri.joinPath(this.context.extensionUri,"dist","webview.js")),o=e.asWebviewUri(l.Uri.joinPath(this.context.extensionUri,"dist","katex","katex.min.css")),i=ae();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${e.cspSource} blob: data:; script-src 'nonce-${i}'; style-src 'unsafe-inline' ${e.cspSource}; font-src ${e.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeGraph</title>
  <link rel="stylesheet" href="${o}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; overflow: hidden; }
    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    .katex-display { margin: 0.5em 0; }
    .katex-html { white-space: nowrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${i}" src="${n}"></script>
</body>
</html>`}};function ae(){let t="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}var A=S(require("vscode")),X=S(require("child_process"));function C(t){try{return X.execSync(t,{timeout:5e3,stdio:["pipe","pipe","pipe"]}).toString().trim()}catch{return""}}function x(t){return C(t)!==""}async function q(t){if(!t||t.length===0)return;let e=[],n=new Date().toISOString(),o=process.platform,i=o==="win32"?"Windows":o==="darwin"?"macOS":"Linux",a=process.arch,p=C("python3 --version 2>&1")||C("python --version 2>&1"),c=x("python3 --version 2>&1")?"python3":x("python --version 2>&1")?"python":"",s=c!=="",d=s&&x(`${c} -c "import fitz" 2>&1 && echo ok`),r=d?C(`${c} -c "import fitz; print(fitz.__version__)"`):"",u=s&&x(`${c} -c "import pdfplumber" 2>&1 && echo ok`),E=s&&x(`${c} -c "import pdfminer" 2>&1 && echo ok`),b=s&&x(`${c} -c "from PIL import Image" 2>&1 && echo ok`),D=b?C(`${c} -c "from PIL import __version__; print(__version__)"`):"",$=s&&x(`${c} -c "import cv2" 2>&1 && echo ok`),k=x("pdftotext -v 2>&1 && echo ok")||x("pdftotext --help 2>&1 && echo ok"),y=x("convert --version 2>&1 && echo ok"),I=x("magick --version 2>&1 && echo ok"),v=x("gs --version 2>&1 && echo ok")||x("gswin64c --version 2>&1 && echo ok"),g=m=>m?"\u2705":"\u274C";e.push("# NodeGraph \u2014 Agent Environment Report"),e.push(""),e.push("> Auto-generated by the NodeGraph extension at activation."),e.push("> **AI agents: read this file to understand what tools are available on this machine.**"),e.push("> Re-generated each time a `.nodegraph.json` file is opened."),e.push(""),e.push(`Generated: \`${n}\``),e.push(""),e.push("---"),e.push(""),e.push("## System"),e.push(""),e.push("| | |"),e.push("|---|---|"),e.push(`| OS | ${i} (\`${o}\`) |`),e.push(`| Architecture | \`${a}\` |`),e.push(`| Python | ${s?`${g(!0)} \`${p}\``:`${g(!1)} not found`} |`),e.push(`| Python command | ${s?`\`${c}\``:"N/A"} |`),e.push(""),e.push("---"),e.push(""),e.push("## PDF Reading Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| PyMuPDF (\`fitz\`) | ${g(d)} | ${d?`v${r} \u2014 recommended`:"Install: `pip install pymupdf`"} |`),e.push(`| pdfplumber | ${g(u)} | ${u?"available":"Install: `pip install pdfplumber`"} |`),e.push(`| pdfminer | ${g(E)} | ${E?"available":"Install: `pip install pdfminer.six`"} |`),e.push(`| poppler (\`pdftotext\`) | ${g(k)} | ${k?"CLI tool available":o==="win32"?"Install: download poppler for Windows":o==="darwin"?"Install: `brew install poppler`":"Install: `apt install poppler-utils`"} |`),e.push(`| Ghostscript (\`gs\`) | ${g(v)} | ${v?"available":"optional"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Image Processing Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| Pillow (\`PIL\`) | ${g(b)} | ${b?`v${D} \u2014 recommended`:"Install: `pip install Pillow`"} |`),e.push(`| OpenCV (\`cv2\`) | ${g($)} | ${$?"available":"Install: `pip install opencv-python`"} |`),e.push(`| ImageMagick (\`convert\`) | ${g(y||I)} | ${y||I?"CLI tool available":o==="win32"?"Install: imagemagick.org":o==="darwin"?"Install: `brew install imagemagick`":"Install: `apt install imagemagick`"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Agent Recommendations"),e.push(""),s||(e.push("> \u26A0\uFE0F **Python not found.** PDF reading and image processing via Python are not available."),e.push("> Install Python from https://python.org, then reopen a `.nodegraph.json` file to re-run this check."),e.push("")),e.push("### Reading a PDF"),d?(e.push("Use PyMuPDF (recommended \u2014 fastest and most accurate):"),e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push('text = "\\n".join(page.get_text() for page in doc)'),e.push("```")):u?(e.push("Use pdfplumber:"),e.push("```python"),e.push("import pdfplumber"),e.push('with pdfplumber.open("paper.pdf") as pdf:'),e.push('    text = "\\n".join(p.extract_text() or "" for p in pdf.pages)'),e.push("```")):k?(e.push("Use poppler CLI:"),e.push("```bash"),e.push("pdftotext paper.pdf -"),e.push("```")):e.push("\u274C No PDF reading tool available. Ask the user to install PyMuPDF: `pip install pymupdf`"),e.push(""),e.push("### Extracting images from a PDF"),d?(e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push("for i, page in enumerate(doc):"),e.push("    for img in page.get_images():"),e.push("        xref = img[0]"),e.push("        pix = fitz.Pixmap(doc, xref)"),e.push('        pix.save(f"fig_{i}_{xref}.png")'),e.push("```")):b?e.push("Pillow is available but cannot extract from PDF directly. Use PyMuPDF for extraction."):e.push("\u274C No image extraction tool available."),e.push(""),e.push("---"),e.push(""),e.push("*To refresh this report, reopen any `.nodegraph.json` file.*");let h=e.join(`
`);for(let m of t){let N=A.Uri.joinPath(m.uri,".agent"),V=A.Uri.joinPath(N,"ENVIRONMENT.md");try{await A.workspace.fs.createDirectory(N),await A.workspace.fs.writeFile(V,Buffer.from(h,"utf-8"))}catch{}}}var de=[{id:"tomoki1207.pdf",name:"vscode-pdf (PDF Viewer)"}];async function le(){for(let t of de)if(!M.extensions.getExtension(t.id))try{await M.commands.executeCommand("workbench.extensions.installExtension",t.id)}catch{}}function ce(t){t.subscriptions.push(Y.register(t)),q(M.workspace.workspaceFolders??[]),le()}function pe(){}0&&(module.exports={activate,deactivate});
