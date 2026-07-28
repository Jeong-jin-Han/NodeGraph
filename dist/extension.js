"use strict";var oe=Object.create;var B=Object.defineProperty;var ie=Object.getOwnPropertyDescriptor;var ae=Object.getOwnPropertyNames;var se=Object.getPrototypeOf,de=Object.prototype.hasOwnProperty;var le=(e,t)=>{for(var r in t)B(e,r,{get:t[r],enumerable:!0})},z=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of ae(t))!de.call(e,o)&&o!==r&&B(e,o,{get:()=>t[o],enumerable:!(n=ie(t,o))||n.enumerable});return e};var C=(e,t,r)=>(r=e!=null?oe(se(e)):{},z(t||!e||!e.__esModule?B(r,"default",{value:e,enumerable:!0}):r,e)),ce=e=>z(B({},"__esModule",{value:!0}),e);var Se={};le(Se,{activate:()=>Ie,deactivate:()=>ke});module.exports=ce(Se);var u=C(require("vscode"));var c=C(require("vscode")),Q=C(require("path"));var I=C(require("vscode"));function U(e){let t=I.Uri.joinPath(e,".."),r=e.path.split("/").pop()?.replace(/\.nodegraph\.json$/,"")??"graph";return I.Uri.joinPath(t,`.${r}-imgs`)}function pe(e,t,r){let n=I.Uri.joinPath(U(t),r);return e.asWebviewUri(n).toString()}var q=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;function X(e,t,r){let n={},o=s=>{s&&!n[s]&&(n[s]=pe(e,t,s))};for(let s of r.nodes){q.lastIndex=0;let l;for(;(l=q.exec(s.content??""))!==null;)o(l[1])}for(let s of r.canvasImages??[])o(s.filename);return n}async function V(e,t,r,n="png"){let o=U(t);try{await I.workspace.fs.createDirectory(o)}catch{}let s=`img_${Date.now()}.${n}`,l=I.Uri.joinPath(o,s);return await I.workspace.fs.writeFile(l,Buffer.from(r,"base64")),{filename:s,webviewUri:e.asWebviewUri(l).toString()}}async function K(e,t){let r=I.Uri.joinPath(U(e),t);try{await I.workspace.fs.delete(r)}catch{}}function x(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function he(e){let t=e.trim().replace("#",""),r=t.length===3?t.split("").map(n=>n+n).join(""):t;return/^[0-9a-fA-F]{6}$/.test(r)?{r:255-parseInt(r.slice(0,2),16),g:255-parseInt(r.slice(2,4),16),b:255-parseInt(r.slice(4,6),16)}:null}var ue=e=>e.replace(/[^a-zA-Z0-9_-]/g,"_");function $(e){return/^\s*\|/.test(e)&&e.indexOf("|",1)!==-1}function G(e){return/^\s*\|[\s\-:|]+\|\s*$/.test(e)&&!/[a-zA-Z0-9]/.test(e)}function J(e){return e.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(t=>t.trim())}function fe(e){if(!e)return[{type:"text",text:"",startChar:0,endChar:0}];let t=e.split(`
`),r=[],n=0,o=0,s=l=>t[l].length+(l<t.length-1?1:0);for(;n<t.length;)if($(t[n])&&n+1<t.length&&G(t[n+1])){let h=o,i=[];for(;n<t.length&&$(t[n]);)i.push(t[n]),o+=s(n),n++;i.length>=3?r.push({type:"table",headers:J(i[0]),rows:i.slice(2).map(J),startChar:h,endChar:o}):r.push({type:"text",text:i.join(`
`),startChar:h,endChar:o})}else{let h=o,i=[];for(;n<t.length&&!($(t[n])&&n+1<t.length&&G(t[n+1]));)i.push(t[n]),o+=s(n),n++;r.push({type:"text",text:i.join(`
`),startChar:h,endChar:o})}return r}function j(e){let t=e.split(`
`);for(let r=0;r+1<t.length;r++)if($(t[r])&&G(t[r+1]))return!0;return!1}function ge(e){return x(e).replace(/\\\$/g,()=>'<span class="ng-cur">$</span>')}function H(e){return ge(e).replace(/\*\*(.+?)\*\*/g,'<strong style="font-size:1.1em">$1</strong>')}function L(e,t){let r=/\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g,n="",o=0,s;for(;(s=r.exec(e))!==null;){s.index>o&&(n+=H(e.slice(o,s.index)));let l=s[1],h=s[2],i=s[3],d=h&&i?` width="${h}" height="${i}"`:"",p=t[l];n+=p?`<img class="ng-img${d?" ng-img-sized":""}" src="${p}"${d} alt="${x(l)}" onclick="showLightbox(this.src)" title="Click to enlarge">`:`<span class="ng-img-missing">${x(l)}</span>`,o=s.index+s[0].length}return o<e.length&&(n+=H(e.slice(o))),n}function me(e,t){let r=e.headers.map(o=>`<th>${L(o,t)}</th>`).join(""),n=e.rows.map(o=>`<tr>${o.map(s=>`<td>${L(s,t)}</td>`).join("")}</tr>`).join("");return`<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${r}</tr></thead><tbody>${n}</tbody></table></div>`}function ve(e,t,r,n,o){let s=t?.color??"#888",l=t?.shape==="rounded"?"22px":"2px",h=x(t?.label??e.template),i=Math.round(e.position.x+r),d=Math.round(e.position.y+n),p="",a=e.content??"";if(j(a)){let m=fe(a);p+='<div class="ng-content">';for(let M of m)M.type==="table"?p+=me(M,o):M.text&&(p+=`<div class="ng-seg">${L(M.text,o).replace(/\n/g,"<br>")}</div>`);p+="</div>"}else a&&(p+=`<div class="ng-content">${L(a,o).replace(/\n/g,"<br>")}</div>`);if(e.original){let m=x(e.original.title??"Original"),M=e.originalExpanded?" open":"";p+=`<details class="ng-original"${M}><summary>${m}${e.original.location?` <span class="ng-loc">${x(e.original.location)}</span>`:""}</summary>
<div class="ng-orig-text">${H(e.original.text).replace(/\n/g,"<br>")}</div></details>`}for(let m of e.toggleItems??[])p+=`<details class="ng-toggle" data-toggle-id="${x(m.id)}"${m.expanded?" open":""}><summary>${x(m.title||"(untitled)")}</summary>
<div class="ng-toggle-body">${H(m.content).replace(/\n/g,"<br>")}</div></details>`;e.links.length&&(p+=`<div class="ng-links">${e.links.map(m=>{let M=m.type==="url"?"\u{1F517}":m.type==="pdf"?"\u{1F4C4}":m.type==="obsidian"?"\u{1F7E3}":"\u2B21";return`<a class="ng-link"${m.type==="url"||m.type==="pdf"?` href="${x(m.target)}" target="_blank"`:""}>${M} ${x(m.label||m.target)}</a>`}).join("")}</div>`);let g=!!p,v=e.contentExpanded?"":' style="display:none"',k=e.children.length?` data-children="${e.children.join(",")}"`:"",S=j(a)?" ng-has-table":"",N=/\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g,w=0,A;for(;(A=N.exec(a))!==null;)w=Math.max(w,Number(A[1]));let f=w>0?j(a)?w+280:w+32:0,D=Math.max(e.nodeWidth??0,432,f),R=[D>432?`min-width:${D}px`:"",e.nodeHeight&&e.contentExpanded?`min-height:${e.nodeHeight}px`:""].filter(Boolean).join(";"),O=e.nodeHeight?` data-min-h="${e.nodeHeight}"`:"";return`<div class="ng-node${S}" id="node-${x(e.id)}"${k}${O} style="--color:${s};border-radius:${l};left:${i}px;top:${d}px${R?";"+R:""}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${s} 20%,transparent);color:${s}">${h}</span>
    ${g?`<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${x(e.title)}</span>`:`<span class="ng-title">${x(e.title)}</span>`}
  </div>
  ${g?`<div class="ng-body"${v}${e.fontSize?` style="font-size:${e.fontSize}px"`:""}>${p}</div>`:""}
</div>`}function Z(e,t={}){let r=1/0,n=1/0;for(let a of e.nodes)r=Math.min(r,a.position.x),n=Math.min(n,a.position.y);isFinite(r)||(r=0,n=0);let o=-r+100,s=-n+100,l=e.nodes.map(a=>ve(a,e.nodeTemplates[a.template],o,s,t)).join(`
`),h=JSON.stringify(e.nodes.map(a=>({id:a.id,lx:Math.round(a.position.x+o),ly:Math.round(a.position.y+s),children:a.children??[],template:a.template,contentExpanded:a.contentExpanded,isMain:a.template==="main_topic",nodeHeight:a.nodeHeight??null,naturalY:Math.round((a.nodeNaturalY??a.position.y)+s),title:a.title,content:a.content??"",originalTitle:a.original?.title??"",originalText:a.original?.text??"",toggles:(a.toggleItems??[]).map(g=>({id:g.id,title:g.title,content:g.content}))}))),i=JSON.stringify(e.edges.map(a=>({source:a.source,target:a.target,type:a.type,label:a.label||""}))),d=JSON.stringify(Object.fromEntries(Object.entries(e.nodeTemplates).map(([a,g])=>[a,g.label]))),p=Object.entries(e.nodeTemplates).map(([a,g])=>{let v=he(g.color),k=v?`rgb(${v.r},${v.g},${v.b})`:"#ff3b30",S=v?`rgba(${v.r},${v.g},${v.b},0.18)`:"rgba(255,59,48,0.18)";return`::highlight(ng-hit-${ue(a)}){color:${k};background-color:${S};text-decoration:underline}`}).join(`
`);return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${x(e.title)}</title>
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
${p}
/* \uC120\uD0DD \uB178\uB4DC\uC758 \uD55C \uC138\uB300(\uBD80\uBAA8+\uC790\uC2DD) \uD558\uC774\uB77C\uC774\uD2B8 \u2014 Esc\uB85C\uB9CC \uD574\uC81C */
.ng-node.ng-gen{border:2px solid #f87171 !important;box-shadow:0 0 0 3px rgba(248,113,113,.3),0 1px 4px rgba(0,0,0,.08) !important}
</style>
</head>
<body>
<div id="toolbar">
  <div id="tb-row1">
    <span id="tb-title">${x(e.title)}</span>
  </div>
  <div id="tb-row2">
    <select id="tb-filter" title="Filter Collapse/Expand to one node type"></select>
    <button onclick="doCollapse()" title="Collapse selected node + children (all if none selected; all if a type filter is set) \u2014 collapsing everything also fits the view">\u{1F4C1} Collapse</button>
    <button onclick="doExpand()" title="Expand selected node + children (all if none selected; only the filtered type if a type filter is set)">\u{1F4C2} Expand</button>
    <button onclick="fitView()">Fit View</button>
    <button id="tb-grid-btn" onclick="toggleGrid()" style="display:inline-flex;align-items:center;gap:4px" title="Toggle debug grid \u2014 vertical lines mark hop-level boundaries, horizontal lines mark main-topic cluster boundaries">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
      </svg>
      Grid
    </button>
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
    ${l}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${h};
var EDGES = ${i};
var NODE_TEMPLATES = ${d};
var HEADER_H = 36;

// Collapse/Expand \uB77C\uBCA8 \uD544\uD130 \uB4DC\uB86D\uB2E4\uC6B4 \uCC44\uC6B0\uAE30 (\uC5D0\uB514\uD130\uC758 \uB77C\uBCA8 \uD544\uD130\uC640 \uB3D9\uC77C\uD55C \uC635\uC158/\uB3D9\uC791)
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
  // \uC811\uD600 \uC788\uB294 \uB3D9\uC548\uC5D4 .ng-content\uAC00 display:none\uC774\uB77C \uCE21\uC815\uC774 \uC804\uBD80 0\uC73C\uB85C \uB098\uC640 More
  // \uBC84\uD2BC\uC774 \uD544\uC694\uC5C6\uB2E4\uACE0 \uC798\uBABB \uD310\uB2E8\uB418\uBBC0\uB85C, \uB2E4\uC2DC \uBCF4\uC774\uAC8C \uB420 \uB54C \uC774 \uB178\uB4DC\uB9CC \uC7AC\uCE21\uC815
  if (expanding) applyContentCaps(nodeEl);
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

function applyFold(nodeIds, expand, after) {
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
  setTimeout(function() { recomputePositions(); if (after) after(); }, 0);
}

// Recompute positions when <details> toggles change node height.
// 'toggle' does not bubble so we use capture phase.
canvas.addEventListener('toggle', function() {
  setTimeout(recomputePositions, 0);
}, true);

// Toolbar: context-aware expand/collapse
// \uB77C\uBCA8 \uD544\uD130: None\uC774\uBA74 \uAE30\uC874 \uB3D9\uC791 \uADF8\uB300\uB85C. \uD2B9\uC815 \uD0C0\uC785\uC774\uBA74 Collapse\uB294 \uD56D\uC0C1 \uC804\uCCB4 \uC811\uC74C,
// Expand\uB294 \uADF8 \uD0C0\uC785 \uB178\uB4DC\uB9CC \uD3BC\uCE58\uACE0 \uB098\uBA38\uC9C0\uB294 \uAC15\uC81C\uB85C \uC811\uC74C (\uBD80\uBAA8/\uC790\uC2DD \uAD00\uACC4 \uBB34\uC2DC, \uC5D0\uB514\uD130\uC640 \uB3D9\uC77C \uADDC\uCE59)
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
    // Expand all \u2014 include main_topic roots but skip nested main_topic subtrees
    var toExpand = [];
    NODES_DATA.forEach(function(n) {
      if (toExpand.indexOf(n.id) !== -1) return;
      getExpandDescendants(n.id, true).forEach(function(d) { if (toExpand.indexOf(d) === -1) toExpand.push(d); });
    });
    applyFold(toExpand, true);
  }
}
// \uC804\uCCB4 collapse(\uC120\uD0DD \uC5C6\uC774, \uB610\uB294 \uD544\uD130\uAC00 \uAC78\uB824 \uC788\uC5B4\uB3C4 \uACB0\uAD6D \uC804\uCCB4)\uC77C \uB54C\uB9CC \uC790\uB3D9\uC73C\uB85C
// Fit View \u2014 \uC120\uD0DD \uC11C\uBE0C\uD2B8\uB9AC\uB9CC \uC811\uC744 \uB550 \uC0AC\uC6A9\uC790\uAC00 \uBCF4\uB358 \uC601\uC5ED\uC744 \uC720\uC9C0\uD574\uC57C \uD558\uBBC0\uB85C \uB300\uC0C1\uC5D0\uC11C
// \uC81C\uC678 (\uC5D0\uB514\uD130\uC640 \uB3D9\uC77C \uADDC\uCE59).
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

// \uB4DC\uB86D\uB41C \uB178\uB4DC\uC758 raw \uC704\uCE58(lx/ly)\uB97C \uD615\uC81C\uB4E4 \uC0AC\uC774\uC5D0\uC11C \uC2E4\uC81C\uB85C \uC5B4\uB514 \uB5A8\uC5B4\uC84C\uB294\uC9C0\uC5D0 \uB9DE\uCDB0 \uB2E4\uC2DC
// \uACC4\uC0B0\uD55C\uB2E4. onUp\uC774 \uADF8\uB0E5 "\uB4DC\uB86D\uB41C \uB80C\uB354 \uC88C\uD45C\uB97C \uADF8\uB300\uB85C \uC800\uC7A5"\uD558\uBA74, \uADF8 \uB80C\uB354 \uC88C\uD45C\uB294 raw \uC88C\uD45C\uC640
// \uC804\uD600 \uB2E4\uB978 \uC88C\uD45C\uACC4(\uB808\uC774\uC544\uC6C3 \uC54C\uACE0\uB9AC\uC998\uC774 raw\uB97C \uB300\uD3ED \uC7AC\uBC30\uCE58\uD558\uB294 \uAC8C \uC774 \uC54C\uACE0\uB9AC\uC998\uC758 \uC874\uC7AC
// \uC774\uC720)\uB77C \uD615\uC81C\uB4E4\uC758 raw ly \uBC94\uC704\uB97C \uC644\uC804\uD788 \uBC97\uC5B4\uB098\uB294 \uACBD\uC6B0\uAC00 \uD754\uD558\uACE0, \uADF8 \uACB0\uACFC \uB2E4\uC74C \uC7AC\uBC30\uCE58 \uB54C
// \uD56D\uC0C1 \uB9E8 \uC704/\uB9E8 \uC544\uB798\uB85C \uD295\uAE30\uB294 \uAC83\uCC98\uB7FC \uBCF4\uC778\uB2E4(\uC5D0\uB514\uD130\uC5D0\uC11C\uB3C4 \uAC19\uC740 \uBC84\uADF8\uAC00 \uC788\uC5C8\uC74C). \uB4DC\uB86D \uC2DC\uC810\uC758
// DOM \uC704\uCE58(\uD615\uC81C\uB4E4\uC740 \uC774 \uB4DC\uB798\uADF8 \uB3D9\uC548 \uD55C \uBC88\uB3C4 \uC548 \uC6C0\uC9C1\uC600\uC73C\uBBC0\uB85C \uC5EC\uC804\uD788 \uC815\uD655\uD55C \uBC30\uCE58 \uC0C1\uD0DC\uB97C
// \uBC18\uC601\uD568)\uB97C \uAE30\uC900\uC73C\uB85C \uC5B4\uB290 \uB450 \uD615\uC81C \uC0AC\uC774\uC5D0 \uB193\uC600\uB294\uC9C0 \uCC3E\uC544 \uADF8 \uC0AC\uC774 \uAC12\uC73C\uB85C raw ly\uB97C \uB9DE\uCD98\uB2E4.
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

  // lx\uB3C4 \uB4DC\uB798\uADF8 \uC911 \uB80C\uB354 \uC88C\uD45C\uAC00 raw\uC5D0 \uC11E\uC5EC \uB4E4\uC5B4\uAC00 \uC624\uC5FC\uB410\uC744 \uC218 \uC788\uC73C\uBBC0\uB85C, \uAC19\uC740 side \uD615\uC81C\uC758
  // raw lx\uB97C \uBE4C\uB824 \uBC14\uB85C\uC7A1\uB294\uB2E4(side \uC804\uD658\uCC98\uB7FC \uD615\uC81C\uAC00 \uC5C6\uB294 \uACBD\uC6B0\uB294 \uAC74\uB4DC\uB9AC\uC9C0 \uC54A\uC74C).
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
    // \uB4DC\uB86D\uB41C \uB80C\uB354 \uC88C\uD45C\uB97C \uC77C\uB2E8 \uADF8\uB300\uB85C \uC800\uC7A5\uD55C \uB4A4, \uD615\uC81C\uB4E4 \uC0AC\uC774 \uC2E4\uC81C \uC704\uCE58\uC5D0 \uB9DE\uCDB0 raw\uB85C
    // \uC7AC\uD574\uC11D\uD55C\uB2E4(reconcileDroppedPosition \u2014 \uC704 \uCC38\uACE0, \uB80C\uB354 \uC88C\uD45C\uB97C raw\uC5D0 \uADF8\uB300\uB85C \uC4F0\uBA74 \uC548
    // \uB418\uB294 \uC774\uC720).
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

// Canvas.tsx\uC758 computeRenderPositions\uC640 \uC644\uC804\uD788 \uB3D9\uC77C\uD55C hop-tree bottom-up/top-down
// \uC54C\uACE0\uB9AC\uC998\uC758 vanilla JS \uC774\uC2DD \u2014 \uC608\uC804\uC5D4 X \uACB9\uCE68 \uAE30\uC900 union-find \uCEEC\uB7FC + \uADF8\uB9AC\uB514 Y-\uD328\uD0B9\uC774\uB77C\uB294
// \uC644\uC804\uD788 \uB2E4\uB978(\uB354 \uC624\uB798\uB41C) \uC54C\uACE0\uB9AC\uC998\uC744 \uC37C\uB294\uB370, \uADF8 \uBC29\uC2DD\uC740 hop depth \uAC1C\uB150\uC774 \uC5C6\uC5B4\uC11C \uBE0C\uB79C\uCE58\uB9C8\uB2E4
// hop-1/hop-2\uAC00 \uC11C\uB85C \uB2E4\uB978 X\uC5D0\uC11C \uC2DC\uC791\uD558\uB294 \uBB38\uC81C\uAC00 \uC788\uC5C8\uC74C(\uC0AC\uC6A9\uC790\uAC00 Grid \uC624\uBC84\uB808\uC774\uB85C \uC9C1\uC811
// \uD655\uC778\uD574\uC11C \uBC1C\uACAC \u2014 "hop1\uACFC hop2 \uAC00\uB85C \uC2DC\uC791 \uC704\uCE58\uAC00 \uB3D9\uC77C\uD558\uC9C0 \uC54A\uC544\uC11C"). \uC5D0\uB514\uD130\uC640 \uC815\uD655\uD788 \uAC19\uC740
// \uACB0\uACFC\uAC00 \uB098\uC624\uB3C4\uB85D \uC54C\uACE0\uB9AC\uC998 \uC790\uCCB4\uB97C \uAD50\uCCB4.
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

  // main topic(\uBC31\uBCF8) \uAE30\uC900 \uC88C/\uC6B0 \u2014 \uC138\uB85C \uBC30\uCE58(\uC544\uB798)\uC640 \uAC00\uB85C \uC815\uB82C(Pass 4) \uC591\uCABD\uC5D0\uC11C \uC67C\uCABD/\uC624\uB978\uCABD
  // \uC790\uC2DD\uC744 \uB3C5\uB9BD\uC801\uC73C\uB85C \uB2E4\uB8E8\uAE30 \uC704\uD574 \uBA3C\uC800 \uACC4\uC0B0\uD574\uB454\uB2E4.
  var sideOf = {};
  NODES_DATA.forEach(function(n) {
    if (tree.depthOf[n.id] === 0) { sideOf[n.id] = 0; return; }
    var root = nodeMap[tree.rootOf[n.id]];
    sideOf[n.id] = n.lx >= root.lx ? 1 : -1;
  });

  // \uAC01 \uBD80\uBAA8\uC758 \uC790\uC2DD\uB4E4\uC744 \uC800\uC7A5\uB41C \uC0C1\uB300 Y(\uB514\uC790\uC778 \uC758\uB3C4\uC0C1 \uC21C\uC11C) \uAE30\uC900\uC73C\uB85C \uC815\uB82C
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

  // \uD615\uC81C \uADF8\uB8F9\uC744 \uBD80\uBAA8\uC758 \uC6D0\uB798 Y \uAE30\uC900 \uC704/\uC544\uB798\uB85C, \uADF8\uB9AC\uACE0 \uC88C/\uC6B0(side)\uB85C \uBD84\uB9AC\uD55C\uB2E4. \uC67C\uCABD/\uC624\uB978\uCABD
  // \uC790\uC2DD\uC740 \uC11C\uB85C \uB2E4\uB978 X\uC5D0 \uADF8\uB824\uC838 \uC138\uB85C \uACF5\uAC04\uC744 \uC808\uB300 \uACF5\uC720\uD558\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uB3C5\uB9BD\uC801\uC73C\uB85C \uACC4\uC0B0\uD574\uC57C
  // \uD55C\uCABD\uC774 \uCEE4\uC9C8 \uB54C \uBC18\uB300\uCABD \uBD84\uAE30\uC810\uAE4C\uC9C0 \uAC19\uC774 \uBC00\uB9AC\uB294 \uAC78 \uB9C9\uB294\uB2E4. above \uBC30\uC5F4\uC740 reverse\uD574\uC11C
  // "\uBD80\uBAA8\uC640 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uAC83\uBD80\uD130" \uC21C\uC11C\uB85C \uB9DE\uCD98\uB2E4 \u2014 kids\uB294 \uC0C1\uB300 Y \uC624\uB984\uCC28\uC21C \uC815\uB82C\uC774\uB77C below
  // \uADF8\uB8F9(\uBD80\uBAA8\uC5D0\uC11C \uBA40\uC5B4\uC9C0\uB294 \uBC29\uD5A5\uC73C\uB85C \uC21C\uC11C\uB300\uB85C \uC9C4\uD589)\uC5D4 \uADF8\uB300\uB85C \uB9DE\uC9C0\uB9CC, above \uADF8\uB8F9\uC740 \uAC19\uC740
  // \uC9C4\uD589 \uBC29\uD5A5(\uC704\uB85C \uBA40\uC5B4\uC9D0)\uC778\uB370 \uC624\uB984\uCC28\uC21C\uC774\uBA74 \uAC00\uC7A5 \uBA3C \uC790\uC2DD\uC774 \uBC30\uC5F4 \uB9E8 \uC55E\uC774\uB77C \uC624\uD788\uB824 \uBD80\uBAA8\uC640
  // \uAC00\uC7A5 \uAC00\uAE5D\uAC8C \uBC30\uCE58\uB418\uACE0 \uADF8\uB2E4\uC74C\uC774 \uB354 \uBA40\uB9AC \uBC00\uB9AC\uB294 \uC2DD\uC73C\uB85C \uC2DC\uAC01\uC801 \uC21C\uC11C\uAC00 \uB4A4\uC9D1\uD78C\uB2E4.
  function splitByOriginalSide(parentId, side) {
    var parent = nodeMap[parentId];
    var kids = (childrenOf[parentId] || []).filter(function(k) { return sideOf[k] === side; });
    var above = kids.filter(function(k) { return nodeMap[k].ly < parent.ly; }).reverse();
    return {
      below: kids.filter(function(k) { return nodeMap[k].ly >= parent.ly; }),
      above: above,
    };
  }

  // main topic\uB07C\uB9AC(\uBC31\uBCF8)\uB9CC 20px \uAE30\uC900, \uADF8 \uC678(hop \uC790\uC2DD)\uB294 \uD56D\uC0C1 30px \uAE30\uC900
  function gapFor(a, b) {
    var base = (a.isMain && b.isMain) ? 20 : 30;
    return (getH(a) > HEADER_H || getH(b) > HEADER_H) ? 48 : base;
  }

  // \u2500\u2500 bottom-up: \uAC01 \uC11C\uBE0C\uD2B8\uB9AC\uAC00 \uC790\uAE30 \uC911\uC2EC \uAE30\uC900 \uC704/\uC544\uB798\uB85C \uD544\uC694\uD55C \uACF5\uAC04 \u2500\u2500
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

  // above+below \uBE14\uB85D\uC744 \uBD80\uBAA8 \uC911\uC2EC\uC5D0 \uB9DE\uCD94\uAE30 \uC704\uD55C \uBD84\uAE30\uC810 \uC774\uB3D9\uB7C9(shift). \uC774\uC0C1\uC801\uC73C\uB85C\uB294
  // (belowSize-aboveSize)/2\uB9CC\uD07C \uC62E\uAE30\uBA74 \uBE14\uB85D \uC804\uCCB4\uAC00 \uC815\uD655\uD788 \uBD80\uBAA8 \uC911\uC2EC\uC5D0 \uC624\uC9C0\uB9CC, \uC591\uCABD\uC5D0 \uB2E4
  // \uD615\uC81C\uAC00 \uC788\uB294 \uC0C1\uD0DC\uC5D0\uC11C \uB450 \uADF8\uB8F9 \uD06C\uAE30 \uCC28\uC774\uAC00 \uD06C\uBA74(\uC608: 3:1 \uC774\uC0C1) \uADF8 \uC774\uB3D9\uB7C9\uC774 \uD070 \uCABD \uADF8\uB8F9\uC758
  // "\uBD80\uBAA8\uC640 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uC790\uC2DD"\uC744 \uBD80\uBAA8 \uC911\uC2EC \uBC18\uB300\uD3B8\uC73C\uB85C \uBC00\uC5B4\uBC84\uB9B0\uB2E4(below\uC758 \uCCAB \uC790\uC2DD\uC774 \uBD80\uBAA8
  // \uBCF4\uB2E4 \uC704\uC5D0 \uB80C\uB354\uB418\uB294 \uB4F1, \uC790\uC2DD\uC774 \uBD80\uBAA8\uB97C \uC2DC\uAC01\uC801\uC73C\uB85C \uB6F0\uC5B4\uB118\uB294 \uBC84\uADF8). \uB450 \uADF8\uB8F9\uC774 \uB2E4 \uC788\uC744
  // \uB54C\uB9CC, "\uB354 \uD070 \uCABD\uC758 \uCCAB \uC790\uC2DD\uC774 \uBD80\uBAA8 \uC911\uC2EC\uC744 \uB118\uC9C0 \uC54A\uB294 \uD55C\uB3C4"\uB85C \uC774\uB3D9\uB7C9\uC744 clamp\uD55C\uB2E4.
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
    // side\uBCC4\uB85C \uB3C5\uB9BD\uC801\uC73C\uB85C above+below \uBE14\uB85D\uC744 \uC7AC\uC13C\uD130\uB9C1\uD558\uBBC0\uB85C, \uC774 \uB178\uB4DC\uAC00 \uC790\uAE30 \uBD80\uBAA8\uC5D0\uAC8C
    // \uBCF4\uACE0\uD558\uB294 "\uD544\uC694 \uACF5\uAC04"\uB3C4 side\uBCC4\uB85C \uB530\uB85C \uAD6C\uD574\uC11C(\uC67C\uCABD\xB7\uC624\uB978\uCABD\uC740 \uC138\uB85C \uACF5\uAC04\uC744 \uC548 \uACB9\uCE58\uBBC0\uB85C
    // \uB354\uD558\uC9C0 \uC54A\uACE0 \uB354 \uB9CE\uC774 \uD544\uC694\uD55C \uCABD \uAE30\uC900) splitShift\uAC00 clamp\uD55C \uC2E4\uC81C shift\uB97C \uBC18\uC601\uD55C\uB2E4 \u2014
    // \uC548 \uADF8\uB7EC\uBA74 assign()\uC774 \uC2E4\uC81C\uB85C \uB9CC\uB4DC\uB294 \uC704\uCE58\uC640 \uC5B4\uAE0B\uB098 \uB2E4\uB978 \uD074\uB7EC\uC2A4\uD130\uC640 \uACB9\uCE60 \uC218 \uC788\uB2E4.
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

  // \u2500\u2500 top-down: center Y \uD655\uC815 \u2500\u2500
  var centerY = {};
  function assign(id, cy) {
    var node = nodeMap[id];
    centerY[id] = cy;
    // \uC67C\uCABD/\uC624\uB978\uCABD\uC744 \uC644\uC804\uD788 \uB3C5\uB9BD\uC801\uC73C\uB85C \uBC30\uCE58\uD55C\uB2E4 \u2014 stackSize\uAC00 \uAC19\uC740 side\uC758 \uD615\uC81C\uB07C\uB9AC\uB9CC
    // \uB354\uD574\uC9C0\uBBC0\uB85C \uD55C\uCABD \uD06C\uAE30\uAC00 \uBC18\uB300\uCABD \uBD84\uAE30\uC810\uC5D0 \uC601\uD5A5\uC744 \uC8FC\uC9C0 \uC54A\uB294\uB2E4.
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

  // \u2500\u2500 \uB8E8\uD2B8 \uC2DC\uD000\uC2F1: X \uBC94\uC704\uAC00 \uACB9\uCE58\uB294 \uB8E8\uD2B8\uB07C\uB9AC\uB9CC \uADF8\uB8F9\uC73C\uB85C \uBB36\uC5B4 \uC6D0\uB798 \uC21C\uC11C(Y)\uB300\uB85C \uBC30\uCE58 \u2500\u2500
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

  // \u2500\u2500 hop tier(\uAE4A\uC774)\uBCC4 X \uC815\uB82C \u2014 \uAC19\uC740 depth\uC758 \uBAA8\uB4E0 \uB178\uB4DC\uAC00 \uD56D\uC0C1 \uAC19\uC740 X\uC5D0\uC11C \uC2DC\uC791 \u2500\u2500
  var MIN_HOP_GAP = 750, COL_PAD = 60;
  // main topic(\uBC31\uBCF8)\uB3C4 hop1/hop2\uCC98\uB7FC \uD558\uB098\uC758 \uC138\uB85C\uC904\uB85C \uC790\uB3D9 \uC815\uB82C \u2014 depth 0 \uB178\uB4DC\uB294 raw
  // \uC88C\uD45C\uB97C \uADF8\uB300\uB85C \uC4F0\uC9C0 \uC54A\uACE0, main topic\uB4E4 \uC911 \uAC00\uC7A5 \uC67C\uCABD(raw x \uCD5C\uC18C\uAC12)\uC73C\uB85C \uC804\uBD80 \uD1B5\uC77C\uD55C\uB2E4.
  // depth 0\uC5D0\uB294 main topic \uC678\uC5D0 \uC5F0\uACB0 \uB04A\uAE34 \uACE0\uC544 \uB178\uB4DC\uB3C4 \uC11E\uC774\uBBC0\uB85C n.isMain\uC73C\uB85C \uD544\uD130\uB9C1
  // (\uACE0\uC544 \uB178\uB4DC\uB294 \uC6D0\uB798 \uC790\uC720 \uC88C\uD45C \uC720\uC9C0).
  var mainTopicAnchorX = 0;
  var mainTopicXs = NODES_DATA.filter(function(n) { return n.isMain; }).map(function(n) { return n.lx; });
  if (mainTopicXs.length > 0) mainTopicAnchorX = Math.min.apply(null, mainTopicXs);

  var maxDepth = 0;
  NODES_DATA.forEach(function(n) { maxDepth = Math.max(maxDepth, tree.depthOf[n.id] || 0); });
  // \uC804\uC5ED\uC5D0\uC11C \uAC00\uC7A5 \uB113\uC740 main topic \uD3ED \u2014 \uC5B4\uB290 main topic \uD558\uB098\uAC00 \uD45C \uB4F1\uC73C\uB85C \uB113\uC5B4\uC9C0\uBA74, \uADF8
  // main topic \uC790\uC2E0\uC758 \uC67C\uCABD\xB7\uC624\uB978\uCABD hop1 \uAC04\uACA9\uC774 \uB611\uAC19\uC774 \uC720\uC9C0\uB418\uB294 \uAC83\uC740 \uBB3C\uB860(\uC624\uB978\uCABD \uBCC0\uB9CC
  // \uB113\uC5B4\uC9C0\uBBC0\uB85C \uC624\uB978\uCABD \uACC4\uC0B0\uC5D0\uB9CC \uD544\uC694), \uB2E4\uB978(\uC548 \uB113\uC5B4\uC9C4) main topic\uB4E4\uC758 hop1\uB3C4 \uC804\uBD80 \uAC19\uC740
  // \uB9CC\uD07C \uAC19\uC774 \uBC00\uB824\uC11C hop1 \uC5F4\uC774 \uBB38\uC11C \uC804\uCCB4\uC5D0\uC11C \uACC4\uC18D \uB098\uB780\uD788 \uC815\uB82C\uB3FC\uC57C \uD55C\uB2E4. "\uC774 \uBE0C\uB79C\uCE58 \uC790\uC2E0\uC758
  // \uD3ED"\uC774 \uC544\uB2C8\uB77C "\uC804\uC5ED\uC5D0\uC11C \uC81C\uC77C \uB113\uC740 main topic\uC758 \uD3ED"\uC744 \uBAA8\uB4E0 \uBE0C\uB79C\uCE58\uC758 \uC624\uB978\uCABD \uC624\uD504\uC14B\uC5D0
  // \uB611\uAC19\uC774 \uB354\uD55C\uB2E4 \u2014 \uD45C\uAC00 \uC5C6\uB294 \uBCF4\uD1B5 \uC0C1\uD669(\uBAA8\uB4E0 main topic \uD3ED\uC774 \uAC19\uC74C)\uC5D0\uC11C\uB294 \uC774 \uAC12\uC774 \uACE7 \uC790\uAE30
  // \uD3ED\uACFC \uAC19\uC544\uC11C \uC88C\uC6B0 \uAC04\uACA9\uC774 \uC815\uD655\uD788 MIN_HOP_GAP\uC73C\uB85C \uB300\uCE6D\uC774\uB2E4. \uC67C\uCABD\uC740 main topic\uC774 \uC544\uBB34\uB9AC
  // \uB113\uC5B4\uC838\uB3C4 \uC67C\uCABD \uBCC0 \uC790\uCCB4\uB294 \uC6C0\uC9C1\uC774\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uD56D\uC0C1 \uACE0\uC815 MIN_HOP_GAP.
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
    // root\uAC00 main topic\uC774\uBA74(\uD56D\uC0C1 \uADF8\uB807\uC9C4 \uC54A\uC74C \u2014 \uC5F0\uACB0 \uB04A\uAE34 \uACE0\uC544 \uB178\uB4DC\uB3C4 \uC790\uAE30 \uC790\uC190\uC758 root\uAC00
    // \uB420 \uC218 \uC788\uC74C) raw \uC88C\uD45C\uAC00 \uC544\uB2C8\uB77C \uC704\uC5D0\uC11C \uD1B5\uC77C\uD55C mainTopicAnchorX\uB97C \uAE30\uC900 \uC0BC\uC544\uC57C, main
    // topic \uC790\uC2E0\uC758 \uB80C\uB354 \uC704\uCE58\uC640 \uADF8 hop \uC790\uC2DD\uB4E4\uC758 \uB80C\uB354 \uC704\uCE58\uAC00 \uC11C\uB85C \uC5B4\uAE0B\uB098\uC9C0 \uC54A\uB294\uB2E4.
    var rootX = root.isMain ? mainTopicAnchorX : root.lx;
    var offset = colOffset[depth + ':' + side];
    if (offset === undefined) offset = depth * MIN_HOP_GAP;
    // offset\uC740 "root\uC640 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uCABD \uBAA8\uC11C\uB9AC"\uAE4C\uC9C0\uC758 \uAC70\uB9AC\uB2E4. side=1(\uC624\uB978\uCABD)\uC740 \uADF8 \uBAA8\uC11C\uB9AC\uAC00
    // \uACE7 CSS left(\uCE74\uB4DC\uC758 \uC67C\uCABD \uBCC0)\uB77C \uADF8\uB300\uB85C \uC4F0\uBA74 \uB418\uC9C0\uB9CC, side=-1(\uC67C\uCABD)\uC740 root\uC640 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4
    // \uBAA8\uC11C\uB9AC\uAC00 \uCE74\uB4DC\uC758 \uC624\uB978\uCABD \uBCC0\uC774\uBBC0\uB85C, CSS left\uB97C \uAD6C\uD558\uB824\uBA74 \uAC70\uAE30\uC11C \uCE74\uB4DC \uB108\uBE44\uB9CC\uD07C \uB354 \uBE7C\uC57C
    // \uD55C\uB2E4(\uC67C\uCABD \uD615\uC81C\uB4E4\uC758 "\uC67C\uCABD \uBCC0"\uB9CC \uC815\uB82C\uB418\uACE0 main topic\uACFC \uAC00\uAE4C\uC6B4 "\uC624\uB978\uCABD \uBCC0"\uC740 \uCE74\uB4DC
    // \uB108\uBE44\uC5D0 \uB530\uB77C \uB4E4\uCB49\uB0A0\uCB49\uD574\uC9C0\uB294 \uAC78 \uB9C9\uAE30 \uC704\uD568).
    var nearRootEdge = rootX + side * offset;
    renderX[n.id] = side === 1 ? nearRootEdge : nearRootEdge - getW(n);
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
  drawGrid();
}

// \u2500\u2500 main topic(\uBC31\uBCF8) \uAE30\uC900 hop \uD2B8\uB9AC \u2014 Canvas.tsx\uC758 buildHopTree\uC640 \uB3D9\uC77C\uD55C \uADDC\uCE59
// (main_topic\uC740 \uD56D\uC0C1 \uB8E8\uD2B8, \uADF8 \uC678\uB294 children[]/edge\uB85C \uCC3E\uC740 \uBD80\uBAA8\uC5D0 \uADC0\uC18D, \uBD80\uBAA8\uB97C \uBABB
// \uCC3E\uC73C\uBA74 \uB3C5\uB9BD \uB8E8\uD2B8). \uB514\uBC84\uADF8 \uACA9\uC790\uC640 Ctrl+F \uAC80\uC0C9\uC758 BFS \uC815\uB82C \uB458 \uB2E4 \uC774 \uD2B8\uB9AC\uB97C \uACF5\uC720\uD55C\uB2E4
// (\uB808\uC774\uC544\uC6C3 \uC7AC\uAD6C\uD604\uB9C8\uB2E4 \uB450 \uACF3\uC774 \uC11C\uB85C \uB2E4\uB978 \uB85C\uC9C1\uC73C\uB85C \uC5B4\uAE0B\uB098\uB294 \uAC83\uC744 \uD53C\uD558\uAE30 \uC704\uD568 \u2014 \uC5D0\uB514\uD130
// \uCABD\uC5D0\uC11C layoutInfo/assign\uC774 \uB530\uB85C \uB180\uC544\uC11C \uACB9\uCE68 \uBC84\uADF8\uAC00 \uB0AC\uB358 \uAC83\uACFC \uAC19\uC740 \uC885\uB958\uC758 \uC2E4\uC218\uB97C
// \uC5EC\uAE30\uC11C\uB3C4 \uBC18\uBCF5\uD558\uC9C0 \uC54A\uAE30 \uC704\uD568).
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
    // \uD3EC\uD2B8\uB97C \uBC18\uB300 \uBC29\uD5A5(\uC0C8 \uB178\uB4DC \u2192 \uAE30\uC874 \uB178\uB4DC)\uC73C\uB85C \uB04C\uC5B4 \uB9CC\uB4E0 \uC5E3\uC9C0\uB294 source/target\uC774 \uB4A4\uBC14\uB010
    // \uCC44\uB85C \uC800\uC7A5\uB3FC \uC788\uC744 \uC218 \uC788\uB2E4(source=\uC774 \uB178\uB4DC, target=main topic) \u2014 Canvas.tsx\uC758
    // buildHopTree\uC640 \uB3D9\uC77C\uD558\uAC8C, \uC774\uB7F0 \uAE30\uC874 \uB370\uC774\uD130\uB3C4 \uC5EC\uAE30\uC11C \uC778\uC2DD\uD574\uC918\uC57C \uC5D0\uB514\uD130\uC640 \uAC19\uC740
    // \uD2B8\uB9AC \uAD6C\uC870\uAC00 \uB098\uC628\uB2E4(\uC548 \uADF8\uB7EC\uBA74 \uC774 \uB178\uB4DC\uAC00 \uC798\uBABB \uB3C5\uB9BD \uB8E8\uD2B8\uB85C \uCDE8\uAE09\uB428).
    var reversedToMain = null;
    EDGES.forEach(function(e) {
      if (!reversedToMain && e.source === nodeId && nodeById[e.target] && nodeById[e.target].isMain) reversedToMain = e.target;
    });
    return reversedToMain;
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

// \u2500\u2500 \uB514\uBC84\uADF8 \uACA9\uC790 \u2014 Canvas.tsx\uC758 computeGridLines\uC640 \uB3D9\uC77C\uD55C \uADDC\uCE59(\uAC00\uB85C\uC120: main topic
// \uD074\uB7EC\uC2A4\uD130 \uACBD\uACC4, \uC138\uB85C\uC120: hop depth\uBCC4 X \uACBD\uACC4). \uB808\uC774\uC544\uC6C3 \uC54C\uACE0\uB9AC\uC998 \uC790\uCCB4\uB294 \uC5D0\uB514\uD130\uC640
// \uB2E4\uB974\uC9C0\uB9CC(README\uC5D0 \uBA85\uC2DC\uB41C \uB300\uB85C HTML export\uB294 \uC608\uC804 \uCEEC\uB7FC \uD328\uD0B9 \uBC29\uC2DD), \uACA9\uC790\uB294 \uD604\uC7AC
// DOM\uC5D0 \uC2E4\uC81C\uB85C \uADF8\uB824\uC9C4 \uC704\uCE58(el.style.left/top + offsetWidth/offsetHeight)\uB97C \uADF8\uB300\uB85C
// \uC77D\uC5B4\uC11C \uACC4\uC0B0\uD558\uBBC0\uB85C \uC5B4\uB5A4 \uBC30\uCE58 \uC54C\uACE0\uB9AC\uC998\uC744 \uC4F0\uB4E0 \uD56D\uC0C1 \uC2E4\uC81C \uB80C\uB354 \uACB0\uACFC\uC640 \uC77C\uCE58\uD55C\uB2E4.
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

  // \uAC00\uB85C\uC120: main topic \uD074\uB7EC\uC2A4\uD130(\uC790\uC2E0+hop \uC790\uC190 \uC804\uCCB4)\uC758 Y \uBC94\uC704 \uACBD\uACC4
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

  // \uC138\uB85C\uC120: hop depth\uBCC4 X \uBC94\uC704 \uACBD\uACC4 (main topic \uAE30\uC900 \uC88C/\uC6B0 \uBC29\uD5A5 \uBD84\uB9AC)
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
// data-base-sw/-dash: \uD655\uB300/\uCD95\uC18C\uD574\uB3C4 \uD654\uBA74\uC0C1 \uB450\uAED8\uAC00 \uC720\uC9C0\uB418\uB3C4\uB85D(\uC5D0\uB514\uD130\uC758 WireLayer
// zoom \uBCF4\uC815\uACFC \uB3D9\uC77C \uADDC\uCE59) zoom=1 \uAE30\uC900 \uAC12\uC744 \uAE30\uB85D\uD574\uB450\uACE0, updateZoomLineWeights()\uAC00
// \uD604\uC7AC scale\uC5D0 \uB9DE\uCDB0 \uC2E4\uC81C stroke-width/dasharray\uB97C \uB9E4\uBC88 \uB2E4\uC2DC \uACC4\uC0B0\uD55C\uB2E4.
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
  lines.vLines.forEach(function(x) { svg.appendChild(svgGridLine(x, 0, x, 10000, '#22c55e')); });
  lines.hLines.forEach(function(y) { svg.appendChild(svgGridLine(0, y, 10000, y, '#f97316')); });
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
// \uD655\uB300(zoom>=100%)\uBA74 \uAE30\uBCF8 \uB450\uAED8, \uCD95\uC18C(zoom<100%)\uBA74 \uD654\uBA74\uC0C1 \uB450\uAED8\uAC00 \uC720\uC9C0\uB418\uB3C4\uB85D \uBC18\uBE44\uB840\uB85C
// \uD0A4\uC6C0(\uC5D0\uB514\uD130\uC758 WireLayer.tsx\uC758 zc = zoom<1 ? 1/zoom : 1 \uACFC \uB3D9\uC77C \uADDC\uCE59). \uB808\uC774\uC544\uC6C3\uC774
// \uC548 \uBC14\uB00C\uB294 \uC21C\uC218 \uC90C \uC870\uC791(wheel)\uC5D0\uC11C\uB294 \uACBD\uB85C\uB97C \uB2E4\uC2DC \uADF8\uB9AC\uC9C0 \uC54A\uACE0 \uC774\uBBF8 \uADF8\uB824\uC9C4 \uC694\uC18C\uB4E4\uC758
// stroke-width/dasharray\uB9CC \uAC31\uC2E0 \u2014 \uAC00\uBCCD\uACE0, wheel\uB9C8\uB2E4 A* \uC7AC\uACC4\uC0B0\uD560 \uD544\uC694\uAC00 \uC5C6\uC74C.
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

  // \uB178\uB4DC rect \uCE90\uC2DC (\uC5E3\uC9C0 \uB77C\uC6B0\uD305 \uC7A5\uC560\uBB3C \uAC80\uC0AC\uC6A9 \u2014 drawEdges 1\uD68C\uB2F9 1\uD68C\uB9CC DOM \uC870\uD68C)
  var rectById={};
  NODES_DATA.forEach(function(n){
    var el=document.getElementById('node-'+n.id);
    if(el) rectById[n.id]=getNodeRect(el);
  });

  // hop \uC790\uC2DD(line) \uC5E3\uC9C0: \uBC84\uC2A4 \uB77C\uC6B0\uD305\uB3C4, A*/\uCEE4\uBE0C \uB77C\uC6B0\uD305\uB3C4 \uC5C6\uC774 \uADF8\uB0E5 \uD3C9\uBC94\uD55C \uC9C1\uC120
  // (\uC5D0\uB514\uD130 WireLayer.tsx\uC640 \uB3D9\uC77C \u2014 \uC608\uC804\uC5D4 "\uAC19\uC740 source\uC5D0\uC11C \uB098\uAC00\uB294 line \uC5E3\uC9C0 \uC5EC\uB7FF\uC744
  // \uC138\uB85C \uD2B8\uB801\uD06C\uB85C \uBB36\uB294 \uBC84\uC2A4 \uB77C\uC6B0\uD305"\uC774 \uC788\uC5C8\uB294\uB370, \uC5D0\uB514\uD130\uAC00 \uC774\uBBF8 \uADF8\uAC78 \uBC84\uB9AC\uACE0 \uC21C\uC218 \uC9C1\uC120\uC73C\uB85C
  // \uBC14\uAFBC \uC9C0 \uC624\uB798\uB77C \uC5EC\uAE30\uB9CC \uC548 \uB530\uB77C\uC640 \uC788\uC5C8\uC74C). \uD3EC\uD2B8\uB294 \uD56D\uC0C1 \uC88C/\uC6B0\uB9CC \uAC15\uC81C \u2014 getBestPorts\uCC98\uB7FC
  // top/bottom\uAE4C\uC9C0 \uC720\uD074\uB9AC\uB4DC \uCD5C\uC19F\uAC12\uC73C\uB85C \uACE0\uB974\uBA74, \uD0C0\uAC9F\uC774 \uBD80\uBAA8 \uC911\uC2EC\uC5D0\uC11C \uC218\uC9C1\uC73C\uB85C \uB9CE\uC774
  // \uB5A8\uC5B4\uC9C4 \uD615\uC81C \uD558\uB098\uB9CC \uD3EC\uD2B8\uAC00 top/bottom\uC73C\uB85C \uB4A4\uC9D1\uD600 \uB2E4\uB978 \uD615\uC81C \uC120\uC744 \uAC00\uB85C\uC9C8\uB7EC \uC9C0\uB098\uAC00
  // \uBC84\uB9AC\uB294 \uBB38\uC81C\uAC00 \uC788\uC5C8\uB2E4(\uC0AC\uC6A9\uC790\uAC00 export html \uC2A4\uD06C\uB9B0\uC0F7\uC73C\uB85C \uC7AC\uC9C0\uC801: "\uC120\uC774 \uC65C \uAE54\uB054\uD558\uAC8C
  // \uC815\uB9AC\uB418\uC9C0 \uC54A\uC740 \uAC70\uC9C0" \u2014 \uCCAB main topic\uB9CC \uAE54\uB054\uD558\uACE0 \uB098\uBA38\uC9C0\uB294 \uC120\uC774 \uAD50\uCC28\uD574 \uBCF4\uC784).
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

  // \uAC19\uC740 source\uC5D0\uC11C \uB098\uAC00\uAC70\uB098 \uAC19\uC740 target\uC73C\uB85C \uBAA8\uC774\uB294 \uBC31\uBCF8(arrow) \uC5E3\uC9C0 \uBD84\uC0B0 \uC624\uD504\uC14B(\uD569\uC0B0).
  // hop \uC790\uC2DD(line)\uC740 \uC774\uC81C \uB77C\uC6B0\uD305 \uC5C6\uB294 \uACE0\uC815 \uC9C1\uC120\uC774\uB77C \uBD84\uC0B0\uC774 \uD544\uC694 \uC5C6\uC74C(\uC5D0\uB514\uD130\uC640 \uB3D9\uC77C \uC774\uC720).
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

  // \uADF8\uB9AC\uB4DC A* \uC804\uC5ED \uB77C\uC6B0\uD305 \u2014 main topic \uBC31\uBCF8(arrow) \uC5E3\uC9C0\uB9CC \uB300\uC0C1(hop \uC790\uC2DD\uC740 \uACE0\uC815 \uC9C1\uC120\uC774\uB77C
  // \uB77C\uC6B0\uD305 \uB300\uC0C1 \uC544\uB2D8, \uC5D0\uB514\uD130\uC640 \uB3D9\uC77C). \uB4DC\uB798\uADF8 \uC911(fast)\uC5D0\uB294 \uC2A4\uD0B5\uD558\uACE0 \uACBD\uB7C9 \uD734\uB9AC\uC2A4\uD2F1 \uC0AC\uC6A9.
  // \uB808\uC774\uC544\uC6C3\uC774 \uBC14\uB00C\uC9C0 \uC54A\uC740 \uC7AC\uD638\uCD9C(\uD558\uC774\uB77C\uC774\uD2B8 \uC0C9\uB9CC \uBCC0\uACBD \uB4F1)\uC740 \uCE90\uC2DC\uB97C \uC7AC\uC0AC\uC6A9\uD574 \uC989\uC2DC \uCC98\uB9AC
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
      // hop \uC790\uC2DD: \uB77C\uC6B0\uD305/\uCEE4\uBE0C \uC5C6\uC774 \uC88C/\uC6B0 \uD3EC\uD2B8 \uC0AC\uC774 \uC9C1\uC120 \uADF8\uB300\uB85C
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
// \uB9E4\uCE58 \uB178\uB4DC\uAC00 toggle \uC81C\uBAA9/\uB0B4\uC6A9 \uC548\uC5D0 \uC788\uC744 \uC218\uB3C4 \uC788\uC73C\uBBC0\uB85C \uB2E8\uC21C concat \uBB38\uC790\uC5F4\uC774 \uC544\uB2C8\uB77C
// title/content/original(\uC81C\uBAA9+\uD14D\uC2A4\uD2B8)/toggle(\uC81C\uBAA9+\uB0B4\uC6A9) \uAC01\uAC01\uC744 \uAC1C\uBCC4\uB85C \uD655\uC778 (\uC5D0\uB514\uD130\uC758
// searchMatchNodes \uD544\uD130\uC640 \uB3D9\uC77C\uD55C \uADDC\uCE59 \u2014 \uC774\uB798\uC57C selectSearchNode\uC5D0\uC11C \uC5B4\uB290 \uC139\uC158\uC744
// \uD3BC\uCCD0\uC57C \uD558\uB294\uC9C0\uB3C4 \uC54C \uC218 \uC788\uC74C).
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
  // main topic BFS \uC21C\uC11C\uB85C \uC815\uB82C: \uD55C main topic\uC758 \uBAA8\uB4E0 hop1, \uBAA8\uB4E0 hop2, ... \uB97C \uB2E4 \uD6D1\uC740
  // \uB4A4\uC5D0\uC57C \uB2E4\uC74C main topic\uC73C\uB85C (\uC5D0\uB514\uD130\uC758 searchMatchNodes \uC815\uB82C\uACFC \uB3D9\uC77C \uADDC\uCE59)
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
      if(!datum.contentExpanded){body.style.display='';datum.contentExpanded=true;applyContentCaps(nodeEl);}
      // \uB9E4\uCE58\uAC00 toggle \uC81C\uBAA9/\uB0B4\uC6A9 \uB610\uB294 original \uC81C\uBAA9/\uD14D\uC2A4\uD2B8 \uC548\uC5D0 \uC788\uC744 \uC218 \uC788\uC73C\uBBC0\uB85C,
      // \uC811\uD600 \uC788\uC73C\uBA74 \uD3BC\uCCD0\uC11C \uC2E4\uC81C\uB85C \uBCF4\uC774\uAC8C \uD568 (\uC5D0\uB514\uD130\uC758 handleSelectSearchNode\uC640 \uB3D9\uC77C)
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

// \uBCF8\uBB38 \uB192\uC774 \uC0C1\uD55C(More/Less) \u2014 NodeCard.tsx\uC758 DEFAULT_CONTENT_MAX \uB85C\uC9C1\uC744 \uADF8\uB300\uB85C \uC774\uC2DD.
// .ng-content\uB294 node.content \uC804\uC6A9 \uD074\uB798\uC2A4\uB77C\uC11C(toggle/original\uC740 \uAC01\uAC01
// .ng-toggle-body / .ng-orig-text \uB97C \uC500) \uC774 \uC140\uB809\uD130\uB9CC\uC73C\uB85C \uC774\uBBF8 "content\uB9CC" \uBC94\uC704\uAC00
// \uC7A1\uD78C\uB2E4 \u2014 \uC5D0\uB514\uD130\uC640 \uB3D9\uC77C\uD558\uAC8C toggle/original\uC5D0\uB294 \uCEA1\uC744 \uC801\uC6A9\uD558\uC9C0 \uC54A\uC74C.
// scope\uB97C \uC8FC\uBA74 \uADF8 \uC548\uC758 .ng-content\uB9CC \uC7AC\uCE21\uC815(fold/unfold\uB098 \uAC80\uC0C9\uC73C\uB85C \uCC98\uC74C \uBCF4\uC774\uAC8C
// \uB420 \uB54C \u2014 display:none \uC0C1\uD0DC\uC5D0\uC11C \uCE21\uC815\uD558\uBA74 \uC804\uBD80 0\uC73C\uB85C \uB098\uC640\uC11C \uBC84\uD2BC\uC774 \uD544\uC694 \uC5C6\uB2E4\uACE0
// \uC798\uBABB \uD310\uB2E8\uD558\uAE30 \uB54C\uBB38\uC5D0 \uB2E4\uC2DC \uBCF4\uC774\uAC8C \uB41C \uC2DC\uC810\uC5D0 \uC7AC\uCE21\uC815\uC774 \uD544\uC694\uD568).
var DEFAULT_CONTENT_MAX = 500;
function applyContentCaps(scope) {
  (scope || document).querySelectorAll('.ng-content').forEach(function(el) {
    var measure = function() {
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
          btn.textContent = '\u25BC More';
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var expanded = el.getAttribute('data-more-expanded') === '1';
            if (expanded) {
              el.removeAttribute('data-more-expanded');
              el.style.maxHeight = el.getAttribute('data-cap') + 'px';
              el.style.overflowY = 'auto';
              el.style.overflowX = 'hidden';
              btn.textContent = '\u25BC More';
            } else {
              el.setAttribute('data-more-expanded', '1');
              el.style.maxHeight = '';
              el.style.overflowY = '';
              el.style.overflowX = '';
              btn.textContent = '\u25B2 Less';
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

window.addEventListener('load', function() {
  // Render KaTeX first so node heights are accurate
  initKatex();
  // scale\uB294 \uC544\uC9C1 \uCD08\uAE30\uAC12 1\uC774\uB77C(fitView\uAC00 \uC544\uC9C1 \uC548 \uB3CC\uC544\uC11C) getBoundingClientRect()
  // \uCE21\uC815\uAC12\uC774 \uCE94\uBC84\uC2A4 local \uC88C\uD45C\uC640 \uC77C\uCE58\uD568 \u2014 fitView \uC774\uD6C4\uB85C \uBBF8\uB8E8\uBA74 \uCD95\uC18C\uB41C \uD654\uBA74 \uD53D\uC140\uC744
  // local px\uB85C \uCC29\uAC01\uD574\uC11C \uCEA1 \uB192\uC774\uAC00 \uC798\uBABB \uACC4\uC0B0\uB428.
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
</html>`}var xe={main_topic:{label:"Main topic",color:"#4B8BBE",icon:"file-text",shape:"sharp"},method:{label:"Method",color:"#5C9E6E",icon:"cpu",shape:"sharp"},result:{label:"Result",color:"#9B59B6",icon:"bar-chart-2",shape:"sharp"},claim:{label:"Claim",color:"#E74C3C",icon:"alert-circle",shape:"sharp"},question:{label:"Question",color:"#E5A835",icon:"help-circle",shape:"rounded"},gap:{label:"Gap / Idea",color:"#1ABC9C",icon:"lightbulb",shape:"rounded"},reference:{label:"Reference",color:"#95A5A6",icon:"book-open",shape:"rounded"},memo:{label:"Memo",color:"#BDC3C7",icon:"edit-3",shape:"rounded"}};function _(e="New Graph"){let t=new Date().toISOString();return{version:"1.0.0",title:e,created:t,modified:t,nodeTemplates:xe,nodes:[],edges:[],viewport:{x:0,y:0,zoom:1}}}function F(){let e="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let r=0;r<32;r++)e+=t.charAt(Math.floor(Math.random()*t.length));return e}var b=C(require("vscode"));var Y=class e{static{this.panels=new Map}static async openAndSearch(t,r,n,o){let s=r.toString(),l=e.panels.get(s);if(l){l.panel.reveal(b.ViewColumn.Beside,!0),l.ready?l.panel.webview.postMessage({type:"search",query:n,pageHint:o}):l.pending={query:n,pageHint:o};return}let h;try{h=await b.workspace.fs.readFile(r)}catch{b.window.showErrorMessage(`PDF\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${r.fsPath}`);return}let i=b.window.createWebviewPanel("nodegraph.pdfViewer",r.path.split("/").pop()??"PDF",{viewColumn:b.ViewColumn.Beside,preserveFocus:!1},{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[b.Uri.joinPath(t.extensionUri,"dist")]}),d={panel:i,ready:!1,pending:{query:n,pageHint:o}};e.panels.set(s,d),i.iconPath=b.Uri.joinPath(t.extensionUri,"resources","icon-hires.png"),i.webview.html=e._getHtml(t,i.webview);let p=Buffer.from(h).toString("base64");i.webview.onDidReceiveMessage(a=>{a.type==="ready"&&(d.ready=!0,i.webview.postMessage({type:"load",pdfData:p,query:d.pending?.query,pageHint:d.pending?.pageHint}),d.pending=null)}),i.onDidDispose(()=>{e.panels.delete(s)})}static _getHtml(t,r){let n=r.asWebviewUri(b.Uri.joinPath(t.extensionUri,"dist","pdfviewer.js")),o=r.asWebviewUri(b.Uri.joinPath(t.extensionUri,"dist","pdfviewer.css")),s=r.asWebviewUri(b.Uri.joinPath(t.extensionUri,"dist","pdf.worker.min.mjs")),l=F();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${r.cspSource} data: blob:; script-src 'nonce-${l}' ${r.cspSource}; style-src 'unsafe-inline' ${r.cspSource}; worker-src ${r.cspSource} blob:; connect-src ${r.cspSource} blob:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${o}">
  <title>PDF</title>
</head>
<body>
  <div id="root">
    <div id="toolbar">
      <button id="zoomOutBtn" title="Zoom out">\u2212</button>
      <span id="zoomLabel"></span>
      <button id="zoomInBtn" title="Zoom in">+</button>
      <span id="loadingLabel"></span>
      <div id="toolbarSpacer"></div>
      <button id="findToggleBtn" title="Find in PDF (Ctrl+F)">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/>
          <line x1="10.1" y1="10.1" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <div id="findBar">
        <input id="findInput" type="text" placeholder="Find in PDF" autocomplete="off">
        <span id="findCount"></span>
        <button id="findPrevBtn" title="Previous match">\u2191</button>
        <button id="findNextBtn" title="Next match">\u2193</button>
        <button id="findCloseBtn" title="Close">\u2715</button>
      </div>
    </div>
    <div id="pagesScroll">
      <div id="status"></div>
      <div id="pages"></div>
    </div>
  </div>
  <script nonce="${l}">window.__PDF_WORKER_URI__ = "${s}";</script>
  <script nonce="${l}" type="module" src="${n}"></script>
</body>
</html>`}};var T=class e{constructor(t){this.context=t;this._pendingSaves=new Set}static register(t){let r=new e(t);return c.window.registerCustomEditorProvider("nodegraph.editor",r,{webviewOptions:{retainContextWhenHidden:!0}})}static{this._activeWebview=null}static postToActive(t){e._activeWebview?.postMessage(t)}async resolveCustomTextEditor(t,r,n){r.iconPath=c.Uri.joinPath(this.context.extensionUri,"resources","icon-hires.png");let o=c.Uri.joinPath(t.uri,"..");r.webview.options={enableScripts:!0,localResourceRoots:[this.context.extensionUri,o]},r.webview.html=this._getHtmlForWebview(r.webview);let s=i=>{let d=t.getText();try{let p=d.trim()===""?_():JSON.parse(d),a=X(r.webview,t.uri,p);r.webview.postMessage({type:i,data:p,imageUris:a})}catch{}},l=r.webview.onDidReceiveMessage(async i=>{if(i.type==="ready")s("load");else if(i.type==="save"){let d=t.uri.toString();this._pendingSaves.add(d);try{let p=new c.WorkspaceEdit,a=new c.Range(t.positionAt(0),t.positionAt(t.getText().length));p.replace(t.uri,a,JSON.stringify(i.data,null,2)),await c.workspace.applyEdit(p),await t.save()}finally{this._pendingSaves.delete(d)}}else if(i.type==="openLink"){let d=i.link;if(d.type==="url")c.env.openExternal(c.Uri.parse(d.target));else if(d.type==="pdf"){let p=c.Uri.joinPath(c.Uri.joinPath(t.uri,".."),d.target);c.env.openExternal(p)}else d.type==="obsidian"&&c.env.openExternal(c.Uri.parse(d.target))}else if(i.type==="searchInPdf"){let d=c.Uri.joinPath(c.Uri.joinPath(t.uri,".."),i.pdfTarget);Y.openAndSearch(this.context,d,i.query,i.pageHint)}else if(i.type==="exportHtml")try{let d=i.data,p=c.Uri.joinPath(t.uri,".."),a=Q.basename(t.uri.fsPath,".nodegraph.json"),g=c.Uri.joinPath(p,`.${a}-imgs`),v={},k=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g,S=async f=>{if(!(!f||v[f]))try{let D=c.Uri.joinPath(g,f),R=await c.workspace.fs.readFile(D),O=f.split(".").pop()?.toLowerCase()??"png",m=O==="jpg"||O==="jpeg"?"image/jpeg":O==="gif"?"image/gif":O==="webp"?"image/webp":"image/png";v[f]=`data:${m};base64,${Buffer.from(R).toString("base64")}`}catch{}};for(let f of d.nodes){k.lastIndex=0;let D;for(;(D=k.exec(f.content??""))!==null;)await S(D[1])}let N=Z(d,v),w=c.Uri.joinPath(p,`${a}.html`);await c.workspace.fs.writeFile(w,Buffer.from(N,"utf-8"));let A=await c.window.showInformationMessage(`HTML exported: ${a}.html`,"Open in Browser","Show in Explorer");A==="Open in Browser"?c.env.openExternal(w):A==="Show in Explorer"&&c.commands.executeCommand("revealFileInOS",w)}catch(d){c.window.showErrorMessage(`HTML export failed: ${d}`)}else if(i.type==="saveImage")try{let{filename:d,webviewUri:p}=await V(r.webview,t.uri,i.data,i.ext??"png");r.webview.postMessage({type:"imageSaved",nodeId:i.nodeId,filename:d,webviewUri:p})}catch(d){c.window.showErrorMessage(`Failed to save image: ${d}`)}else if(i.type==="deleteImageFile")await K(t.uri,i.filename);else if(i.type==="reload")try{let d=await c.workspace.fs.readFile(t.uri),p=Buffer.from(d).toString("utf-8"),a=JSON.parse(p),g=X(r.webview,t.uri,a);r.webview.postMessage({type:"load",data:a,imageUris:g})}catch{s("load")}else if(i.type==="openHelp"){let d=c.Uri.joinPath(this.context.extensionUri,"README.md");c.commands.executeCommand("markdown.showPreviewToSide",d.with({fragment:"features"}))}}),h=c.workspace.onDidChangeTextDocument(i=>{i.document.uri.toString()===t.uri.toString()&&(this._pendingSaves.has(t.uri.toString())||s("externalChange"))});e._activeWebview=r.webview,r.onDidChangeViewState(i=>{i.webviewPanel.active&&(e._activeWebview=r.webview,r.webview.postMessage({type:"focusCanvas"}))}),r.onDidDispose(()=>{l.dispose(),h.dispose(),e._activeWebview===r.webview&&(e._activeWebview=null)})}_getHtmlForWebview(t){let r=t.asWebviewUri(c.Uri.joinPath(this.context.extensionUri,"dist","webview.js")),n=t.asWebviewUri(c.Uri.joinPath(this.context.extensionUri,"dist","katex","katex.min.css")),o=F();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${t.cspSource} blob: data:; script-src 'nonce-${o}'; style-src 'unsafe-inline' ${t.cspSource}; font-src ${t.cspSource};">
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
  <script nonce="${o}" src="${r}"></script>
</body>
</html>`}};var E=C(require("vscode")),ee=C(require("child_process"));function P(e){try{return ee.execSync(e,{timeout:5e3,stdio:["pipe","pipe","pipe"]}).toString().trim()}catch{return""}}function y(e){return P(e)!==""}function be(){let e=[],t=new Date().toISOString(),r=process.platform,n=r==="win32"?"Windows":r==="darwin"?"macOS":"Linux",o=process.arch,s=P("python3 --version 2>&1")||P("python --version 2>&1"),l=y("python3 --version 2>&1")?"python3":y("python --version 2>&1")?"python":"",h=l!=="",i=h&&y(`${l} -c "import fitz" 2>&1 && echo ok`),d=i?P(`${l} -c "import fitz; print(fitz.__version__)"`):"",p=h&&y(`${l} -c "import pdfplumber" 2>&1 && echo ok`),a=h&&y(`${l} -c "import pdfminer" 2>&1 && echo ok`),g=h&&y(`${l} -c "from PIL import Image" 2>&1 && echo ok`),v=g?P(`${l} -c "from PIL import __version__; print(__version__)"`):"",k=h&&y(`${l} -c "import cv2" 2>&1 && echo ok`),S=y("pdftotext -v 2>&1 && echo ok")||y("pdftotext --help 2>&1 && echo ok"),N=y("convert --version 2>&1 && echo ok"),w=y("magick --version 2>&1 && echo ok"),A=y("gs --version 2>&1 && echo ok")||y("gswin64c --version 2>&1 && echo ok"),f=D=>D?"\u2705":"\u274C";return e.push("# NodeGraph \u2014 Agent Environment Report"),e.push(""),e.push("> Auto-generated by the NodeGraph extension at activation."),e.push("> **AI agents: read this file to understand what tools are available on this machine.**"),e.push("> Re-generated each time a `.nodegraph.json` file is opened."),e.push(""),e.push(`Generated: \`${t}\``),e.push(""),e.push("---"),e.push(""),e.push("## System"),e.push(""),e.push("| | |"),e.push("|---|---|"),e.push(`| OS | ${n} (\`${r}\`) |`),e.push(`| Architecture | \`${o}\` |`),e.push(`| Python | ${h?`${f(!0)} \`${s}\``:`${f(!1)} not found`} |`),e.push(`| Python command | ${h?`\`${l}\``:"N/A"} |`),e.push(""),e.push("---"),e.push(""),e.push("## PDF Reading Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| PyMuPDF (\`fitz\`) | ${f(i)} | ${i?`v${d} \u2014 recommended`:"Install: `pip install pymupdf`"} |`),e.push(`| pdfplumber | ${f(p)} | ${p?"available":"Install: `pip install pdfplumber`"} |`),e.push(`| pdfminer | ${f(a)} | ${a?"available":"Install: `pip install pdfminer.six`"} |`),e.push(`| poppler (\`pdftotext\`) | ${f(S)} | ${S?"CLI tool available":r==="win32"?"Install: download poppler for Windows":r==="darwin"?"Install: `brew install poppler`":"Install: `apt install poppler-utils`"} |`),e.push(`| Ghostscript (\`gs\`) | ${f(A)} | ${A?"available":"optional"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Image Processing Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| Pillow (\`PIL\`) | ${f(g)} | ${g?`v${v} \u2014 recommended`:"Install: `pip install Pillow`"} |`),e.push(`| OpenCV (\`cv2\`) | ${f(k)} | ${k?"available":"Install: `pip install opencv-python`"} |`),e.push(`| ImageMagick (\`convert\`) | ${f(N||w)} | ${N||w?"CLI tool available":r==="win32"?"Install: imagemagick.org":r==="darwin"?"Install: `brew install imagemagick`":"Install: `apt install imagemagick`"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Agent Recommendations"),e.push(""),h||(e.push("> \u26A0\uFE0F **Python not found.** PDF reading and image processing via Python are not available."),e.push("> Install Python from https://python.org, then reopen a `.nodegraph.json` file to re-run this check."),e.push("")),e.push("### Reading a PDF"),i?(e.push("Use PyMuPDF (recommended \u2014 fastest and most accurate):"),e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push('text = "\\n".join(page.get_text() for page in doc)'),e.push("```")):p?(e.push("Use pdfplumber:"),e.push("```python"),e.push("import pdfplumber"),e.push('with pdfplumber.open("paper.pdf") as pdf:'),e.push('    text = "\\n".join(p.extract_text() or "" for p in pdf.pages)'),e.push("```")):S?(e.push("Use poppler CLI:"),e.push("```bash"),e.push("pdftotext paper.pdf -"),e.push("```")):e.push("\u274C No PDF reading tool available. Ask the user to install PyMuPDF: `pip install pymupdf`"),e.push(""),e.push("### Extracting images from a PDF"),i?(e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push("for i, page in enumerate(doc):"),e.push("    for img in page.get_images():"),e.push("        xref = img[0]"),e.push("        pix = fitz.Pixmap(doc, xref)"),e.push('        pix.save(f"fig_{i}_{xref}.png")'),e.push("```")):g?e.push("Pillow is available but cannot extract from PDF directly. Use PyMuPDF for extraction."):e.push("\u274C No image extraction tool available."),e.push(""),e.push("---"),e.push(""),e.push("*To refresh this report, reopen any `.nodegraph.json` file.*"),e.join(`
`)}async function W(e){let t=E.Uri.joinPath(e,".agent"),r=E.Uri.joinPath(t,"ENVIRONMENT.md");try{return await E.workspace.fs.createDirectory(t),await E.workspace.fs.writeFile(r,Buffer.from(be(),"utf-8")),!0}catch{return!1}}async function te(e){if(!(!e||e.length===0))for(let t of e)await W(t.uri)}async function re(e,t){let r=E.Uri.joinPath(e,".agent","NODEGRAPH_SPEC.md"),n;try{n=await E.workspace.fs.readFile(r)}catch{return!1}let o=E.Uri.joinPath(t,".agent"),s=E.Uri.joinPath(o,"NODEGRAPH_SPEC.md");try{return await E.workspace.fs.createDirectory(o),await E.workspace.fs.writeFile(s,n),!0}catch{return!1}}var ye=[{id:"tomoki1207.pdf",name:"vscode-pdf (PDF Viewer)"}];async function we(){for(let e of ye)if(!u.extensions.getExtension(e.id))try{await u.commands.executeCommand("workbench.extensions.installExtension",e.id)}catch{}}async function ne(e){if(e)return e;let t=u.workspace.workspaceFolders??[];return t.length===0?void 0:t.length===1?t[0].uri:(await u.window.showWorkspaceFolderPick({placeHolder:"Select a folder for NodeGraph"}))?.uri}async function Ee(e){let t=await ne(e),r=t?u.Uri.joinPath(t,"untitled.nodegraph.json"):void 0,n=await u.window.showSaveDialog({defaultUri:r,filters:{NodeGraph:["nodegraph.json"]},title:"Create New NodeGraph"});if(!n)return;let o=n.fsPath.endsWith(".nodegraph.json")?n:n.with({path:n.path.replace(/(\.nodegraph)?(\.json)?$/,"")+".nodegraph.json"}),s=_();await u.workspace.fs.writeFile(o,Buffer.from(JSON.stringify(s,null,2),"utf-8")),await u.commands.executeCommand("vscode.openWith",o,"nodegraph.editor")}function Ie(e){e.subscriptions.push(T.register(e)),e.subscriptions.push(u.commands.registerCommand("nodegraph.search",()=>{T.postToActive({type:"openSearch"})}),u.commands.registerCommand("nodegraph.fitView",()=>{T.postToActive({type:"fitView"})}),u.commands.registerCommand("nodegraph.collapseAll",()=>{T.postToActive({type:"collapseAll"})}),u.commands.registerCommand("nodegraph.expandAll",()=>{T.postToActive({type:"expandAll"})}),u.commands.registerCommand("nodegraph.new",t=>Ee(t))),te(u.workspace.workspaceFolders??[]),e.subscriptions.push(u.commands.registerCommand("nodegraph.copyAgentSpec",async t=>{let r=await ne(t);if(!r){u.window.showWarningMessage("NodeGraph: open or select a folder first \u2014 there is no workspace to copy the spec into.");return}let n=await re(e.extensionUri,r),o=await W(r);n&&o?u.window.showInformationMessage(`NodeGraph: wrote .agent/NODEGRAPH_SPEC.md and .agent/ENVIRONMENT.md in ${r.fsPath}.`):u.window.showErrorMessage("NodeGraph: failed to write the agent files \u2014 check that the folder is writable and try again.")})),we()}function ke(){}0&&(module.exports={activate,deactivate});
