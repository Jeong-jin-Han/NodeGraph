"use strict";var j=Object.create;var D=Object.defineProperty;var F=Object.getOwnPropertyDescriptor;var z=Object.getOwnPropertyNames;var X=Object.getPrototypeOf,G=Object.prototype.hasOwnProperty;var q=(e,t)=>{for(var n in t)D(e,n,{get:t[n],enumerable:!0})},B=(e,t,n,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of z(t))!G.call(e,r)&&r!==n&&D(e,r,{get:()=>t[r],enumerable:!(i=F(t,r))||i.enumerable});return e};var T=(e,t,n)=>(n=e!=null?j(X(e)):{},B(t||!e||!e.__esModule?D(n,"default",{value:e,enumerable:!0}):n,e)),K=e=>B(D({},"__esModule",{value:!0}),e);var oe={};q(oe,{activate:()=>te,deactivate:()=>ne});module.exports=K(oe);var d=T(require("vscode")),W=T(require("path"));var x=T(require("vscode"));function M(e){let t=x.Uri.joinPath(e,".."),n=e.path.split("/").pop()?.replace(/\.nodegraph\.json$/,"")??"graph";return x.Uri.joinPath(t,`.${n}-imgs`)}function J(e,t,n){let i=x.Uri.joinPath(M(t),n);return e.asWebviewUri(i).toString()}var P=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;function O(e,t,n){let i={},r=a=>{a&&!i[a]&&(i[a]=J(e,t,a))};for(let a of n.nodes){P.lastIndex=0;let c;for(;(c=P.exec(a.content??""))!==null;)r(c[1])}for(let a of n.canvasImages??[])r(a.filename);return i}async function Y(e,t,n,i="png"){let r=M(t);try{await x.workspace.fs.createDirectory(r)}catch{}let a=`img_${Date.now()}.${i}`,c=x.Uri.joinPath(r,a);return await x.workspace.fs.writeFile(c,Buffer.from(n,"base64")),{filename:a,webviewUri:e.asWebviewUri(c).toString()}}async function L(e,t){let n=x.Uri.joinPath(M(e),t);try{await x.workspace.fs.delete(n)}catch{}}function g(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function k(e){return/^\s*\|/.test(e)&&e.indexOf("|",1)!==-1}function H(e){return/^\s*\|[\s\-:|]+\|\s*$/.test(e)&&!/[a-zA-Z0-9]/.test(e)}function _(e){return e.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(t=>t.trim())}function V(e){if(!e)return[{type:"text",text:"",startChar:0,endChar:0}];let t=e.split(`
`),n=[],i=0,r=0,a=c=>t[c].length+(c<t.length-1?1:0);for(;i<t.length;)if(k(t[i])&&i+1<t.length&&H(t[i+1])){let h=r,s=[];for(;i<t.length&&k(t[i]);)s.push(t[i]),r+=a(i),i++;s.length>=3?n.push({type:"table",headers:_(s[0]),rows:s.slice(2).map(_),startChar:h,endChar:r}):n.push({type:"text",text:s.join(`
`),startChar:h,endChar:r})}else{let h=r,s=[];for(;i<t.length&&!(k(t[i])&&i+1<t.length&&H(t[i+1]));)s.push(t[i]),r+=a(i),i++;n.push({type:"text",text:s.join(`
`),startChar:h,endChar:r})}return n}function C(e){let t=e.split(`
`);for(let n=0;n+1<t.length;n++)if(k(t[n])&&H(t[n+1]))return!0;return!1}function $(e,t){let n=/\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g,i="",r=0,a;for(;(a=n.exec(e))!==null;){a.index>r&&(i+=g(e.slice(r,a.index)));let c=a[1],h=a[2],s=a[3],l=h&&s?` width="${h}" height="${s}"`:"",o=t[c];i+=o?`<img class="ng-img${l?" ng-img-sized":""}" src="${o}"${l} alt="${g(c)}" onclick="showLightbox(this.src)" title="\uD074\uB9AD\uD558\uC5EC \uD655\uB300">`:`<span class="ng-img-missing">${g(c)}</span>`,r=a.index+a[0].length}return r<e.length&&(i+=g(e.slice(r))),i}function Z(e,t){let n=e.headers.map(r=>`<th>${$(r,t)}</th>`).join(""),i=e.rows.map(r=>`<tr>${r.map(a=>`<td>${$(a,t)}</td>`).join("")}</tr>`).join("");return`<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${n}</tr></thead><tbody>${i}</tbody></table></div>`}function Q(e,t,n,i,r){let a=t?.color??"#888",c=t?.shape==="rounded"?"22px":"2px",h=g(t?.label??e.template),s=Math.round(e.position.x+n),l=Math.round(e.position.y+i),o="",f=e.content??"";if(C(f)){let p=V(f);o+='<div class="ng-content">';for(let u of p)u.type==="table"?o+=Z(u,r):u.text&&(o+=`<div class="ng-seg">${$(u.text,r).replace(/\n/g,"<br>")}</div>`);o+="</div>"}else f&&(o+=`<div class="ng-content">${$(f,r).replace(/\n/g,"<br>")}</div>`);if(e.original){let p=g(e.original.title??"Original"),u=e.originalExpanded?" open":"";o+=`<details class="ng-original"${u}><summary>${p}${e.original.location?` <span class="ng-loc">${g(e.original.location)}</span>`:""}</summary>
<div class="ng-orig-text">${g(e.original.text).replace(/\n/g,"<br>")}</div></details>`}for(let p of e.toggleItems??[])o+=`<details class="ng-toggle"${p.expanded?" open":""}><summary>${g(p.title||"(\uC81C\uBAA9 \uC5C6\uC74C)")}</summary>
<div class="ng-toggle-body">${g(p.content).replace(/\n/g,"<br>")}</div></details>`;e.links.length&&(o+=`<div class="ng-links">${e.links.map(p=>{let u=p.type==="url"?"\u{1F517}":p.type==="pdf"?"\u{1F4C4}":p.type==="obsidian"?"\u{1F7E3}":"\u2B21";return`<a class="ng-link"${p.type==="url"||p.type==="pdf"?` href="${g(p.target)}" target="_blank"`:""}>${u} ${g(p.label||p.target)}</a>`}).join("")}</div>`);let E=!!o,b=e.contentExpanded?"":' style="display:none"',I=e.children.length?` data-children="${e.children.join(",")}"`:"",S=C(f)?" ng-has-table":"",A=/\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g,v=0,w;for(;(w=A.exec(f))!==null;)v=Math.max(v,Number(w[1]));let m=v>0?C(f)?v+280:v+32:0,y=[e.nodeWidth?`min-width:${e.nodeWidth}px`:m>220?`min-width:${m}px`:"",e.nodeHeight?`min-height:${e.nodeHeight}px`:""].filter(Boolean).join(";");return`<div class="ng-node${S}" id="node-${g(e.id)}"${I} style="--color:${a};border-radius:${c};left:${s}px;top:${l}px${y?";"+y:""}">
  <div class="ng-header" onclick="onHeaderClick(this)" onmousedown="onNodeHeaderMousedown(event,this.parentNode)" title="\uD074\uB9AD: \uB178\uB4DC \uC120\uD0DD">
    <span class="ng-tag" style="background:color-mix(in srgb,${a} 22%,transparent);color:${a}">${h}</span>
    <span class="ng-title">${g(e.title)}</span>
    ${E?`<span class="ng-chevron" onclick="toggleFold(event,this.closest('.ng-header'))" title="\uC774 \uB178\uB4DC\uB9CC \uC811\uAE30/\uD3BC\uCE58\uAE30">${e.contentExpanded?"\u25B2":"\u25BC"}</span>`:""}
  </div>
  ${E?`<div class="ng-body"${b}${e.fontSize?` style="font-size:${e.fontSize}px"`:""}>${o}</div>`:""}
</div>`}function R(e,t={}){let n=1/0,i=1/0;for(let o of e.nodes)n=Math.min(n,o.position.x),i=Math.min(i,o.position.y);isFinite(n)||(n=0,i=0);let r=-n+100,a=-i+100,c=e.nodes.map(o=>Q(o,e.nodeTemplates[o.template],r,a,t)).join(`
`),h=JSON.stringify(e.nodes.map(o=>({id:o.id,lx:Math.round(o.position.x+r),ly:Math.round(o.position.y+a),children:o.children??[],template:o.template,contentExpanded:o.contentExpanded,isMain:(e.nodeTemplates[o.template]?.shape??"sharp")==="sharp",nodeHeight:o.nodeHeight??null,naturalY:Math.round((o.nodeNaturalY??o.position.y)+a)}))),s=JSON.stringify(e.edges.map(o=>({source:o.source,target:o.target,type:o.type,label:o.label||""}))),l=e.source?`${g(e.source.authors)} \xB7 ${g(e.source.venue)}`:"";return`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${g(e.title)}</title>
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
.ng-node{position:absolute;min-width:220px;max-width:500px;background:color-mix(in srgb,var(--color) 10%,#ffffff);border:1px solid color-mix(in srgb,var(--color) 40%,#e0e0e0);font-size:13px;transition:box-shadow .1s,top .35s ease,left .35s ease;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ng-has-table{max-width:none}
.ng-node.ng-selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--color) 80%,transparent),0 2px 8px rgba(0,0,0,.12)}
.ng-node.ng-dragging{opacity:.88;transition:box-shadow .1s;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:100}
.ng-header{display:flex;align-items:center;gap:6px;padding:6px 10px;cursor:pointer;user-select:none}
.ng-header:hover{background:rgba(0,0,0,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap}
.ng-title{flex:1;font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;min-width:0}
.ng-chevron{font-size:9px;opacity:.5;flex-shrink:0;padding:2px 4px;border-radius:2px}
.ng-chevron:hover{background:rgba(0,0,0,.08);opacity:.9}
.ng-body{padding:8px 10px 10px;font-size:12px}
.ng-content{line-height:1.6;color:#333;white-space:pre-wrap;word-break:break-word;margin-bottom:6px}
.ng-seg{white-space:pre-wrap;word-break:break-word;line-height:1.6;color:#333}
.ng-img-wrap{margin:4px 0}
.ng-table-wrap{overflow-x:auto;margin:6px 0}
.ng-table{border-collapse:collapse;background:#fff;font-size:inherit;white-space:normal}
.ng-table th{padding:5px 10px;border:1px solid #ddd;background:#f8f9fa;font-weight:600;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:normal}
.ng-table td{padding:5px 10px;border:1px solid #ddd;vertical-align:top;white-space:pre-wrap;word-break:normal}
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
    <span id="tb-title">${g(e.title)}</span>
    <span id="tb-source">${l}</span>
  </div>
  <div id="tb-row2">
    <button onclick="fitView()">Fit View</button>
    <div class="tb-sep"></div>
    <button onclick="doExpand()" title="\uC120\uD0DD \uB178\uB4DC+\uD558\uC704 \uD3BC\uCE58\uAE30 (\uC120\uD0DD \uC5C6\uC73C\uBA74 \uC804\uCCB4)">\uD3BC\uCE58\uAE30\u2193</button>
    <button onclick="doCollapse()" title="\uC120\uD0DD \uB178\uB4DC+\uD558\uC704 \uC811\uAE30 (\uC120\uD0DD \uC5C6\uC73C\uBA74 \uC804\uCCB4)">\uC811\uAE30\u2191</button>
    <div class="tb-sep"></div>
    <span id="tb-sel" style="opacity:.35">\uD074\uB9AD\uC73C\uB85C \uB178\uB4DC \uC120\uD0DD</span>
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
    ${c}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${h};
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
    if (label) { label.textContent = '\uC120\uD0DD: ' + (titleEl ? titleEl.textContent : nodeId); label.style.opacity = '0.9'; }
  } else {
    if (label) { label.textContent = '\uD074\uB9AD\uC73C\uB85C \uB178\uB4DC \uC120\uD0DD'; label.style.opacity = '0.35'; }
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

// \uB178\uB4DC \uB370\uC774\uD130 \uC870\uD68C
function getNodeDatum(nodeId) {
  for (var i = 0; i < NODES_DATA.length; i++) {
    if (NODES_DATA[i].id === nodeId) return NODES_DATA[i];
  }
  return null;
}

// \uBAA8\uB4E0 \uD558\uC704 \uB178\uB4DC \uC218\uC9D1 (\uC811\uAE30\uC6A9 \u2014 \uC81C\uD55C \uC5C6\uC774 \uC804\uCCB4)
function getAllDescendants(nodeId, visited) {
  visited = visited || [];
  if (visited.indexOf(nodeId) !== -1) return [];
  visited.push(nodeId);
  var result = [];
  var datum = getNodeDatum(nodeId);
  if (!datum) return result;
  // children \uBC30\uC5F4 + edges \uC591\uCABD \uBAA8\uB450 \uD3EC\uD568
  var childIds = (datum.children || []).slice();
  EDGES.forEach(function(e) { if (e.source === nodeId && childIds.indexOf(e.target) === -1) childIds.push(e.target); });
  childIds.forEach(function(childId) {
    result.push(childId);
    getAllDescendants(childId, visited).forEach(function(d) { result.push(d); });
  });
  return result;
}

// \uD3BC\uCE58\uAE30\uC6A9 \uD558\uC704 \uB178\uB4DC \uC218\uC9D1 \u2014 main_topic \uC790\uC2DD\uC740 \uAC74\uB108\uB700 (\uADF8 \uD558\uC704\uB3C4 \uD3EC\uD568 \uC548 \uD568)
// outgoing + incoming(non-main) \uC591\uBC29\uD5A5 edge \uD3EC\uD568\uD558\uC5EC \uB2E4\uC911 \uBD80\uBAA8 sub-node\uB97C \uC9C0\uC6D0
function getExpandDescendants(nodeId, isRoot, visited) {
  visited = visited || [];
  if (visited.indexOf(nodeId) !== -1) return [];
  visited.push(nodeId);
  var datum = getNodeDatum(nodeId);
  if (!datum) return [];
  // \uC9C1\uC0AC\uAC01\uD615(sharp/main) \uC790\uC2DD\uC740 \uD3EC\uD568\uD558\uC9C0 \uC54A\uC74C
  if (!isRoot && datum.isMain) return [];
  var result = [nodeId];
  var childIds = (datum.children || []).slice();
  EDGES.forEach(function(e) {
    // outgoing: \uC774 \uB178\uB4DC\uC5D0\uC11C \uB098\uAC00\uB294 edge
    if (e.source === nodeId && childIds.indexOf(e.target) === -1) childIds.push(e.target);
    // incoming from non-main: non-main \uB178\uB4DC\uAC00 \uC774 \uB178\uB4DC\uB97C \uD5A5\uD558\uB294 edge (\uB2E4\uC911 \uBD80\uBAA8 sub-node \uC9C0\uC6D0)
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

// <details> \uD1A0\uAE00(toggle items / original) \uC2DC \uB178\uB4DC \uB192\uC774\uAC00 \uBCC0\uD558\uBBC0\uB85C \uD654\uC0B4\uD45C \uC7AC\uACC4\uC0B0
// toggle \uC774\uBCA4\uD2B8\uB294 \uBC84\uBE14\uB9C1\uD558\uC9C0 \uC54A\uC544 capture phase \uD544\uC694
canvas.addEventListener('toggle', function() {
  setTimeout(recomputePositions, 0);
}, true);

// Toolbar: context-aware expand/collapse
function doExpand() {
  if (selectedNodeId) {
    applyFold(getExpandDescendants(selectedNodeId, true), true);
  } else {
    // \uC804\uCCB4 \uD3BC\uCE58\uAE30 \u2014 main_topic\uB294 \uD3EC\uD568\uD558\uB418 \uADF8 \uD558\uC704 main_topic\uB294 skip
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

// \uB178\uB4DC \uC704\uCE58\uB97C \uC6D0\uB798 \uBC30\uCE58 \uADF8\uB300\uB85C \uC720\uC9C0 \u2014 \uC811\uAE30/\uD3BC\uCE58\uAE30 \uC2DC \uB2E4\uB978 \uB178\uB4DC\uB97C \uBC00\uC9C0 \uC54A\uC74C
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
          // Rounded \u2192 main: skip only if descendant AND doesn't actually reach this node's Y
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
function drawEdges() {
  var svg=document.getElementById('wire-svg');
  svg.querySelectorAll('.ng-eg').forEach(function(el){el.remove();});
  EDGES.forEach(function(edge) {
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
  // KaTeX \uBA3C\uC800 \uB80C\uB354\uB9C1\uD574\uC57C \uB178\uB4DC \uB192\uC774\uAC00 \uC815\uD655\uD568
  initKatex();
  recomputePositions();
  drawEdges();
  fitView();
  // \uC774\uBBF8\uC9C0 \uB85C\uB4DC \uD6C4 \uB178\uB4DC \uB192\uC774 \uC7AC\uACC4\uC0B0 (base64 \uC774\uBBF8\uC9C0\uB3C4 \uBE44\uB3D9\uAE30\uB85C \uB192\uC774 \uD655\uC815\uB428)
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
</html>`}var N=class e{constructor(t){this.context=t;this._pendingSaves=new Set}static register(t){let n=new e(t);return d.window.registerCustomEditorProvider("nodegraph.editor",n,{webviewOptions:{retainContextWhenHidden:!0}})}async resolveCustomTextEditor(t,n,i){let r=d.Uri.joinPath(t.uri,"..");n.webview.options={enableScripts:!0,localResourceRoots:[this.context.extensionUri,r]},n.webview.html=this._getHtmlForWebview(n.webview);let a=s=>{try{let l=JSON.parse(t.getText()),o=O(n.webview,t.uri,l);n.webview.postMessage({type:s,data:l,imageUris:o})}catch{}},c=n.webview.onDidReceiveMessage(async s=>{if(s.type==="ready")a("load");else if(s.type==="save"){let l=t.uri.toString();this._pendingSaves.add(l);try{let o=new d.WorkspaceEdit,f=new d.Range(t.positionAt(0),t.positionAt(t.getText().length));o.replace(t.uri,f,JSON.stringify(s.data,null,2)),await d.workspace.applyEdit(o)}finally{this._pendingSaves.delete(l)}}else if(s.type==="openLink"){let l=s.link;if(l.type==="url")d.env.openExternal(d.Uri.parse(l.target));else if(l.type==="pdf"){let o=d.Uri.joinPath(d.Uri.joinPath(t.uri,".."),l.target);d.env.openExternal(o)}else l.type==="obsidian"&&d.env.openExternal(d.Uri.parse(l.target))}else if(s.type==="exportHtml")try{let l=s.data,o=d.Uri.joinPath(t.uri,".."),f=W.basename(t.uri.fsPath,".nodegraph.json"),E=d.Uri.joinPath(o,`.${f}-imgs`),b={},I=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g,S=async m=>{if(!(!m||b[m]))try{let y=d.Uri.joinPath(E,m),p=await d.workspace.fs.readFile(y),u=m.split(".").pop()?.toLowerCase()??"png",U=u==="jpg"||u==="jpeg"?"image/jpeg":u==="gif"?"image/gif":u==="webp"?"image/webp":"image/png";b[m]=`data:${U};base64,${Buffer.from(p).toString("base64")}`}catch{}};for(let m of l.nodes){I.lastIndex=0;let y;for(;(y=I.exec(m.content??""))!==null;)await S(y[1])}let A=R(l,b),v=d.Uri.joinPath(o,`${f}.html`);await d.workspace.fs.writeFile(v,Buffer.from(A,"utf-8"));let w=await d.window.showInformationMessage(`HTML exported: ${f}.html`,"Open in Browser","Show in Explorer");w==="Open in Browser"?d.env.openExternal(v):w==="Show in Explorer"&&d.commands.executeCommand("revealFileInOS",v)}catch(l){d.window.showErrorMessage(`HTML export failed: ${l}`)}else if(s.type==="saveImage")try{let{filename:l,webviewUri:o}=await Y(n.webview,t.uri,s.data,s.ext??"png");n.webview.postMessage({type:"imageSaved",nodeId:s.nodeId,filename:l,webviewUri:o})}catch(l){d.window.showErrorMessage(`Failed to save image: ${l}`)}else s.type==="deleteImageFile"&&await L(t.uri,s.filename)}),h=d.workspace.onDidChangeTextDocument(s=>{s.document.uri.toString()===t.uri.toString()&&(this._pendingSaves.has(t.uri.toString())||a("externalChange"))});n.onDidDispose(()=>{c.dispose(),h.dispose()})}_getHtmlForWebview(t){let n=t.asWebviewUri(d.Uri.joinPath(this.context.extensionUri,"dist","webview.js")),i=t.asWebviewUri(d.Uri.joinPath(this.context.extensionUri,"dist","katex","katex.min.css")),r=ee();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${t.cspSource} blob: data:; script-src 'nonce-${r}'; style-src 'unsafe-inline' ${t.cspSource}; font-src ${t.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeGraph</title>
  <link rel="stylesheet" href="${i}">
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
  <script nonce="${r}" src="${n}"></script>
</body>
</html>`}};function ee(){let e="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)e+=t.charAt(Math.floor(Math.random()*t.length));return e}function te(e){e.subscriptions.push(N.register(e))}function ne(){}0&&(module.exports={activate,deactivate});
