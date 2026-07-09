"use strict";var V=Object.create;var B=Object.defineProperty;var J=Object.getOwnPropertyDescriptor;var Z=Object.getOwnPropertyNames;var Q=Object.getPrototypeOf,ee=Object.prototype.hasOwnProperty;var te=(t,e)=>{for(var n in e)B(t,n,{get:e[n],enumerable:!0})},R=(t,e,n,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of Z(e))!ee.call(t,a)&&a!==n&&B(t,a,{get:()=>e[a],enumerable:!(r=J(e,a))||r.enumerable});return t};var N=(t,e,n)=>(n=t!=null?V(Q(t)):{},R(e||!t||!t.__esModule?B(n,"default",{value:t,enumerable:!0}):n,t)),ne=t=>R(B({},"__esModule",{value:!0}),t);var ue={};te(ue,{activate:()=>ce,deactivate:()=>pe});module.exports=ne(ue);var D=N(require("vscode"));var l=N(require("vscode")),G=N(require("path"));var w=N(require("vscode"));function L(t){let e=w.Uri.joinPath(t,".."),n=t.path.split("/").pop()?.replace(/\.nodegraph\.json$/,"")??"graph";return w.Uri.joinPath(e,`.${n}-imgs`)}function oe(t,e,n){let r=w.Uri.joinPath(L(e),n);return t.asWebviewUri(r).toString()}var U=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;function _(t,e,n){let r={},a=s=>{s&&!r[s]&&(r[s]=oe(t,e,s))};for(let s of n.nodes){U.lastIndex=0;let p;for(;(p=U.exec(s.content??""))!==null;)a(p[1])}for(let s of n.canvasImages??[])a(s.filename);return r}async function W(t,e,n,r="png"){let a=L(e);try{await w.workspace.fs.createDirectory(a)}catch{}let s=`img_${Date.now()}.${r}`,p=w.Uri.joinPath(a,s);return await w.workspace.fs.writeFile(p,Buffer.from(n,"base64")),{filename:s,webviewUri:t.asWebviewUri(p).toString()}}async function z(t,e){let n=w.Uri.joinPath(L(t),e);try{await w.workspace.fs.delete(n)}catch{}}function g(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function P(t){return/^\s*\|/.test(t)&&t.indexOf("|",1)!==-1}function O(t){return/^\s*\|[\s\-:|]+\|\s*$/.test(t)&&!/[a-zA-Z0-9]/.test(t)}function F(t){return t.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(e=>e.trim())}function re(t){if(!t)return[{type:"text",text:"",startChar:0,endChar:0}];let e=t.split(`
`),n=[],r=0,a=0,s=p=>e[p].length+(p<e.length-1?1:0);for(;r<e.length;)if(P(e[r])&&r+1<e.length&&O(e[r+1])){let c=a,i=[];for(;r<e.length&&P(e[r]);)i.push(e[r]),a+=s(r),r++;i.length>=3?n.push({type:"table",headers:F(i[0]),rows:i.slice(2).map(F),startChar:c,endChar:a}):n.push({type:"text",text:i.join(`
`),startChar:c,endChar:a})}else{let c=a,i=[];for(;r<e.length&&!(P(e[r])&&r+1<e.length&&O(e[r+1]));)i.push(e[r]),a+=s(r),r++;n.push({type:"text",text:i.join(`
`),startChar:c,endChar:a})}return n}function H(t){let e=t.split(`
`);for(let n=0;n+1<e.length;n++)if(P(e[n])&&O(e[n+1]))return!0;return!1}function Y(t,e){let n=/\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g,r="",a=0,s;for(;(s=n.exec(t))!==null;){s.index>a&&(r+=g(t.slice(a,s.index)));let p=s[1],c=s[2],i=s[3],d=c&&i?` width="${c}" height="${i}"`:"",o=e[p];r+=o?`<img class="ng-img${d?" ng-img-sized":""}" src="${o}"${d} alt="${g(p)}" onclick="showLightbox(this.src)" title="Click to enlarge">`:`<span class="ng-img-missing">${g(p)}</span>`,a=s.index+s[0].length}return a<t.length&&(r+=g(t.slice(a))),r}function ie(t,e){let n=t.headers.map(a=>`<th>${Y(a,e)}</th>`).join(""),r=t.rows.map(a=>`<tr>${a.map(s=>`<td>${Y(s,e)}</td>`).join("")}</tr>`).join("");return`<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${n}</tr></thead><tbody>${r}</tbody></table></div>`}function ae(t,e,n,r,a){let s=e?.color??"#888",p=e?.shape==="rounded"?"22px":"2px",c=g(e?.label??t.template),i=Math.round(t.position.x+n),d=Math.round(t.position.y+r),o="",u=t.content??"";if(H(u)){let h=re(u);o+='<div class="ng-content">';for(let m of h)m.type==="table"?o+=ie(m,a):m.text&&(o+=`<div class="ng-seg">${Y(m.text,a).replace(/\n/g,"<br>")}</div>`);o+="</div>"}else u&&(o+=`<div class="ng-content">${Y(u,a).replace(/\n/g,"<br>")}</div>`);if(t.original){let h=g(t.original.title??"Original"),m=t.originalExpanded?" open":"";o+=`<details class="ng-original"${m}><summary>${h}${t.original.location?` <span class="ng-loc">${g(t.original.location)}</span>`:""}</summary>
<div class="ng-orig-text">${g(t.original.text).replace(/\n/g,"<br>")}</div></details>`}for(let h of t.toggleItems??[])o+=`<details class="ng-toggle"${h.expanded?" open":""}><summary>${g(h.title||"(untitled)")}</summary>
<div class="ng-toggle-body">${g(h.content).replace(/\n/g,"<br>")}</div></details>`;t.links.length&&(o+=`<div class="ng-links">${t.links.map(h=>{let m=h.type==="url"?"\u{1F517}":h.type==="pdf"?"\u{1F4C4}":h.type==="obsidian"?"\u{1F7E3}":"\u2B21";return`<a class="ng-link"${h.type==="url"||h.type==="pdf"?` href="${g(h.target)}" target="_blank"`:""}>${m} ${g(h.label||h.target)}</a>`}).join("")}</div>`);let E=!!o,b=t.contentExpanded?"":' style="display:none"',S=t.children.length?` data-children="${t.children.join(",")}"`:"",A=H(u)?" ng-has-table":"",k=/\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g,y=0,I;for(;(I=k.exec(u))!==null;)y=Math.max(y,Number(I[1]));let v=y>0?H(u)?y+280:y+32:0,f=[t.nodeWidth?`min-width:${t.nodeWidth}px`:v>220?`min-width:${v}px`:"",t.nodeHeight?`min-height:${t.nodeHeight}px`:""].filter(Boolean).join(";");return`<div class="ng-node${A}" id="node-${g(t.id)}"${S} style="--color:${s};border-radius:${p};left:${i}px;top:${d}px${f?";"+f:""}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${s} 22%,transparent);color:${s}">${c}</span>
    ${E?`<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${g(t.title)}</span>`:`<span class="ng-title">${g(t.title)}</span>`}
  </div>
  ${E?`<div class="ng-body"${b}${t.fontSize?` style="font-size:${t.fontSize}px"`:""}>${o}</div>`:""}
</div>`}function j(t,e={}){let n=1/0,r=1/0;for(let o of t.nodes)n=Math.min(n,o.position.x),r=Math.min(r,o.position.y);isFinite(n)||(n=0,r=0);let a=-n+100,s=-r+100,p=t.nodes.map(o=>ae(o,t.nodeTemplates[o.template],a,s,e)).join(`
`),c=JSON.stringify(t.nodes.map(o=>({id:o.id,lx:Math.round(o.position.x+a),ly:Math.round(o.position.y+s),children:o.children??[],template:o.template,contentExpanded:o.contentExpanded,isMain:(t.nodeTemplates[o.template]?.shape??"sharp")==="sharp",nodeHeight:o.nodeHeight??null,naturalY:Math.round((o.nodeNaturalY??o.position.y)+s),searchText:[o.title,o.content??"",o.original?.text??""].join(" ").toLowerCase()}))),i=JSON.stringify(t.edges.map(o=>({source:o.source,target:o.target,type:o.type,label:o.label||""}))),d=t.source?`${g(t.source.authors)} \xB7 ${g(t.source.venue)}`:"";return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${g(t.title)}</title>
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
    <span id="tb-title">${g(t.title)}</span>
    <span id="tb-source">${d}</span>
  </div>
  <div id="tb-row2">
    <button onclick="fitView()">Fit View</button>
    <div class="tb-sep"></div>
    <button onclick="doExpand()" title="Expand selected node + children (all if none selected)">Expand\u2193</button>
    <button onclick="doCollapse()" title="Collapse selected node + children (all if none selected)">Collapse\u2191</button>
    <div class="tb-sep"></div>
    <div class="tb-sep"></div>
    <span id="tb-sel" style="opacity:.35">Click a node to select</span>
  </div>
</div>
<div id="viewport">
  <div id="search-wrap">
    <div id="search-row">
      <input id="search-input" placeholder="Search nodes\u2026 (Ctrl+F)" oninput="doSearch(this.value)" onkeydown="onSearchKey(event)" onclick="onSearchInputClick()">
      <span id="search-count"></span>
      <div style="width:1px;height:16px;background:#e5e7eb;margin:0 2px;flex-shrink:0"></div>
      <button onclick="closeSearch()" title="Close (Escape)" style="background:none;border:none;cursor:pointer;padding:2px 6px;font-size:13px;color:#6b7280;border-radius:3px;line-height:1">\u2715</button>
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
    ${p}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${c};
var EDGES = ${i};
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
  // \uAC80\uC0C9 \uB4DC\uB86D\uB2E4\uC6B4\uC774 \uC5F4\uB824\uC788\uC73C\uBA74 search input \uD3EC\uCEE4\uC2A4 \uBCF5\uC6D0 (\uD654\uC0B4\uD45C \uD0A4 \uC720\uC9C0)
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
          // Main\u2192Main: X \uBC94\uC704\uAC00 \uACB9\uCE60 \uB54C\uB9CC \uBC00\uC5B4\uB0C4 (\uB2E4\uB978 \uCEEC\uB7FC cascade \uBC29\uC9C0)
          if (!(node.lx < other.lx + otherW && other.lx < node.lx + nodeW)) return;
          var naturalBottom = other.ly + (other.nodeHeight || HEADER_H);
          var delta = (otherY + otherH) - naturalBottom;
          var nodeNaturalY = node.naturalY !== undefined ? node.naturalY : node.ly;
          y = Math.max(y, nodeNaturalY + delta, otherBottom + 20);
        } else {
          // \uBC29\uD5A5 \uC5E3\uC9C0 \uC5F0\uACB0\uC774\uBA74 X overlap \uC5C6\uC5B4\uB3C4 \uBC00\uC5B4\uB0C4
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

    // Pass 2: \uC11C\uBE0C\uB178\uB4DC\uAC00 \uBD80\uBAA8 main\uC758 push delta\uB9CC\uD07C \uB530\uB77C \uB0B4\uB824\uAC10
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

    // \uC218\uB834 \uD655\uC778
    var converged = NODES_DATA.every(function(n) {
      var cur = renderY[n.id] !== undefined ? renderY[n.id] : n.ly;
      var prev = prevSnapshot[n.id] !== undefined ? prevSnapshot[n.id] : n.ly;
      return cur === prev;
    });
    if (converged) break;
  }

  // Pass 3: line \uC5E3\uC9C0 \uBC84\uC2A4 \uADF8\uB8F9 Y \uC815\uADDC\uD654 (gap 30px, \uC5D0\uB514\uD130\uC640 \uB3D9\uC77C)
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
  // Enter \uD655\uC815: \uC120\uD0DD\uB41C \uB178\uB4DC\uB9CC expand, \uB098\uBA38\uC9C0 \uB9E4\uCE58 \uB178\uB4DC collapse
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
    // \uC774\uC804 \uC120\uD0DD \uB178\uB4DC\uC758 \uC778\uB371\uC2A4\uB97C \uCC3E\uC544 kbIdx \uBCF5\uC6D0
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
</html>`}var C=class t{constructor(e){this.context=e;this._pendingSaves=new Set}static register(e){let n=new t(e);return l.window.registerCustomEditorProvider("nodegraph.editor",n,{webviewOptions:{retainContextWhenHidden:!0}})}static{this._activeWebview=null}static postToActive(e){t._activeWebview?.postMessage(e)}async resolveCustomTextEditor(e,n,r){let a=l.Uri.joinPath(e.uri,"..");n.webview.options={enableScripts:!0,localResourceRoots:[this.context.extensionUri,a]},n.webview.html=this._getHtmlForWebview(n.webview);let s=i=>{try{let d=JSON.parse(e.getText()),o=_(n.webview,e.uri,d);n.webview.postMessage({type:i,data:d,imageUris:o})}catch{}},p=n.webview.onDidReceiveMessage(async i=>{if(i.type==="ready")s("load");else if(i.type==="save"){let d=e.uri.toString();this._pendingSaves.add(d);try{let o=new l.WorkspaceEdit,u=new l.Range(e.positionAt(0),e.positionAt(e.getText().length));o.replace(e.uri,u,JSON.stringify(i.data,null,2)),await l.workspace.applyEdit(o),await e.save()}finally{this._pendingSaves.delete(d)}}else if(i.type==="openLink"){let d=i.link;if(d.type==="url")l.env.openExternal(l.Uri.parse(d.target));else if(d.type==="pdf"){let o=l.Uri.joinPath(l.Uri.joinPath(e.uri,".."),d.target);l.env.openExternal(o)}else d.type==="obsidian"&&l.env.openExternal(l.Uri.parse(d.target))}else if(i.type==="exportHtml")try{let d=i.data,o=l.Uri.joinPath(e.uri,".."),u=G.basename(e.uri.fsPath,".nodegraph.json"),E=l.Uri.joinPath(o,`.${u}-imgs`),b={},S=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g,A=async v=>{if(!(!v||b[v]))try{let f=l.Uri.joinPath(E,v),h=await l.workspace.fs.readFile(f),m=v.split(".").pop()?.toLowerCase()??"png",$=m==="jpg"||m==="jpeg"?"image/jpeg":m==="gif"?"image/gif":m==="webp"?"image/webp":"image/png";b[v]=`data:${$};base64,${Buffer.from(h).toString("base64")}`}catch{}};for(let v of d.nodes){S.lastIndex=0;let f;for(;(f=S.exec(v.content??""))!==null;)await A(f[1])}let k=j(d,b),y=l.Uri.joinPath(o,`${u}.html`);await l.workspace.fs.writeFile(y,Buffer.from(k,"utf-8"));let I=await l.window.showInformationMessage(`HTML exported: ${u}.html`,"Open in Browser","Show in Explorer");I==="Open in Browser"?l.env.openExternal(y):I==="Show in Explorer"&&l.commands.executeCommand("revealFileInOS",y)}catch(d){l.window.showErrorMessage(`HTML export failed: ${d}`)}else if(i.type==="saveImage")try{let{filename:d,webviewUri:o}=await W(n.webview,e.uri,i.data,i.ext??"png");n.webview.postMessage({type:"imageSaved",nodeId:i.nodeId,filename:d,webviewUri:o})}catch(d){l.window.showErrorMessage(`Failed to save image: ${d}`)}else if(i.type==="deleteImageFile")await z(e.uri,i.filename);else if(i.type==="reload")try{let d=await l.workspace.fs.readFile(e.uri),o=Buffer.from(d).toString("utf-8"),u=JSON.parse(o),E=_(n.webview,e.uri,u);n.webview.postMessage({type:"load",data:u,imageUris:E})}catch{s("load")}}),c=l.workspace.onDidChangeTextDocument(i=>{i.document.uri.toString()===e.uri.toString()&&(this._pendingSaves.has(e.uri.toString())||s("externalChange"))});t._activeWebview=n.webview,n.onDidChangeViewState(i=>{i.webviewPanel.active&&(t._activeWebview=n.webview)}),n.onDidDispose(()=>{p.dispose(),c.dispose(),t._activeWebview===n.webview&&(t._activeWebview=null)})}_getHtmlForWebview(e){let n=e.asWebviewUri(l.Uri.joinPath(this.context.extensionUri,"dist","webview.js")),r=e.asWebviewUri(l.Uri.joinPath(this.context.extensionUri,"dist","katex","katex.min.css")),a=se();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${e.cspSource} blob: data:; script-src 'nonce-${a}'; style-src 'unsafe-inline' ${e.cspSource}; font-src ${e.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeGraph</title>
  <link rel="stylesheet" href="${r}">
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
  <script nonce="${a}" src="${n}"></script>
</body>
</html>`}};function se(){let t="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}var M=N(require("vscode")),X=N(require("child_process"));function T(t){try{return X.execSync(t,{timeout:5e3,stdio:["pipe","pipe","pipe"]}).toString().trim()}catch{return""}}function x(t){return T(t)!==""}async function q(t){if(!t||t.length===0)return;let e=[],n=new Date().toISOString(),r=process.platform,a=r==="win32"?"Windows":r==="darwin"?"macOS":"Linux",s=process.arch,p=T("python3 --version 2>&1")||T("python --version 2>&1"),c=x("python3 --version 2>&1")?"python3":x("python --version 2>&1")?"python":"",i=c!=="",d=i&&x(`${c} -c "import fitz" 2>&1 && echo ok`),o=d?T(`${c} -c "import fitz; print(fitz.__version__)"`):"",u=i&&x(`${c} -c "import pdfplumber" 2>&1 && echo ok`),E=i&&x(`${c} -c "import pdfminer" 2>&1 && echo ok`),b=i&&x(`${c} -c "from PIL import Image" 2>&1 && echo ok`),S=b?T(`${c} -c "from PIL import __version__; print(__version__)"`):"",A=i&&x(`${c} -c "import cv2" 2>&1 && echo ok`),k=x("pdftotext -v 2>&1 && echo ok")||x("pdftotext --help 2>&1 && echo ok"),y=x("convert --version 2>&1 && echo ok"),I=x("magick --version 2>&1 && echo ok"),v=x("gs --version 2>&1 && echo ok")||x("gswin64c --version 2>&1 && echo ok"),f=m=>m?"\u2705":"\u274C";e.push("# NodeGraph \u2014 Agent Environment Report"),e.push(""),e.push("> Auto-generated by the NodeGraph extension at activation."),e.push("> **AI agents: read this file to understand what tools are available on this machine.**"),e.push("> Re-generated each time a `.nodegraph.json` file is opened."),e.push(""),e.push(`Generated: \`${n}\``),e.push(""),e.push("---"),e.push(""),e.push("## System"),e.push(""),e.push("| | |"),e.push("|---|---|"),e.push(`| OS | ${a} (\`${r}\`) |`),e.push(`| Architecture | \`${s}\` |`),e.push(`| Python | ${i?`${f(!0)} \`${p}\``:`${f(!1)} not found`} |`),e.push(`| Python command | ${i?`\`${c}\``:"N/A"} |`),e.push(""),e.push("---"),e.push(""),e.push("## PDF Reading Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| PyMuPDF (\`fitz\`) | ${f(d)} | ${d?`v${o} \u2014 recommended`:"Install: `pip install pymupdf`"} |`),e.push(`| pdfplumber | ${f(u)} | ${u?"available":"Install: `pip install pdfplumber`"} |`),e.push(`| pdfminer | ${f(E)} | ${E?"available":"Install: `pip install pdfminer.six`"} |`),e.push(`| poppler (\`pdftotext\`) | ${f(k)} | ${k?"CLI tool available":r==="win32"?"Install: download poppler for Windows":r==="darwin"?"Install: `brew install poppler`":"Install: `apt install poppler-utils`"} |`),e.push(`| Ghostscript (\`gs\`) | ${f(v)} | ${v?"available":"optional"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Image Processing Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| Pillow (\`PIL\`) | ${f(b)} | ${b?`v${S} \u2014 recommended`:"Install: `pip install Pillow`"} |`),e.push(`| OpenCV (\`cv2\`) | ${f(A)} | ${A?"available":"Install: `pip install opencv-python`"} |`),e.push(`| ImageMagick (\`convert\`) | ${f(y||I)} | ${y||I?"CLI tool available":r==="win32"?"Install: imagemagick.org":r==="darwin"?"Install: `brew install imagemagick`":"Install: `apt install imagemagick`"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Agent Recommendations"),e.push(""),i||(e.push("> \u26A0\uFE0F **Python not found.** PDF reading and image processing via Python are not available."),e.push("> Install Python from https://python.org, then reopen a `.nodegraph.json` file to re-run this check."),e.push("")),e.push("### Reading a PDF"),d?(e.push("Use PyMuPDF (recommended \u2014 fastest and most accurate):"),e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push('text = "\\n".join(page.get_text() for page in doc)'),e.push("```")):u?(e.push("Use pdfplumber:"),e.push("```python"),e.push("import pdfplumber"),e.push('with pdfplumber.open("paper.pdf") as pdf:'),e.push('    text = "\\n".join(p.extract_text() or "" for p in pdf.pages)'),e.push("```")):k?(e.push("Use poppler CLI:"),e.push("```bash"),e.push("pdftotext paper.pdf -"),e.push("```")):e.push("\u274C No PDF reading tool available. Ask the user to install PyMuPDF: `pip install pymupdf`"),e.push(""),e.push("### Extracting images from a PDF"),d?(e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push("for i, page in enumerate(doc):"),e.push("    for img in page.get_images():"),e.push("        xref = img[0]"),e.push("        pix = fitz.Pixmap(doc, xref)"),e.push('        pix.save(f"fig_{i}_{xref}.png")'),e.push("```")):b?e.push("Pillow is available but cannot extract from PDF directly. Use PyMuPDF for extraction."):e.push("\u274C No image extraction tool available."),e.push(""),e.push("---"),e.push(""),e.push("*To refresh this report, reopen any `.nodegraph.json` file.*");let h=e.join(`
`);for(let m of t){let $=M.Uri.joinPath(m.uri,".agent"),K=M.Uri.joinPath($,"ENVIRONMENT.md");try{await M.workspace.fs.createDirectory($),await M.workspace.fs.writeFile(K,Buffer.from(h,"utf-8"))}catch{}}}var de=[{id:"tomoki1207.pdf",name:"vscode-pdf (PDF Viewer)"}];async function le(){for(let t of de)if(!D.extensions.getExtension(t.id))try{await D.commands.executeCommand("workbench.extensions.installExtension",t.id)}catch{}}function ce(t){t.subscriptions.push(C.register(t)),t.subscriptions.push(D.commands.registerCommand("nodegraph.search",()=>{C.postToActive({type:"openSearch"})})),q(D.workspace.workspaceFolders??[]),le()}function pe(){}0&&(module.exports={activate,deactivate});
