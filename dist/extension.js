"use strict";var J=Object.create;var H=Object.defineProperty;var Q=Object.getOwnPropertyDescriptor;var Z=Object.getOwnPropertyNames;var ee=Object.getPrototypeOf,te=Object.prototype.hasOwnProperty;var re=(t,e)=>{for(var r in e)H(t,r,{get:e[r],enumerable:!0})},F=(t,e,r,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Z(e))!te.call(t,i)&&i!==r&&H(t,i,{get:()=>e[i],enumerable:!(n=Q(e,i))||n.enumerable});return t};var T=(t,e,r)=>(r=t!=null?J(ee(t)):{},F(e||!t||!t.__esModule?H(r,"default",{value:t,enumerable:!0}):r,t)),ne=t=>F(H({},"__esModule",{value:!0}),t);var ve={};re(ve,{activate:()=>me,deactivate:()=>xe});module.exports=ne(ve);var m=T(require("vscode"));var l=T(require("vscode")),q=T(require("path"));var I=T(require("vscode"));function Y(t){let e=I.Uri.joinPath(t,".."),r=t.path.split("/").pop()?.replace(/\.nodegraph\.json$/,"")??"graph";return I.Uri.joinPath(e,`.${r}-imgs`)}function oe(t,e,r){let n=I.Uri.joinPath(Y(e),r);return t.asWebviewUri(n).toString()}var W=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;function L(t,e,r){let n={},i=s=>{s&&!n[s]&&(n[s]=oe(t,e,s))};for(let s of r.nodes){W.lastIndex=0;let u;for(;(u=W.exec(s.content??""))!==null;)i(u[1])}for(let s of r.canvasImages??[])i(s.filename);return n}async function j(t,e,r,n="png"){let i=Y(e);try{await I.workspace.fs.createDirectory(i)}catch{}let s=`img_${Date.now()}.${n}`,u=I.Uri.joinPath(i,s);return await I.workspace.fs.writeFile(u,Buffer.from(r,"base64")),{filename:s,webviewUri:t.asWebviewUri(u).toString()}}async function G(t,e){let r=I.Uri.joinPath(Y(t),e);try{await I.workspace.fs.delete(r)}catch{}}function x(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function ie(t){let e=t.trim().replace("#",""),r=e.length===3?e.split("").map(n=>n+n).join(""):e;return/^[0-9a-fA-F]{6}$/.test(r)?{r:255-parseInt(r.slice(0,2),16),g:255-parseInt(r.slice(2,4),16),b:255-parseInt(r.slice(4,6),16)}:null}var ae=t=>t.replace(/[^a-zA-Z0-9_-]/g,"_");function P(t){return/^\s*\|/.test(t)&&t.indexOf("|",1)!==-1}function _(t){return/^\s*\|[\s\-:|]+\|\s*$/.test(t)&&!/[a-zA-Z0-9]/.test(t)}function U(t){return t.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(e=>e.trim())}function se(t){if(!t)return[{type:"text",text:"",startChar:0,endChar:0}];let e=t.split(`
`),r=[],n=0,i=0,s=u=>e[u].length+(u<e.length-1?1:0);for(;n<e.length;)if(P(e[n])&&n+1<e.length&&_(e[n+1])){let h=i,a=[];for(;n<e.length&&P(e[n]);)a.push(e[n]),i+=s(n),n++;a.length>=3?r.push({type:"table",headers:U(a[0]),rows:a.slice(2).map(U),startChar:h,endChar:i}):r.push({type:"text",text:a.join(`
`),startChar:h,endChar:i})}else{let h=i,a=[];for(;n<e.length&&!(P(e[n])&&n+1<e.length&&_(e[n+1]));)a.push(e[n]),i+=s(n),n++;r.push({type:"text",text:a.join(`
`),startChar:h,endChar:i})}return r}function O(t){let e=t.split(`
`);for(let r=0;r+1<e.length;r++)if(P(e[r])&&_(e[r+1]))return!0;return!1}function de(t){return x(t).replace(/\\\$/g,()=>'<span class="ng-cur">$</span>')}function B(t){return de(t).replace(/\*\*(.+?)\*\*/g,'<strong style="font-size:1.1em">$1</strong>')}function R(t,e){let r=/\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g,n="",i=0,s;for(;(s=r.exec(t))!==null;){s.index>i&&(n+=B(t.slice(i,s.index)));let u=s[1],h=s[2],a=s[3],d=h&&a?` width="${h}" height="${a}"`:"",c=e[u];n+=c?`<img class="ng-img${d?" ng-img-sized":""}" src="${c}"${d} alt="${x(u)}" onclick="showLightbox(this.src)" title="Click to enlarge">`:`<span class="ng-img-missing">${x(u)}</span>`,i=s.index+s[0].length}return i<t.length&&(n+=B(t.slice(i))),n}function le(t,e){let r=t.headers.map(i=>`<th>${R(i,e)}</th>`).join(""),n=t.rows.map(i=>`<tr>${i.map(s=>`<td>${R(s,e)}</td>`).join("")}</tr>`).join("");return`<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${r}</tr></thead><tbody>${n}</tbody></table></div>`}function ce(t,e,r,n,i){let s=e?.color??"#888",u=e?.shape==="rounded"?"22px":"2px",h=x(e?.label??t.template),a=Math.round(t.position.x+r),d=Math.round(t.position.y+n),c="",o=t.content??"";if(O(o)){let p=se(o);c+='<div class="ng-content">';for(let y of p)y.type==="table"?c+=le(y,i):y.text&&(c+=`<div class="ng-seg">${R(y.text,i).replace(/\n/g,"<br>")}</div>`);c+="</div>"}else o&&(c+=`<div class="ng-content">${R(o,i).replace(/\n/g,"<br>")}</div>`);if(t.original){let p=x(t.original.title??"Original"),y=t.originalExpanded?" open":"";c+=`<details class="ng-original"${y}><summary>${p}${t.original.location?` <span class="ng-loc">${x(t.original.location)}</span>`:""}</summary>
<div class="ng-orig-text">${B(t.original.text).replace(/\n/g,"<br>")}</div></details>`}for(let p of t.toggleItems??[])c+=`<details class="ng-toggle"${p.expanded?" open":""}><summary>${x(p.title||"(untitled)")}</summary>
<div class="ng-toggle-body">${B(p.content).replace(/\n/g,"<br>")}</div></details>`;t.links.length&&(c+=`<div class="ng-links">${t.links.map(p=>{let y=p.type==="url"?"\u{1F517}":p.type==="pdf"?"\u{1F4C4}":p.type==="obsidian"?"\u{1F7E3}":"\u2B21";return`<a class="ng-link"${p.type==="url"||p.type==="pdf"?` href="${x(p.target)}" target="_blank"`:""}>${y} ${x(p.label||p.target)}</a>`}).join("")}</div>`);let E=!!c,g=t.contentExpanded?"":' style="display:none"',k=t.children.length?` data-children="${t.children.join(",")}"`:"",S=O(o)?" ng-has-table":"",M=/\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g,w=0,D;for(;(D=M.exec(o))!==null;)w=Math.max(w,Number(D[1]));let v=w>0?O(o)?w+280:w+32:0,f=[t.nodeWidth?`min-width:${t.nodeWidth}px`:v>432?`min-width:${v}px`:"",t.nodeHeight&&t.contentExpanded?`min-height:${t.nodeHeight}px`:""].filter(Boolean).join(";"),N=t.nodeHeight?` data-min-h="${t.nodeHeight}"`:"";return`<div class="ng-node${S}" id="node-${x(t.id)}"${k}${N} style="--color:${s};border-radius:${u};left:${a}px;top:${d}px${f?";"+f:""}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${s} 22%,transparent);color:${s}">${h}</span>
    ${E?`<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${x(t.title)}</span>`:`<span class="ng-title">${x(t.title)}</span>`}
  </div>
  ${E?`<div class="ng-body"${g}${t.fontSize?` style="font-size:${t.fontSize}px"`:""}>${c}</div>`:""}
</div>`}function z(t,e={}){let r=1/0,n=1/0;for(let o of t.nodes)r=Math.min(r,o.position.x),n=Math.min(n,o.position.y);isFinite(r)||(r=0,n=0);let i=-r+100,s=-n+100,u=t.nodes.map(o=>ce(o,t.nodeTemplates[o.template],i,s,e)).join(`
`),h=JSON.stringify(t.nodes.map(o=>({id:o.id,lx:Math.round(o.position.x+i),ly:Math.round(o.position.y+s),children:o.children??[],template:o.template,contentExpanded:o.contentExpanded,isMain:(t.nodeTemplates[o.template]?.shape??"sharp")==="sharp",nodeHeight:o.nodeHeight??null,naturalY:Math.round((o.nodeNaturalY??o.position.y)+s),searchText:[o.title,o.content??"",o.original?.text??""].join(" ").toLowerCase()}))),a=JSON.stringify(t.edges.map(o=>({source:o.source,target:o.target,type:o.type,label:o.label||""}))),d=t.source?`${x(t.source.authors)} \xB7 ${x(t.source.venue)}`:"",c=Object.entries(t.nodeTemplates).map(([o,E])=>{let g=ie(E.color),k=g?`rgb(${g.r},${g.g},${g.b})`:"#ff3b30",S=g?`rgba(${g.r},${g.g},${g.b},0.18)`:"rgba(255,59,48,0.18)";return`::highlight(ng-hit-${ae(o)}){color:${k};background-color:${S};text-decoration:underline}`}).join(`
`);return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${x(t.title)}</title>
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
${c}
/* \uC120\uD0DD \uB178\uB4DC\uC758 \uD55C \uC138\uB300(\uBD80\uBAA8+\uC790\uC2DD) \uD558\uC774\uB77C\uC774\uD2B8 \u2014 Esc\uB85C\uB9CC \uD574\uC81C */
.ng-node.ng-gen{border:2px solid #f87171 !important;box-shadow:0 0 0 3px rgba(248,113,113,.3),0 1px 4px rgba(0,0,0,.08) !important}
</style>
</head>
<body>
<div id="toolbar">
  <div id="tb-row1">
    <span id="tb-title">${x(t.title)}</span>
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
        <marker id="arrow-hl" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#ef4444"/>
        </marker>
      </defs>
    </svg>
    ${u}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${h};
var EDGES = ${a};
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

// \uCC3D \uD06C\uAE30 \uBCC0\uACBD: \uD654\uBA74 \uC911\uC559\uC5D0 \uBCF4\uC774\uB358 \uC9C0\uC810\uC744 \uC911\uC559\uC5D0 \uC720\uC9C0\uD558\uBA74\uC11C,
// \uCC3D \uB108\uBE44 \uBE44\uC728\uB9CC\uD07C \uC2A4\uCF00\uC77C\uB3C4 \uD568\uAED8 \uC870\uC815 (\uC904\uC774\uBA74 \uCD95\uC18C, \uB2E4\uC2DC \uD0A4\uC6B0\uBA74 \uD655\uB300 \u2014 \uB300\uCE6D \uB3D9\uC791)
var lastVW = 0, lastVH = 0;
(function() {
  var r = vp.getBoundingClientRect();
  lastVW = r.width; lastVH = r.height;
})();
window.addEventListener('resize', function() {
  syncViewportTop();
  var r = vp.getBoundingClientRect();
  if (lastVW > 0 && r.width > 0) {
    var cxw = (lastVW / 2 - tx) / scale;   // \uAE30\uC874 \uC911\uC559\uC758 \uC6D4\uB4DC \uC88C\uD45C
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
// \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8\uC758 \uB8E8\uD2B8(pin): \uBC30\uACBD \uD074\uB9AD\uC73C\uB85C \uC120\uD0DD\uC774 \uD480\uB824\uB3C4 \uC720\uC9C0, Esc\uB85C\uB9CC \uD574\uC81C
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
  // \uD558\uC774\uB77C\uC774\uD2B8 \uB8E8\uD2B8\uB294 tag \uD074\uB9AD(onNodeTagMousedown)\uC5D0\uC11C\uB9CC \uAC31\uC2E0 \u2014 \uC77C\uBC18 \uD074\uB9AD/fold\uB294
  // \uD558\uC774\uB77C\uC774\uD2B8\uB97C \uBC14\uAFB8\uC9C0 \uC54A\uC74C. \uC120\uD0DD \uC2A4\uD0C0\uC77C \uC6B0\uC120 \uADDC\uCE59\uB9CC \uC7AC\uC801\uC6A9 (wire \uC0C9\uC740 \uBD88\uBCC0)
  updateGenHighlight();
}

// \uC120\uD0DD \uB178\uB4DC\uC758 \uD55C \uC138\uB300(\uBD80\uBAA8+\uC790\uC2DD) \uC774\uC6C3 ID \uC218\uC9D1 \u2014 edges \uC591\uBC29\uD5A5 + children \uBC30\uC5F4
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

// \uACE0\uC815\uB41C \uB8E8\uD2B8\uC640 \uADF8 \uC774\uC6C3 \uB178\uB4DC\uB4E4\uC5D0 \uBE68\uAC04 \uD14C\uB450\uB9AC \uC801\uC6A9 (wire \uC0C9\uC740 drawEdges\uC5D0\uC11C \uCC98\uB9AC)
// \uB8E8\uD2B8 \uC790\uC2E0\uB3C4 \uBE68\uAC04\uC0C9 \u2014 \uC120\uD0DD \uC0C1\uD0DC\uC5EC\uB3C4 \uD558\uC774\uB77C\uC774\uD2B8\uAC00 \uC6B0\uC120 (\uC5D0\uB514\uD130\uC640 \uB3D9\uC77C)
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
// \uC811\uD798/\uD3BC\uCE68 \uC2DC min-height \uB3D9\uAE30\uD654 \u2014 \uC811\uD78C \uB178\uB4DC\uAC00 \uC218\uB3D9 \uB9AC\uC0AC\uC774\uC988 \uB192\uC774\uB85C \uB0A8\uB294 \uBC84\uADF8 \uBC29\uC9C0
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
    if (chevron) chevron.textContent = expand ? '\u25B2' : '\u25BC';
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
  // tag \uD074\uB9AD = \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8 pin (\uBC30\uCE58 \uBD88\uBCC0 \u2192 A* \uCE90\uC2DC \uC7AC\uC0AC\uC6A9, \uC0C9\uB9CC \uC989\uC2DC \uAC31\uC2E0)
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
    // \uB4DC\uB86D\uB41C \uB80C\uB354 \uC88C\uD45C\uB97C \uADF8\uB300\uB85C \uC800\uC7A5 \u2014 \uBC00\uB824\uC788\uB358 \uB178\uB4DC\uC5D0 delta\uB97C \uB354\uD558\uBA74 \uB4DC\uB86D \uC704\uCE58\uC640 \uC5B4\uAE0B\uB0A8
    if (moved) { lastWasDrag = true; if (nodeDatum) { nodeDatum.lx = left0 + finalDX; nodeDatum.ly = top0 + finalDY; nodeDatum.naturalY = nodeDatum.ly; } setTimeout(recomputePositions, 0); }
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function recomputePositions() {
  // Canvas.tsx\uC758 computeRenderPositions\uC640 \uB3D9\uC77C\uD55C \uC54C\uACE0\uB9AC\uC998 (vanilla JS \uBC84\uC804)
  // main/sub \uAD6C\uBD84 \uC5C6\uC774 X \uCEEC\uB7FC \uB2E8\uC704\uB85C \uBB36\uC5B4 \uADF8\uB9AC\uB514 \uD328\uD0B9 \u2192 unfold \uC2DC push-down, fold \uC2DC pull-up

  var nodeMap = {};
  NODES_DATA.forEach(function(n) { nodeMap[n.id] = n; });

  function getH(n) {
    var el = document.getElementById('node-' + n.id);
    if (el) return el.offsetHeight;
    // DOM \uBBF8\uC874\uC7AC fallback: \uC811\uD78C \uB178\uB4DC\uB294 \uD56D\uC0C1 \uD5E4\uB354 \uB192\uC774
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

  // union-find: X \uBC94\uC704\uAC00 \uACB9\uCE58\uB294 \uB178\uB4DC\uB07C\uB9AC \uAC19\uC740 \uCEEC\uB7FC\uC73C\uB85C \uBB36\uAE30
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

  // \uCEEC\uB7FC\uC744 min X \uC624\uB984\uCC28\uC21C(\uC67C\u2192\uC624)\uC73C\uB85C \uC815\uB82C
  var columns = Object.keys(colMap).map(function(k) { return colMap[k]; }).sort(function(a, b) {
    var minXA = Math.min.apply(null, a.map(function(n) { return n.lx; }));
    var minXB = Math.min.apply(null, b.map(function(n) { return n.lx; }));
    return minXA - minXB;
  });

  var renderY = {};

  // \uC774\uBBF8 \uD329\uD0B9\uB41C \uC67C\uCABD \uCEEC\uB7FC\uC758 \uC5F0\uACB0 \uB178\uB4DC \uAE30\uC900\uC73C\uB85C effectiveOriginY \uACC4\uC0B0
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
        // \uD655\uC7A5\uB41C \uB178\uB4DC\uAC00 \uC774 \uB178\uB4DC \uC704\uCE58\uB97C \uB36E\uC74C \u2192 bottom \uC544\uB798\uB85C (\uD3BC\uCE68 \uC5EC\uBC31 48px)
        effY = Math.max(effY, otherBottom + 48);
      } else {
        // \uC811\uD78C \uC0C1\uD0DC: Y \uC774\uB3D9 delta\uB9CC \uC804\uD30C
        effY = Math.max(effY, node.ly + otherPush);
      }
    });
    return effY;
  }

  // \uCEEC\uB7FC\uBCC4 \uADF8\uB9AC\uB514 \uD328\uD0B9 (\uC67C\u2192\uC624)
  columns.forEach(function(col) {
    // effectiveOriginY\uB97C \uD329\uD0B9 \uC804\uC5D0 \uBAA8\uB450 \uACC4\uC0B0 (\uD329\uD0B9 \uC911 renderY \uBCC0\uACBD \uC601\uD5A5 \uCC28\uB2E8)
    var effYMap = {};
    col.forEach(function(n) { effYMap[n.id] = getEffY(n); });

    // effectiveOriginY \uC624\uB984\uCC28\uC21C \uC815\uB82C, \uB3D9\uB960\uC774\uBA74 originalY \uAE30\uC900
    col.sort(function(a, b) {
      var ea = effYMap[a.id], eb = effYMap[b.id];
      return ea !== eb ? ea - eb : a.ly - b.ly;
    });

    // gap \uADDC\uCE59\uC740 \uC2E4\uC81C X\uBC94\uC704\uAC00 \uACB9\uCE58\uB294(pairwise) \uB178\uB4DC\uB07C\uB9AC\uB9CC \uC801\uC6A9
    // \u2014 \uCCB4\uC778\uC73C\uB85C\uB9CC \uAC19\uC740 \uCEEC\uB7FC\uC5D0 \uBB36\uC778 \uBA3C \uB178\uB4DC\uAC00 \uBC00\uC5B4\uB0B4\uC9C0 \uC54A\uB3C4\uB85D
    // \uC801\uC751\uD615 gap: \uB458 \uB2E4 \uC811\uD798 \u2192 \uCD18\uCD18(20/30), \uD55C\uCABD\uC774\uB77C\uB3C4 \uD3BC\uCE68 \u2192 48px (\uAC00\uB3C5\uC131)
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

  // Pass 3: line \uC5E3\uC9C0 \uBC84\uC2A4 \uADF8\uB8F9 Y \uC815\uADDC\uD654 (gap 30px)
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

  // Pass 4: \uAC00\uB85C \uAC04\uACA9 \uD655\uBCF4 \u2014 \uB178\uB4DC \uB2E8\uC704 X-\uD328\uD0B9 (Y-\uD328\uD0B9\uC744 90\xB0 \uD68C\uC804\uD55C \uADF8\uB9AC\uB514)
  // \uC138\uB85C\uB85C \uACB9\uCE58\uB294 \uB450 \uB178\uB4DC\uAC00 \uAC00\uB85C\uB85C H_GAP \uC774\uB0B4\uB85C \uBD99\uC73C\uBA74 \uC624\uB978\uCABD \uB178\uB4DC\uB97C \uBC00\uC5B4\uB0C4
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
        var ox = renderX[other.id];  // \uC774\uBBF8 \uBC30\uCE58\uB41C(\uC67C\uCABD\uBD80\uD130 \uCC98\uB9AC) \uB178\uB4DC\uB9CC \uC874\uC7AC
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
  // \uBC30\uCE58\uAC00 \uBC14\uB00C\uC5C8\uC73C\uBBC0\uB85C A* \uCE90\uC2DC \uBB34\uD6A8\uD654 \u2014 \uC989\uC2DC \uACBD\uB7C9\uC73C\uB85C \uADF8\uB9AC\uACE0 \uC7A0\uC7A0\uD574\uC9C0\uBA74 \uC815\uBC00\uD654
  routesDirty=true;
  drawEdges(true);
  scheduleEdgeRefine();
}

// Edge drawing
// A* \uB77C\uC6B0\uD305 \uCE90\uC2DC: \uB178\uB4DC \uBC30\uCE58\uAC00 \uBC14\uB014 \uB54C\uB9CC(routesDirty) \uC7AC\uACC4\uC0B0 \u2014 \uC0C9\uC0C1 \uBCC0\uACBD \uB4F1\uC740 \uC7AC\uC0AC\uC6A9
var cachedRoutes=null, routesDirty=true;
var edgeRefineTimer=null;
// fold/\uB4DC\uB86D \uC9C1\uD6C4: \uACBD\uB7C9 \uD734\uB9AC\uC2A4\uD2F1\uC73C\uB85C \uC989\uC2DC \uADF8\uB9B0 \uB4A4 150ms \uD6C4 A* \uC815\uBC00 \uACBD\uB85C\uB85C \uAD50\uCCB4
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

// \u2500\u2500 \uC7A5\uC560\uBB3C \uD68C\uD53C \uB77C\uC6B0\uD305 (\uC5D0\uB514\uD130 wireGeometry.getRoutedPath\uC640 \uB3D9\uC77C \uC54C\uACE0\uB9AC\uC998) \u2500\u2500
// \uC120\uBD84\uC774 (pad\uB9CC\uD07C \uBD80\uD480\uB9B0) \uC0AC\uAC01\uD615\uACFC \uAD50\uCC28\uD558\uBA74 \uC9C4\uC785 t(0~1), \uC544\uB2C8\uBA74 null (Liang-Barsky)
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
// src\u2192tgt \uC9C1\uC120\uC774 \uB178\uB4DC\uB97C \uAD00\uD1B5\uD558\uBA74 \uC704/\uC544\uB798(\uB610\uB294 \uC88C/\uC6B0) \uC9E7\uC740 \uCABD\uC73C\uB85C \uC6B0\uD68C \uACBD\uC720\uC810 \uC0BD\uC785
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
    // i \uC720\uC9C0 \u2192 a\u2192w \uC138\uADF8\uBA3C\uD2B8 \uC7AC\uAC80\uC0AC
  }
  return pts;
}
// \uACBD\uC720\uC810 \uD3F4\uB9AC\uB77C\uC778 \u2192 \uBD80\uB4DC\uB7EC\uC6B4 path (\uACBD\uC720\uC810 = Q \uC81C\uC5B4\uC810, \uB2E4\uC74C \uACBD\uC720\uC810\uACFC\uC758 \uC911\uC810 \uC5F0\uACB0)
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
// \uD3F4\uB9AC\uB77C\uC778 \uC911\uAC04 \uACBD\uC720\uC810\uB4E4\uC744 \uBC95\uC120 \uBC29\uD5A5\uC73C\uB85C spread\uB9CC\uD07C \uC774\uB3D9 (\uD3C9\uD589 \uC5E3\uC9C0 \uBD84\uC0B0)
function spreadPts(pts,spread){
  if(!spread||pts.length<3) return pts;
  var s=pts[0],t=pts[pts.length-1];
  var dl=dlen(s,t)||1;
  var nx=-(t.y-s.y)/dl,ny=(t.x-s.x)/dl;
  var mid=pts.slice(1,-1).map(function(p){return{x:p.x+nx*spread,y:p.y+ny*spread};});
  return [s].concat(mid,[t]);
}
// \u2500\u2500 \uADF8\uB9AC\uB4DC A* \uC804\uC5ED \uB77C\uC6B0\uD305 (\uC5D0\uB514\uD130 wireGeometry.routeEdgesOnGrid\uC640 \uB3D9\uC77C \uC54C\uACE0\uB9AC\uC998) \u2500\u2500
// \uC140 \uBE44\uC6A9: \uB178\uB4DC \uB0B4\uBD80 200(\uBD88\uAC00\uD53C\uD558\uBA74 \uD1B5\uACFC \uAC00\uB2A5), \uB178\uB4DC \uC8FC\uBCC0 \uBC34\uB4DC 3(\uAC70\uB9AC \uC720\uC9C0),
// \uC774\uBBF8 \uD655\uC815\uB41C \uC120\uC774 \uC9C0\uB098\uAC04 \uC140 +4(\uC120\uB07C\uB9AC \uBD84\uC0B0 \u2014 \uBE48 \uACF5\uAC04\uC774 \uC788\uC73C\uBA74 \uADF8\uCABD\uC73C\uB85C \uC6B0\uD68C)
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
  // \uC9E7\uC740 \uC5E3\uC9C0\uBD80\uD130 (\uB3D9\uB960\uC774\uBA74 srcId/tgtId \uC0AC\uC804\uC21C \u2014 \uC5D0\uB514\uD130\uC640 \uACB0\uACFC \uC77C\uCE58 \uBCF4\uC7A5)
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
    // \uACBD\uB85C \uBCF5\uC6D0 (\uC140 \uC911\uC2EC) \u2014 \uC591 \uB05D\uC740 \uC2E4\uC81C \uD3EC\uD2B8 \uC88C\uD45C\uB85C \uB300\uCCB4
    var cellsRev=[];
    for(var c=tIdx;c!==-1;c=fromArr[c])cellsRev.push(c);
    cellsRev.reverse();
    var raw=cellsRev.map(function(c2){return{x:minX+(c2%gw)*cell+cell/2,y:minY+((c2/gw)|0)*cell+cell/2};});
    raw[0]={x:req.src.x,y:req.src.y};
    raw[raw.length-1]={x:req.tgt.x,y:req.tgt.y};
    // string pulling: \uC790\uAE30 \uC591\uB05D \uB178\uB4DC\uB97C \uC81C\uC678\uD55C \uB178\uB4DC \uB0B4\uBD80\uB97C \uC9C0\uB098\uC9C0 \uC54A\uB294 \uD55C \uC9C1\uC120\uD654
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
    // \uC774\uD6C4 \uC5E3\uC9C0\uC758 congestion \uBE44\uC6A9: \uD655\uC815 \uACBD\uB85C\uAC00 \uC9C0\uB098\uB294 \uC140\uC5D0 \uAC00\uC0B0
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
    // \uBAA8\uB4E0 \uD0C0\uAC9F\uC758 \uC67C\uCABD \uB05D\uC774 source \uC624\uB978\uCABD \uB05D + 40px \uC774\uC0C1\uC77C \uB54C\uB9CC bus (\uC5D0\uB514\uD130\uC640 \uC870\uAC74 \uD1B5\uC77C)
    var allRight=targets.every(function(t){return t.r.x>sr.x+sr.w+40;});
    if(!allRight) return;

    var busX=sr.x+sr.w+Math.min.apply(null,targets.map(function(t){return t.r.x-(sr.x+sr.w);})) * 0.5;
    var srcAnchorY=sr.cy;
    var minTY=Math.min.apply(null,targets.map(function(t){return t.r.cy;}));
    var maxTY=Math.max.apply(null,targets.map(function(t){return t.r.cy;}));
    var busMinY=Math.min(srcAnchorY,minTY);
    var busMaxY=Math.max(srcAnchorY,maxTY);

    // \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8: \uB8E8\uD2B8\uAC00 source\uAC70\uB098 \uD0C0\uAC9F \uC911 \uD558\uB098\uBA74 \uD2B8\uB801\uD06C(\uACF5\uC6A9 \uAD6C\uAC04)\uB3C4 \uBE68\uAC04\uC0C9
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

  // \uB178\uB4DC rect \uCE90\uC2DC (\uC5E3\uC9C0 \uB77C\uC6B0\uD305 \uC7A5\uC560\uBB3C \uAC80\uC0AC\uC6A9 \u2014 drawEdges 1\uD68C\uB2F9 1\uD68C\uB9CC DOM \uC870\uD68C)
  var rectById={};
  NODES_DATA.forEach(function(n){
    var el=document.getElementById('node-'+n.id);
    if(el) rectById[n.id]=getNodeRect(el);
  });

  // \uAC19\uC740 source\uC5D0\uC11C \uB098\uAC00\uAC70\uB098 \uAC19\uC740 target\uC73C\uB85C \uBAA8\uC774\uB294 \uBE44-\uBC84\uC2A4 \uC5E3\uC9C0 \uBD84\uC0B0 \uC624\uD504\uC14B (\uD569\uC0B0)
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

  // \uADF8\uB9AC\uB4DC A* \uC804\uC5ED \uB77C\uC6B0\uD305 \u2014 \uB4DC\uB798\uADF8 \uC911(fast)\uC5D0\uB294 \uC2A4\uD0B5\uD558\uACE0 \uACBD\uB7C9 \uD734\uB9AC\uC2A4\uD2F1 \uC0AC\uC6A9.
  // \uB808\uC774\uC544\uC6C3\uC774 \uBC14\uB00C\uC9C0 \uC54A\uC740 \uC7AC\uD638\uCD9C(\uD558\uC774\uB77C\uC774\uD2B8 \uC0C9\uB9CC \uBCC0\uACBD \uB4F1)\uC740 \uCE90\uC2DC\uB97C \uC7AC\uC0AC\uC6A9\uD574 \uC989\uC2DC \uCC98\uB9AC
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
      // \uADF8\uB9AC\uB4DC A* \uACBD\uB85C (\uB178\uB4DC \uD68C\uD53C + congestion \uBD84\uC0B0) + \uAC19\uC740 \uC18C\uC2A4/\uD0C0\uAC9F \uBB36\uC74C \uBD84\uC0B0
      d=ptsToPath(spreadPts(gridPts,spread));
    } else if(gridPts){
      // \uC9C1\uC120 \uACBD\uB85C: \uAE30\uC874 bezier \uBAA8\uC591 \uC720\uC9C0 (spread\uB9CC\uD07C \uC81C\uC5B4\uC810\uC744 \uBC95\uC120 \uBC29\uD5A5 \uC774\uB3D9)
      var bend=Math.min(ddl*.45,150);
      var cx1=sp[0]+spD[0]*bend+nx*spread,cy1=sp[1]+spD[1]*bend+nyv*spread;
      var cx2=tp[0]+tpD[0]*bend+nx*spread,cy2=tp[1]+tpD[1]*bend+nyv*spread;
      d='M'+sp[0]+','+sp[1]+' C'+cx1+','+cy1+' '+cx2+','+cy2+' '+tp[0]+','+tp[1];
    } else {
      // \uB4DC\uB798\uADF8 \uC911(fast) \uB610\uB294 A* \uC2E4\uD328: \uACBD\uB7C9 \uC6B0\uD68C \uD734\uB9AC\uC2A4\uD2F1
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
    // \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8: \uB8E8\uD2B8 \uB178\uB4DC\uC640 \uC9C1\uC811 \uC5F0\uACB0\uB41C wire\uB294 \uBE68\uAC04\uC0C9
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
    // Esc = \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8 \uD574\uC81C (\uBC30\uACBD \uD074\uB9AD\uC73C\uB85C\uB294 \uD574\uC81C\uB418\uC9C0 \uC54A\uC74C)
    if(genRootId){genRootId=null;updateGenHighlight();drawEdges();}
  }
});
// Middle click: prevent X11 primary selection paste
vp.addEventListener('mousedown',function(e){if(e.button===1) e.preventDefault();});
// \uC881\uC740 \uD654\uBA74: \uD234\uBC14 \uBC84\uD2BC \uD589 \uAC00\uB85C \uC2AC\uB77C\uC774\uB4DC (Shift+\uD720 / \uAC00\uB85C\uD720 / \uD130\uCE58 \uC2A4\uC640\uC774\uD504\uB294 native)
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
// \uAC80\uC0C9\uC5B4 \uC778\uB77C\uC778 \uD558\uC774\uB77C\uC774\uD2B8 (CSS Custom Highlight API \u2014 \uBBF8\uC9C0\uC6D0 \uBE0C\uB77C\uC6B0\uC800\uB294 \uC870\uC6A9\uD788 \uBB34\uC2DC)
// \uB9E4\uCE58 \uB178\uB4DC\uC758 \uD14D\uC2A4\uD2B8\uC5D0\uC11C \uAC80\uC0C9\uC5B4 \uBD80\uBD84\uB9CC Range\uB85C \uC218\uC9D1, \uD15C\uD50C\uB9BF\uBCC4 \uBC18\uC804\uC0C9 \uC2A4\uD0C0\uC77C \uC801\uC6A9
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
  updateTextHits();
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
</html>`}var A=class t{constructor(e){this.context=e;this._pendingSaves=new Set}static register(e){let r=new t(e);return l.window.registerCustomEditorProvider("nodegraph.editor",r,{webviewOptions:{retainContextWhenHidden:!0}})}static{this._activeWebview=null}static postToActive(e){t._activeWebview?.postMessage(e)}async resolveCustomTextEditor(e,r,n){let i=l.Uri.joinPath(e.uri,"..");r.webview.options={enableScripts:!0,localResourceRoots:[this.context.extensionUri,i]},r.webview.html=this._getHtmlForWebview(r.webview);let s=a=>{try{let d=JSON.parse(e.getText()),c=L(r.webview,e.uri,d);r.webview.postMessage({type:a,data:d,imageUris:c})}catch{}},u=r.webview.onDidReceiveMessage(async a=>{if(a.type==="ready")s("load");else if(a.type==="save"){let d=e.uri.toString();this._pendingSaves.add(d);try{let c=new l.WorkspaceEdit,o=new l.Range(e.positionAt(0),e.positionAt(e.getText().length));c.replace(e.uri,o,JSON.stringify(a.data,null,2)),await l.workspace.applyEdit(c),await e.save()}finally{this._pendingSaves.delete(d)}}else if(a.type==="openLink"){let d=a.link;if(d.type==="url")l.env.openExternal(l.Uri.parse(d.target));else if(d.type==="pdf"){let c=l.Uri.joinPath(l.Uri.joinPath(e.uri,".."),d.target);l.env.openExternal(c)}else d.type==="obsidian"&&l.env.openExternal(l.Uri.parse(d.target))}else if(a.type==="exportHtml")try{let d=a.data,c=l.Uri.joinPath(e.uri,".."),o=q.basename(e.uri.fsPath,".nodegraph.json"),E=l.Uri.joinPath(c,`.${o}-imgs`),g={},k=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g,S=async v=>{if(!(!v||g[v]))try{let f=l.Uri.joinPath(E,v),N=await l.workspace.fs.readFile(f),p=v.split(".").pop()?.toLowerCase()??"png",y=p==="jpg"||p==="jpeg"?"image/jpeg":p==="gif"?"image/gif":p==="webp"?"image/webp":"image/png";g[v]=`data:${y};base64,${Buffer.from(N).toString("base64")}`}catch{}};for(let v of d.nodes){k.lastIndex=0;let f;for(;(f=k.exec(v.content??""))!==null;)await S(f[1])}let M=z(d,g),w=l.Uri.joinPath(c,`${o}.html`);await l.workspace.fs.writeFile(w,Buffer.from(M,"utf-8"));let D=await l.window.showInformationMessage(`HTML exported: ${o}.html`,"Open in Browser","Show in Explorer");D==="Open in Browser"?l.env.openExternal(w):D==="Show in Explorer"&&l.commands.executeCommand("revealFileInOS",w)}catch(d){l.window.showErrorMessage(`HTML export failed: ${d}`)}else if(a.type==="saveImage")try{let{filename:d,webviewUri:c}=await j(r.webview,e.uri,a.data,a.ext??"png");r.webview.postMessage({type:"imageSaved",nodeId:a.nodeId,filename:d,webviewUri:c})}catch(d){l.window.showErrorMessage(`Failed to save image: ${d}`)}else if(a.type==="deleteImageFile")await G(e.uri,a.filename);else if(a.type==="reload")try{let d=await l.workspace.fs.readFile(e.uri),c=Buffer.from(d).toString("utf-8"),o=JSON.parse(c),E=L(r.webview,e.uri,o);r.webview.postMessage({type:"load",data:o,imageUris:E})}catch{s("load")}}),h=l.workspace.onDidChangeTextDocument(a=>{a.document.uri.toString()===e.uri.toString()&&(this._pendingSaves.has(e.uri.toString())||s("externalChange"))});t._activeWebview=r.webview,r.onDidChangeViewState(a=>{a.webviewPanel.active&&(t._activeWebview=r.webview)}),r.onDidDispose(()=>{u.dispose(),h.dispose(),t._activeWebview===r.webview&&(t._activeWebview=null)})}_getHtmlForWebview(e){let r=e.asWebviewUri(l.Uri.joinPath(this.context.extensionUri,"dist","webview.js")),n=e.asWebviewUri(l.Uri.joinPath(this.context.extensionUri,"dist","katex","katex.min.css")),i=pe();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${e.cspSource} blob: data:; script-src 'nonce-${i}'; style-src 'unsafe-inline' ${e.cspSource}; font-src ${e.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeGraph</title>
  <link rel="stylesheet" href="${n}">
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
  <script nonce="${i}" src="${r}"></script>
</body>
</html>`}};function pe(){let t="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let r=0;r<32;r++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}var C=T(require("vscode")),K=T(require("child_process"));function $(t){try{return K.execSync(t,{timeout:5e3,stdio:["pipe","pipe","pipe"]}).toString().trim()}catch{return""}}function b(t){return $(t)!==""}async function V(t){if(!t||t.length===0)return;let e=[],r=new Date().toISOString(),n=process.platform,i=n==="win32"?"Windows":n==="darwin"?"macOS":"Linux",s=process.arch,u=$("python3 --version 2>&1")||$("python --version 2>&1"),h=b("python3 --version 2>&1")?"python3":b("python --version 2>&1")?"python":"",a=h!=="",d=a&&b(`${h} -c "import fitz" 2>&1 && echo ok`),c=d?$(`${h} -c "import fitz; print(fitz.__version__)"`):"",o=a&&b(`${h} -c "import pdfplumber" 2>&1 && echo ok`),E=a&&b(`${h} -c "import pdfminer" 2>&1 && echo ok`),g=a&&b(`${h} -c "from PIL import Image" 2>&1 && echo ok`),k=g?$(`${h} -c "from PIL import __version__; print(__version__)"`):"",S=a&&b(`${h} -c "import cv2" 2>&1 && echo ok`),M=b("pdftotext -v 2>&1 && echo ok")||b("pdftotext --help 2>&1 && echo ok"),w=b("convert --version 2>&1 && echo ok"),D=b("magick --version 2>&1 && echo ok"),v=b("gs --version 2>&1 && echo ok")||b("gswin64c --version 2>&1 && echo ok"),f=p=>p?"\u2705":"\u274C";e.push("# NodeGraph \u2014 Agent Environment Report"),e.push(""),e.push("> Auto-generated by the NodeGraph extension at activation."),e.push("> **AI agents: read this file to understand what tools are available on this machine.**"),e.push("> Re-generated each time a `.nodegraph.json` file is opened."),e.push(""),e.push(`Generated: \`${r}\``),e.push(""),e.push("---"),e.push(""),e.push("## System"),e.push(""),e.push("| | |"),e.push("|---|---|"),e.push(`| OS | ${i} (\`${n}\`) |`),e.push(`| Architecture | \`${s}\` |`),e.push(`| Python | ${a?`${f(!0)} \`${u}\``:`${f(!1)} not found`} |`),e.push(`| Python command | ${a?`\`${h}\``:"N/A"} |`),e.push(""),e.push("---"),e.push(""),e.push("## PDF Reading Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| PyMuPDF (\`fitz\`) | ${f(d)} | ${d?`v${c} \u2014 recommended`:"Install: `pip install pymupdf`"} |`),e.push(`| pdfplumber | ${f(o)} | ${o?"available":"Install: `pip install pdfplumber`"} |`),e.push(`| pdfminer | ${f(E)} | ${E?"available":"Install: `pip install pdfminer.six`"} |`),e.push(`| poppler (\`pdftotext\`) | ${f(M)} | ${M?"CLI tool available":n==="win32"?"Install: download poppler for Windows":n==="darwin"?"Install: `brew install poppler`":"Install: `apt install poppler-utils`"} |`),e.push(`| Ghostscript (\`gs\`) | ${f(v)} | ${v?"available":"optional"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Image Processing Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| Pillow (\`PIL\`) | ${f(g)} | ${g?`v${k} \u2014 recommended`:"Install: `pip install Pillow`"} |`),e.push(`| OpenCV (\`cv2\`) | ${f(S)} | ${S?"available":"Install: `pip install opencv-python`"} |`),e.push(`| ImageMagick (\`convert\`) | ${f(w||D)} | ${w||D?"CLI tool available":n==="win32"?"Install: imagemagick.org":n==="darwin"?"Install: `brew install imagemagick`":"Install: `apt install imagemagick`"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Agent Recommendations"),e.push(""),a||(e.push("> \u26A0\uFE0F **Python not found.** PDF reading and image processing via Python are not available."),e.push("> Install Python from https://python.org, then reopen a `.nodegraph.json` file to re-run this check."),e.push("")),e.push("### Reading a PDF"),d?(e.push("Use PyMuPDF (recommended \u2014 fastest and most accurate):"),e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push('text = "\\n".join(page.get_text() for page in doc)'),e.push("```")):o?(e.push("Use pdfplumber:"),e.push("```python"),e.push("import pdfplumber"),e.push('with pdfplumber.open("paper.pdf") as pdf:'),e.push('    text = "\\n".join(p.extract_text() or "" for p in pdf.pages)'),e.push("```")):M?(e.push("Use poppler CLI:"),e.push("```bash"),e.push("pdftotext paper.pdf -"),e.push("```")):e.push("\u274C No PDF reading tool available. Ask the user to install PyMuPDF: `pip install pymupdf`"),e.push(""),e.push("### Extracting images from a PDF"),d?(e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push("for i, page in enumerate(doc):"),e.push("    for img in page.get_images():"),e.push("        xref = img[0]"),e.push("        pix = fitz.Pixmap(doc, xref)"),e.push('        pix.save(f"fig_{i}_{xref}.png")'),e.push("```")):g?e.push("Pillow is available but cannot extract from PDF directly. Use PyMuPDF for extraction."):e.push("\u274C No image extraction tool available."),e.push(""),e.push("---"),e.push(""),e.push("*To refresh this report, reopen any `.nodegraph.json` file.*");let N=e.join(`
`);for(let p of t){let y=C.Uri.joinPath(p.uri,".agent"),X=C.Uri.joinPath(y,"ENVIRONMENT.md");try{await C.workspace.fs.createDirectory(y),await C.workspace.fs.writeFile(X,Buffer.from(N,"utf-8"))}catch{}}}var he=[{id:"tomoki1207.pdf",name:"vscode-pdf (PDF Viewer)"}];async function ue(){for(let t of he)if(!m.extensions.getExtension(t.id))try{await m.commands.executeCommand("workbench.extensions.installExtension",t.id)}catch{}}var ge={main_topic:{label:"Main topic",color:"#4B8BBE",icon:"file-text",shape:"sharp"},method:{label:"Method",color:"#5C9E6E",icon:"cpu",shape:"sharp"},result:{label:"Result",color:"#9B59B6",icon:"bar-chart-2",shape:"sharp"},claim:{label:"Claim",color:"#E74C3C",icon:"alert-circle",shape:"sharp"},question:{label:"Question",color:"#E5A835",icon:"help-circle",shape:"rounded"},gap:{label:"Gap / Idea",color:"#1ABC9C",icon:"lightbulb",shape:"rounded"},reference:{label:"Reference",color:"#95A5A6",icon:"book-open",shape:"rounded"},memo:{label:"Memo",color:"#BDC3C7",icon:"edit-3",shape:"rounded"}};async function fe(){let t=m.workspace.workspaceFolders?.[0]?.uri,e=t?m.Uri.joinPath(t,"untitled.nodegraph.json"):void 0,r=await m.window.showSaveDialog({defaultUri:e,filters:{NodeGraph:["nodegraph.json"]},title:"Create New NodeGraph"});if(!r)return;let n=r.fsPath.endsWith(".nodegraph.json")?r:r.with({path:r.path.replace(/(\.nodegraph)?(\.json)?$/,"")+".nodegraph.json"}),i=new Date().toISOString(),s={version:"1.0.0",title:"New Graph",created:i,modified:i,nodeTemplates:ge,nodes:[],edges:[],viewport:{x:0,y:0,zoom:1}};await m.workspace.fs.writeFile(n,Buffer.from(JSON.stringify(s,null,2),"utf-8")),await m.commands.executeCommand("vscode.openWith",n,"nodegraph.editor")}function me(t){t.subscriptions.push(A.register(t)),t.subscriptions.push(m.commands.registerCommand("nodegraph.search",()=>{A.postToActive({type:"openSearch"})}),m.commands.registerCommand("nodegraph.fitView",()=>{A.postToActive({type:"fitView"})}),m.commands.registerCommand("nodegraph.collapseAll",()=>{A.postToActive({type:"collapseAll"})}),m.commands.registerCommand("nodegraph.expandAll",()=>{A.postToActive({type:"expandAll"})}),m.commands.registerCommand("nodegraph.new",()=>fe())),V(m.workspace.workspaceFolders??[]),ue()}function xe(){}0&&(module.exports={activate,deactivate});
