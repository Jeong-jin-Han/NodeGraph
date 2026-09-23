"use strict";var Ee=Object.create;var R=Object.defineProperty;var Ie=Object.getOwnPropertyDescriptor;var ke=Object.getOwnPropertyNames;var Se=Object.getPrototypeOf,De=Object.prototype.hasOwnProperty;var Ae=(e,t)=>{for(var n in t)R(e,n,{get:t[n],enumerable:!0})},te=(e,t,n,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of ke(t))!De.call(e,i)&&i!==n&&R(e,i,{get:()=>t[i],enumerable:!(o=Ie(t,i))||o.enumerable});return e};var M=(e,t,n)=>(n=e!=null?Ee(Se(e)):{},te(t||!e||!e.__esModule?R(n,"default",{value:e,enumerable:!0}):n,e)),Te=e=>te(R({},"__esModule",{value:!0}),e);var qe={};Ae(qe,{activate:()=>je,deactivate:()=>ze});module.exports=Te(qe);var m=M(require("vscode"));var s=M(require("vscode")),he=M(require("path"));var N=M(require("vscode"));function G(e){let t=N.Uri.joinPath(e,".."),n=e.path.split("/").pop()?.replace(/\.nodegraph\.json$/,"")??"graph";return N.Uri.joinPath(t,`.${n}-imgs`)}function Ce(e,t,n){let o=N.Uri.joinPath(G(t),n);return e.asWebviewUri(o).toString()}var ne=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;function j(e,t,n){let o={},i=l=>{l&&!o[l]&&(o[l]=Ce(e,t,l))};for(let l of n.nodes){ne.lastIndex=0;let c;for(;(c=ne.exec(l.content??""))!==null;)i(c[1])}for(let l of n.canvasImages??[])i(l.filename);return o}async function oe(e,t,n,o="png"){let i=G(t);try{await N.workspace.fs.createDirectory(i)}catch{}let l=`img_${Date.now()}.${o}`,c=N.Uri.joinPath(i,l);return await N.workspace.fs.writeFile(c,Buffer.from(n,"base64")),{filename:l,webviewUri:e.asWebviewUri(c).toString()}}async function re(e,t){let n=N.Uri.joinPath(G(e),t);try{await N.workspace.fs.delete(n)}catch{}}var de=M(require("path"));function F(e){let t=e.match(/^(.+):(\d+)(?:-(\d+))?$/);return t?{path:t[1],startLine:parseInt(t[2],10),endLine:t[3]?parseInt(t[3],10):void 0}:{path:e}}var Me=/^([ \t]*)[-*+][ \t]+(.*)$/,Ne=/^([ \t]*)(\d+)[.)][ \t]+(.*)$/;function Oe(e){let t=0;for(let n of e)t+=n==="	"?4:1;return t}function ie(e){let t=e.items.map(n=>`<li style="margin:2px 0">${n}</li>`).join("");return e.ordered?`<ol start="${e.start}" style="margin:4px 0;padding-left:1.6em">${t}</ol>`:`<ul style="margin:4px 0;padding-left:1.35em">${t}</ul>`}function L(e){let t=e.split(`
`),n=[],o=[],i=r=>{for(;o.length>0&&o[o.length-1].indent>r;){let a=ie(o.pop()),p=o[o.length-1];p&&p.items.length>0?p.items[p.items.length-1]+=a:n.push({list:!0,html:a})}},l=()=>i(-1);for(let r of t){let a=Ne.exec(r),p=a?null:Me.exec(r);if(!a&&!p){l(),n.push({list:!1,text:r});continue}let u=!!a,d=Oe(a?a[1]:p[1]),x=a?a[3]:p[2];i(d);let h=o[o.length-1];if(h&&h.indent===d&&h.ordered!==u){let v=ie(o.pop()),b=o[o.length-1];b&&b.items.length>0?b.items[b.items.length-1]+=v:n.push({list:!0,html:v}),h=o[o.length-1]}(!h||h.indent<d)&&(h={indent:d,ordered:u,start:u?parseInt(a[2],10):1,items:[]},o.push(h)),h.items.push(x)}l();let c=n.filter((r,a)=>{if(r.list||r.text!=="")return!0;let p=n[a-1],u=n[a+1];return!(p?.list||u?.list)}),f="";for(let r=0;r<c.length;r++){let a=c[r];if(a.list){f+=a.html;continue}r>0&&!c[r-1].list&&(f+="<br>"),f+=a.text}return f}function E(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Pe(e){let t=e.trim().replace("#",""),n=t.length===3?t.split("").map(o=>o+o).join(""):t;return/^[0-9a-fA-F]{6}$/.test(n)?{r:255-parseInt(n.slice(0,2),16),g:255-parseInt(n.slice(2,4),16),b:255-parseInt(n.slice(4,6),16)}:null}var Le=e=>e.replace(/[^a-zA-Z0-9_-]/g,"_");function H(e){return/^\s*\|/.test(e)&&e.indexOf("|",1)!==-1}function q(e){return/^\s*\|[\s\-:|]+\|\s*$/.test(e)&&!/[a-zA-Z0-9]/.test(e)}function ae(e){return e.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(t=>t.trim())}function Be(e){if(!e)return[{type:"text",text:"",startChar:0,endChar:0}];let t=e.split(`
`),n=[],o=0,i=0,l=c=>t[c].length+(c<t.length-1?1:0);for(;o<t.length;)if(H(t[o])&&o+1<t.length&&q(t[o+1])){let f=i,r=[];for(;o<t.length&&H(t[o]);)r.push(t[o]),i+=l(o),o++;r.length>=3?n.push({type:"table",headers:ae(r[0]),rows:r.slice(2).map(ae),startChar:f,endChar:i}):n.push({type:"text",text:r.join(`
`),startChar:f,endChar:i})}else{let f=i,r=[];for(;o<t.length&&!(H(t[o])&&o+1<t.length&&q(t[o+1]));)r.push(t[o]),i+=l(o),o++;n.push({type:"text",text:r.join(`
`),startChar:f,endChar:i})}return n}function z(e){let t=e.split(`
`);for(let n=0;n+1<t.length;n++)if(H(t[n])&&q(t[n+1]))return!0;return!1}function Re(e){return E(e).replace(/\\\$/g,()=>'<span class="ng-cur">$</span>')}function $(e){return Re(e).replace(/\*\*(.+?)\*\*/g,'<strong style="font-size:1.1em">$1</strong>')}function _(e,t){let n=/\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g,o="",i=0,l;for(;(l=n.exec(e))!==null;){l.index>i&&(o+=$(e.slice(i,l.index)));let c=l[1],f=l[2],r=l[3],a=f&&r?` width="${f}" height="${r}"`:"",p=t[c];o+=p?`<img class="ng-img${a?" ng-img-sized":""}" src="${p}"${a} alt="${E(c)}" onclick="showLightbox(this.src)" title="Click to enlarge">`:`<span class="ng-img-missing">${E(c)}</span>`,i=l.index+l[0].length}return i<e.length&&(o+=$(e.slice(i))),o}function Fe(e,t){let n=e.headers.map(i=>`<th>${_(i,t)}</th>`).join(""),o=e.rows.map(i=>`<tr>${i.map(l=>`<td>${_(l,t)}</td>`).join("")}</tr>`).join("");return`<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${n}</tr></thead><tbody>${o}</tbody></table></div>`}function se(e){let t=/(\d+)\s*$/.exec(e);if(!t)return null;let n=parseInt(t[1],10);return Number.isNaN(n)?null:n}function He(e,t,n,o,i,l){let c=t?.color??"#888",f=t?.shape==="rounded"?"22px":"2px",r=E(t?.label??e.template),a=Math.round(e.position.x+n),p=Math.round(e.position.y+o),u="",d=e.content??"";if(z(d)){let g=Be(d);u+='<div class="ng-content">';for(let C of g)C.type==="table"?u+=Fe(C,i):C.text&&(u+=`<div class="ng-seg">${L(_(C.text,i))}</div>`);u+="</div>"}else d&&(u+=`<div class="ng-content">${L(_(d,i))}</div>`);if(e.original){let g=E(e.original.title??"Original"),C=e.originalExpanded?" open":"";u+=`<details class="ng-original"${C}><summary>${g}${e.original.location?` <span class="ng-loc">${E(e.original.location)}</span>`:""}</summary>
<div class="ng-orig-text">${L($(e.original.text))}</div></details>`}for(let g of e.toggleItems??[])u+=`<details class="ng-toggle" data-toggle-id="${E(g.id)}"${g.expanded?" open":""}><summary>${E(g.title||"(untitled)")}</summary>
<div class="ng-toggle-body">${L($(g.content))}</div></details>`;e.links.length&&(u+=`<div class="ng-links">${e.links.map(g=>{let C=g.type==="url"?"\u{1F517}":g.type==="pdf"?"\u{1F4C4}":g.type==="obsidian"?"\u{1F7E3}":g.type==="code"?"\u{1F4BB}":"\u2B21";if(g.type==="code"){let{path:K,startLine:Z,endLine:Q}=F(g.target),ee=de.posix.normalize(l.repoPrefix+K),ye=/\.ipynb$/i.test(K),we=Z&&!ye?`#L${Z}${Q?`-L${Q}`:""}`:"";return`<a class="ng-link"${l.githubBase&&!ee.startsWith("..")?` href="${E(l.githubBase)}/${E(ee)}${we}" target="_blank"`:""}>${C} ${E(g.label||g.target)}</a>`}return`<a class="ng-link"${g.type==="url"||g.type==="pdf"?` href="${E(g.target)}" target="_blank"`:""}>${C} ${E(g.label||g.target)}</a>`}).join("")}</div>`);let x=!!u,h=e.contentExpanded?"":' style="display:none"',v=e.children.length?` data-children="${e.children.join(",")}"`:"",b=z(d)?" ng-has-table":"",A=/\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g,I=0,S;for(;(S=A.exec(d))!==null;)I=Math.max(I,Number(S[1]));let y=I>0?z(d)?I+280:I+32:0,T=Math.max(e.nodeWidth??0,432,y),P=[T>432?`min-width:${T}px`:"",e.nodeHeight&&e.contentExpanded?`min-height:${e.nodeHeight}px`:""].filter(Boolean).join(";"),U=e.nodeHeight?` data-min-h="${e.nodeHeight}"`:"";return`<div class="ng-node${b}" id="node-${E(e.id)}"${v}${U} style="--color:${c};border-radius:${f};left:${a}px;top:${p}px${P?";"+P:""}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${c} 20%,transparent);color:${c}">${r}</span>
    ${se(e.id)===null?"":`<span class="ng-num" style="color:color-mix(in srgb,${c} 65%,#6b7280)">#${se(e.id)}</span>`}
    ${x?`<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${E(e.title)}</span>`:`<span class="ng-title">${E(e.title)}</span>`}
  </div>
  ${x?`<div class="ng-body"${h}${e.fontSize?` style="font-size:${e.fontSize}px"`:""}>${u}</div>`:""}
</div>`}function le(e,t={},n={githubBase:null,repoPrefix:""}){let o=1/0,i=1/0;for(let d of e.nodes)o=Math.min(o,d.position.x),i=Math.min(i,d.position.y);isFinite(o)||(o=0,i=0);let l=-o+100,c=-i+100,f=e.nodes.map(d=>He(d,e.nodeTemplates[d.template],l,c,t,n)).join(`
`),r=JSON.stringify(e.nodes.map(d=>({id:d.id,lx:Math.round(d.position.x+l),ly:Math.round(d.position.y+c),children:d.children??[],template:d.template,color:e.nodeTemplates[d.template]?.color??"#888888",contentExpanded:d.contentExpanded,isMain:d.template==="main_topic",nodeHeight:d.nodeHeight??null,naturalY:Math.round((d.nodeNaturalY??d.position.y)+c),title:d.title,content:d.content??"",originalTitle:d.original?.title??"",originalText:d.original?.text??"",toggles:(d.toggleItems??[]).map(x=>({id:x.id,title:x.title,content:x.content}))}))),a=JSON.stringify(e.edges.map(d=>({source:d.source,target:d.target,type:d.type,label:d.label||""}))),p=JSON.stringify(Object.fromEntries(Object.entries(e.nodeTemplates).map(([d,x])=>[d,x.label]))),u=Object.entries(e.nodeTemplates).map(([d,x])=>{let h=Pe(x.color),v=h?`rgb(${h.r},${h.g},${h.b})`:"#ff3b30",b=h?`rgba(${h.r},${h.g},${h.b},0.18)`:"rgba(255,59,48,0.18)";return`::highlight(ng-hit-${Le(d)}){color:${v};background-color:${b};text-decoration:underline}`}).join(`
`);return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${E(e.title)}</title>
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
.ng-header{display:flex;align-items:baseline;gap:6px;padding:6px 8px;cursor:default;user-select:none}
.ng-header:hover{background:rgba(0,0,0,.04)}
.ng-tag{font-size:10px;font-weight:600;padding:1px 6px;border-radius:3px;flex-shrink:0;white-space:nowrap;cursor:move;user-select:none}
.ng-num{font-size:10px;font-weight:700;letter-spacing:.02em;flex-shrink:0;white-space:nowrap;font-variant-numeric:tabular-nums;user-select:none}
.ng-hidden-count{font-size:10px;font-weight:600;flex-shrink:0;white-space:nowrap;padding:0 4px;border-radius:3px;font-variant-numeric:tabular-nums;user-select:none}
.ng-mode-btn{background:none;border:1px solid transparent;cursor:pointer;padding:1px 5px;font-size:11px;font-weight:600;color:#6b7280;border-radius:3px;line-height:1.4;flex-shrink:0}
.ng-mode-btn.active{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}
.ng-drop-num{color:#6b7280;font-weight:600;margin-right:6px;font-variant-numeric:tabular-nums}
#outline{position:absolute;top:0;left:0;bottom:0;width:256px;z-index:480;background:#fff;border-right:1px solid #d1d5db;box-shadow:2px 0 12px rgba(0,0,0,.08);display:none;flex-direction:column}
#outline.open{display:flex}
#outline-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
#outline-head span{font-size:12px;font-weight:700;color:#374151;flex:1}
#outline-head button{background:none;border:none;cursor:pointer;color:#6b7280;font-size:13px;padding:2px 4px;line-height:1}
#outline-crumbs{padding:6px 10px;border-bottom:1px solid #f3f4f6;flex-shrink:0;font-size:11px;color:#6b7280;display:flex;flex-wrap:wrap;align-items:center;gap:3px}
#outline-crumbs button{background:none;border:none;padding:0;cursor:pointer;font-size:11px;color:#2563eb}
#outline-crumbs button.here{color:#374151;font-weight:600}
#outline-cur{padding:8px 10px;border-bottom:1px solid #f3f4f6;flex-shrink:0;font-size:12px;font-weight:600;color:#111;display:none}
#outline-cur.on{display:block}
#outline-list{flex:1;overflow-y:auto;padding:6px 6px 12px}
#outline-label{font-size:10px;color:#9ca3af;padding:2px 8px 6px;font-weight:600;letter-spacing:.03em}
.ng-out-item{display:flex;align-items:baseline;gap:6px;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;line-height:1.4;text-align:left;width:100%;border:none;background:transparent;color:#1a1a1a}
.ng-out-item:hover{background:#f3f4f6}
.ng-out-item.sel{background:#e8f0fe;font-weight:600}
.ng-out-num{font-size:10px;font-weight:700;font-variant-numeric:tabular-nums;flex-shrink:0;min-width:26px}
.ng-out-title{flex:1;min-width:0}
.ng-out-count{font-size:10px;color:#9ca3af;flex-shrink:0}
.ng-title{flex:1;font-size:12px;font-weight:500;color:#1a1a1a;white-space:nowrap;line-height:1.35;padding-right:10px;cursor:pointer;user-select:none}
.ng-node.title-wrap .ng-title{white-space:normal;overflow-wrap:break-word}
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
${u}
/* \uC120\uD0DD \uB178\uB4DC\uC758 \uD55C \uC138\uB300(\uBD80\uBAA8+\uC790\uC2DD) \uD558\uC774\uB77C\uC774\uD2B8 \u2014 Esc\uB85C\uB9CC \uD574\uC81C */
.ng-node.ng-gen{border:2px solid #f87171 !important;box-shadow:0 0 0 3px rgba(248,113,113,.3),0 1px 4px rgba(0,0,0,.08) !important}
</style>
</head>
<body>
<div id="toolbar">
  <div id="tb-row1">
    <span id="tb-title">${E(e.title)}</span>
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
    <button id="tb-more-btn" onclick="toggleMoreCaps()" title="Toggle the More/Less content cap \u2014 when off, every node's content is always fully expanded">More</button>
    <button id="tb-outline-btn" onclick="toggleOutline()" title="Toggle the outline panel \u2014 shows the selected node's direct children in reading order, including folded ones">Outline</button>
    <span id="tb-levels" style="display:inline-flex;align-items:center;gap:2px;flex-shrink:0" title="How many levels to show at once \u2014 1 is the backbone alone"></span>
    <div class="tb-sep"></div>
    <span id="tb-sel" style="opacity:.35">Click a node to select</span>
  </div>
</div>
<div id="viewport">
  <div id="outline">
    <div id="outline-head"><span>Outline</span><button onclick="toggleOutline()" title="Hide the outline">\u2715</button></div>
    <div id="outline-crumbs"></div>
    <div id="outline-cur"></div>
    <div id="outline-list"><div id="outline-label"></div></div>
  </div>
  <div id="search-wrap">
    <div id="search-row">
      <input id="search-input" placeholder="Search nodes\u2026 (Ctrl+F)" oninput="doSearch(this.value)" onkeydown="onSearchKey(event)" onclick="onSearchInputClick()">
      <button id="search-mode-text" class="ng-mode-btn active" title="Search titles, content and quotes" onclick="setSearchMode('text')">Aa</button>
      <button id="search-mode-number" class="ng-mode-btn" title="Search by node number (17, 19-22)" onclick="setSearchMode('number')">#</button>
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
    ${f}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${r};
var EDGES = ${a};
var NODE_TEMPLATES = ${p};
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
  updateGridExtents();
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
  var next = selectedNodeId === nodeId ? null : nodeId;
  selectNode(next);
  // \uB178\uB4DC\uB97C \uACE0\uB974\uBA74 \uBAA9\uCC28\uB3C4 \uADF8 \uB178\uB4DC \uAE30\uC900\uC73C\uB85C \uB530\uB77C\uAC04\uB2E4
  if (outlineOpen) { outlineFocusId = next; renderOutline(); }
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
  if (expanding) { widenForFormulas(nodeEl); applyContentCaps(nodeEl); }
  applyKatexWidthForFold(nodeEl, expanding);
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
    //
    // Canvas.tsx\uC640 \uB3D9\uC77C: "\uC5EC\uB7EC source \u2192 \uD558\uB098\uC758 target" \uC218\uB834 \uAD6C\uC870\uC5D0\uC11C target\uC758 \uC2E4\uC81C
    // \uBD80\uBAA8\uB85C \uC548 \uBF51\uD78C \uB098\uBA38\uC9C0 source\uB4E4\uC774 orphan\uC73C\uB85C \uBE60\uC9C0\uB294 \uAC78 \uB9C9\uAE30 \uC704\uD574, target\uC774
    // main_topic\uC774 \uC544\uB2C8\uC5B4\uB3C4 \uAC00\uC0C1 \uBD80\uBAA8\uB85C \uCC44\uD0DD\uD55C\uB2E4 \u2014 \uB2E8 target \uCABD "\uC790\uC2E0\uC744 \uD5A5\uD558\uB294 \uCCAB
    // edge"\uAC00 \uBC14\uB85C \uC774 edge\uB77C\uBA74(\uC11C\uB85C\uAC00 \uC11C\uB85C\uC758 \uBD80\uBAA8\uAC00 \uB418\uB294 2\uB178\uB4DC \uC21C\uD658) \uC81C\uC678.
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

// \u2500\u2500 \uB514\uBC84\uADF8 \uACA9\uC790 \u2014 Canvas.tsx\uC758 computeGridLines\uC640 \uB3D9\uC77C\uD55C \uADDC\uCE59(\uAC00\uB85C\uC120: main topic
// \uD074\uB7EC\uC2A4\uD130 \uACBD\uACC4, \uC138\uB85C\uC120: hop depth\uBCC4 X \uACBD\uACC4). recomputePositions()\uAC00 \uC774\uC81C \uC5D0\uB514\uD130\uC640
// \uB3D9\uC77C\uD55C hop-tree \uB808\uC774\uC544\uC6C3 \uC54C\uACE0\uB9AC\uC998\uC744 \uC4F0\uC9C0\uB9CC, \uACA9\uC790 \uC790\uCCB4\uB294 \uADF8 \uACC4\uC0B0 \uACB0\uACFC\uC5D0 \uC758\uC874\uD558\uC9C0
// \uC54A\uACE0 \uD604\uC7AC DOM\uC5D0 \uC2E4\uC81C\uB85C \uADF8\uB824\uC9C4 \uC704\uCE58(el.style.left/top + offsetWidth/offsetHeight)\uB97C
// \uADF8\uB300\uB85C \uC77D\uC5B4\uC11C \uACC4\uC0B0\uD558\uBBC0\uB85C \uC5B4\uB5A4 \uBC30\uCE58 \uC54C\uACE0\uB9AC\uC998\uC744 \uC4F0\uB4E0 \uD56D\uC0C1 \uC2E4\uC81C \uB80C\uB354 \uACB0\uACFC\uC640 \uC77C\uCE58\uD55C\uB2E4.
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
  // \uACA9\uC790\uC120 \uAE38\uC774: \uACE0\uC815 \uC0C1\uC218(\xB110000)\uB294 More \uAE30\uBCF8 \uD3BC\uCE68 \uC774\uD6C4\uC758 \uD070 \uADF8\uB798\uD504\uC5D0\uC11C \uC138\uB85C\uC120\uC774
  // \uC911\uAC04\uC5D0 \uB04A\uACA8 \uBCF4\uC600\uC74C \u2014 \uC2E4\uC81C \uB178\uB4DC \uACBD\uACC4\uC640 \uD604\uC7AC \uD654\uBA74\uC5D0 \uBCF4\uC774\uB294 \uC6D4\uB4DC \uC601\uC5ED\uC758 \uD569\uC9D1\uD569
  // \uAE30\uC900\uC73C\uB85C \uC7A1\uC544 "\uBB34\uD55C\uCC98\uB7FC" \uBCF4\uC774\uAC8C \uD55C\uB2E4(\uC5D0\uB514\uD130 Canvas.tsx\uC640 \uB3D9\uC77C \uADDC\uCE59; \uD32C/\uC90C \uC2DC
  // applyTransform()\uC774 drawGrid\uB97C \uB2E4\uC2DC \uBD88\uB7EC \uB05D\uC810\uC774 \uACC4\uC18D \uB530\uB77C\uC634).
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  document.querySelectorAll('.ng-node').forEach(function(el) {
    var x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
    if (x < minX) minX = x;
    if (x + el.offsetWidth > maxX) maxX = x + el.offsetWidth;
    if (y < minY) minY = y;
    if (y + el.offsetHeight > maxY) maxY = y + el.offsetHeight;
  });
  if (!isFinite(minX)) { minX = 0; maxX = 0; minY = 0; maxY = 0; }
  gridNodeBounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  var ext = gridExtents();
  lines.vLines.forEach(function(x) { svg.appendChild(svgGridLine(x, ext.gy1, x, ext.gy2, '#22c55e')); });
  lines.hLines.forEach(function(y) { svg.appendChild(svgGridLine(ext.gx1, y, ext.gx2, y, '#f97316')); });
  updateZoomLineWeights();
}
var gridNodeBounds = null;
function gridExtents() {
  var b = gridNodeBounds || { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  var vw = vp.clientWidth, vh = vp.clientHeight;
  var viewX1 = (0 - tx) / scale, viewX2 = (vw - tx) / scale;
  var viewY1 = (0 - ty) / scale, viewY2 = (vh - ty) / scale;
  var PAD = 800;
  return {
    gx1: Math.min(b.minX, viewX1) - PAD, gx2: Math.max(b.maxX, viewX2) + PAD,
    gy1: Math.min(b.minY, viewY1) - PAD, gy2: Math.max(b.maxY, viewY2) + PAD
  };
}
// \uD32C/\uC90C \uD504\uB808\uC784\uB9C8\uB2E4: \uB178\uB4DC \uACBD\uACC4\uB294 drawGrid\uAC00 \uCE90\uC2DC\uD574 \uB454 \uAC12\uC744 \uC4F0\uACE0 \uBDF0 \uC601\uC5ED\uB9CC \uC0C8\uB85C
// \uACC4\uC0B0\uD574 \uAE30\uC874 \uC120\uC758 \uB05D\uC810 \uC18D\uC131\uB9CC \uAC31\uC2E0 \u2014 DOM \uC7AC\uC0DD\uC131 \uC5C6\uC774 \uBB34\uD55C\uCC98\uB7FC \uB530\uB77C\uC624\uAC8C \uD55C\uB2E4.
function updateGridExtents() {
  if (!showGrid) return;
  var svg = document.getElementById('grid-svg');
  if (!svg || svg.style.display === 'none') return;
  var ext = gridExtents();
  Array.prototype.forEach.call(svg.children, function(l) {
    if (l.getAttribute('stroke') === '#22c55e') { l.setAttribute('y1', ext.gy1); l.setAttribute('y2', ext.gy2); }
    else { l.setAttribute('x1', ext.gx1); l.setAttribute('x2', ext.gx2); }
  });
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
  var _foldT=foldTreeJs();
  NODES_DATA.forEach(function(n){
    var el=document.getElementById('node-'+n.id);
    // \uC811\uD600\uC11C \uC228\uACA8\uC9C4 \uB178\uB4DC\uB294 rect\uB97C \uB9CC\uB4E4\uC9C0 \uC54A\uB294\uB2E4 \u2014 \uC544\uB798 \uB77C\uC6B0\uD305 \uB8E8\uD504\uB4E4\uC774 \uC774\uBBF8
    // if(!rectById[...]) return \uC73C\uB85C \uAC70\uB974\uBBC0\uB85C \uC774 \uD55C \uACF3\uB9CC \uB9C9\uC73C\uBA74 \uC804\uBD80 \uBC18\uC601\uB41C\uB2E4
    if(el && !isNodeHidden(n.id,_foldT)) rectById[n.id]=getNodeRect(el);
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
  // \uBC88\uD638 \uBAA8\uB4DC\uC5D0\uB294 \uBCF8\uBB38\uC5D0 \uB300\uC751\uD558\uB294 \uD14D\uC2A4\uD2B8\uAC00 \uC5C6\uC73C\uBBC0\uB85C \uC778\uB77C\uC778 \uD558\uC774\uB77C\uC774\uD2B8\uB97C \uAC74\uB108\uB6F4\uB2E4
  if(!q||searchMode==='number'||!document.getElementById('search-wrap').classList.contains('open')) return;
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
// \u2500\u2500 \uACC4\uCE35 \uC811\uAE30 \u2014 \uC5D0\uB514\uD130 src/webview/utils/foldState.ts\uC640 \uAC19\uC740 \uADDC\uCE59.
// \uC0C1\uD0DC\uB294 "\uC790\uC190\uC744 \uC228\uAE30\uACE0 \uC788\uB294 \uB178\uB4DC \uC9D1\uD569" \uD558\uB098\uBFD0\uC774\uACE0, \uBCF4\uC774\uB294\uC9C0\uB294 "\uC870\uC0C1 \uC911 \uC811\uD78C \uAC83\uC774 \uC788\uB294\uAC00"\uB85C \uC815\uD55C\uB2E4.
var collapsedSet = {};
var foldHistory = [];
function foldTreeJs() {
  var d = outlineChildren();   // {kids, tree}
  return { parentOf: d.tree.parentOf, depthOf: d.tree.depthOf, kids: d.kids };
}
function isNodeHidden(id, t) {
  for (var p = t.parentOf[id]; p !== undefined && p !== null; p = t.parentOf[p]) {
    if (collapsedSet[p]) return true;
  }
  return false;
}
function descendantsJs(id, t) {
  var out = [], stack = (t.kids[id] || []).slice(), seen = {};
  while (stack.length) {
    var c = stack.pop();
    if (seen[c]) continue;
    seen[c] = 1; out.push(c);
    (t.kids[c] || []).forEach(function(k){ stack.push(k); });
  }
  return out;
}
function sameDepthJs(id, t) {
  var d = t.depthOf[id];
  return NODES_DATA.filter(function(n){ return t.depthOf[n.id] === d; }).map(function(n){ return n.id; });
}
function foldCompute(base, action, scope, id, t) {
  var next = {};
  Object.keys(base).forEach(function(k){ next[k] = 1; });
  var targets;
  if (scope === 'one') targets = [id];
  else if (scope === 'level') targets = sameDepthJs(id, t);
  else if (scope === 'chain') targets = [id].concat(descendantsJs(id, t));
  else targets = NODES_DATA.map(function(n){ return n.id; });
  if (action === 'expand') {
    targets.forEach(function(x){ delete next[x]; });
  } else {
    targets.forEach(function(x){ if ((t.kids[x] || []).length) next[x] = 1; });
  }
  return next;
}
function setsDiffer(a, b) {
  var ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return true;
  for (var i = 0; i < ka.length; i++) if (!b[ka[i]]) return true;
  return false;
}
function applyFoldVisibility() {
  var t = foldTreeJs();
  NODES_DATA.forEach(function(n){
    var el = document.getElementById('node-' + n.id);
    if (!el) return;
    el.style.display = isNodeHidden(n.id, t) ? 'none' : '';
    var badge = el.querySelector('.ng-hidden-count');
    var count = collapsedSet[n.id] ? descendantsJs(n.id, t).length : 0;
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ng-hidden-count';
        var after = el.querySelector('.ng-num') || el.querySelector('.ng-tag');
        after.parentNode.insertBefore(badge, after.nextSibling);
      }
      badge.textContent = '+' + count;
      badge.title = count + ' node(s) hidden below \u2014 right-click the tag to expand';
      badge.style.background = 'color-mix(in srgb,' + (n.color || '#888') + ' 18%,transparent)';
      badge.style.color = 'color-mix(in srgb,' + (n.color || '#888') + ' 70%,#374151)';
    } else if (badge) {
      badge.remove();
    }
  });
  // +N \uBC30\uC9C0\uAC00 \uBD99\uACE0 \uB5A8\uC5B4\uC9C0\uBA74 \uD5E4\uB354 \uD3ED\uC774 \uBC14\uB010\uB2E4 \u2014 \uB2E4\uC2DC \uC7AC\uC9C0 \uC54A\uC73C\uBA74 \uC81C\uBAA9\uC774 \uCE74\uB4DC \uBC16\uC73C\uB85C \uB118\uCE5C\uB2E4
  clampWideTitles();
  drawEdges();
  if (outlineOpen) renderOutline();
  renderLevelButtons();
}
function foldPick(action, scope, id) {
  shownDepth = null;
  var t = foldTreeJs();
  var next = foldCompute(collapsedSet, action, scope, id, t);
  foldHistory.push(collapsedSet);
  if (foldHistory.length > 20) foldHistory.shift();
  collapsedSet = next;
  applyFoldVisibility();
}
function foldUndo() {
  if (!foldHistory.length) return;
  shownDepth = null;
  collapsedSet = foldHistory.pop();
  applyFoldVisibility();
}
// \uC228\uACA8\uC9C4 \uB178\uB4DC\uB85C \uC774\uB3D9\uD574\uC57C \uD560 \uB54C \uC870\uC0C1 \uACBD\uB85C\uB97C \uD3BC\uCCD0 \uB4DC\uB7EC\uB0B8\uB2E4 (\uAC80\uC0C9/\uBAA9\uCC28\uC5D0\uC11C \uD638\uCD9C)
function revealNodeJs(id) {
  if (!Object.keys(collapsedSet).length) return;
  var t = foldTreeJs(), changed = false;
  var next = {};
  Object.keys(collapsedSet).forEach(function(k){ next[k] = 1; });
  for (var p = t.parentOf[id]; p !== undefined && p !== null; p = t.parentOf[p]) {
    if (next[p]) { delete next[p]; changed = true; }
  }
  if (!changed) return;
  foldHistory.push(collapsedSet);
  shownDepth = null;
  collapsedSet = next;
  applyFoldVisibility();
}
// \uCE35 \uC120\uD0DD \u2014 "\uBA87 \uCE35\uAE4C\uC9C0 \uBCF4\uC5EC\uC904\uC9C0"\uB97C \uD55C \uBC88\uC5D0 \uC815\uD55C\uB2E4 (\uC5D0\uB514\uD130 \uD234\uBC14\uC758 Levels\uC640 \uAC19\uC740 \uADDC\uCE59).
// \uCE35 \uB2E8\uC704\uB85C \uD30C\uC77C\uC744 \uCABC\uAC1C\uB294 \uB300\uC2E0 \uC774\uAC78 \uC4F4\uB2E4: \uBCF4\uC774\uB294 \uACB0\uACFC\uB294 \uAC19\uC73C\uBA74\uC11C \uAC80\uC0C9\xB7\uBAA9\uCC28\xB7\uC811\uAE30 \uC0C1\uD0DC\uAC00
// \uD30C\uC77C \uACBD\uACC4\uC5D0\uC11C \uB04A\uAE30\uC9C0 \uC54A\uB294\uB2E4.
// 0 = All, 1.. = \uADF8 \uCE35\uAE4C\uC9C0, null = \uC5B4\uB290 \uBC84\uD2BC\uC5D0\uB3C4 \uD574\uB2F9\uD558\uC9C0 \uC54A\uB294 \uC0C1\uD0DC
var shownDepth = 0;
function maxDepthJs(t) {
  var max = 0;
  NODES_DATA.forEach(function(n){ var d = t.depthOf[n.id]; if (d !== undefined && d > max) max = d; });
  return max;
}
function collapseToDepthJs(depth, t) {
  var next = {};
  if (depth <= 0) return next;
  NODES_DATA.forEach(function(n){
    if (!(t.kids[n.id] || []).length) return;
    var d = t.depthOf[n.id];
    if (d !== undefined && d >= depth - 1) next[n.id] = 1;
  });
  return next;
}
function setLevels(depth) {
  var t = foldTreeJs();
  foldHistory.push(collapsedSet);
  shownDepth = depth;
  collapsedSet = collapseToDepthJs(depth, t);
  applyFoldVisibility();
  renderLevelButtons();
}
function renderLevelButtons() {
  var host = document.getElementById('tb-levels');
  if (!host) return;
  var t = foldTreeJs();
  var max = maxDepthJs(t);
  host.innerHTML = '';
  if (max <= 0) return;
  var label = document.createElement('span');
  label.textContent = 'Levels';
  label.style.cssText = 'font-size:10px;opacity:.6;margin-right:2px';
  host.appendChild(label);
  function mk(text, depth) {
    var b = document.createElement('button');
    b.textContent = text;
    b.style.padding = '2px 6px';
    b.style.minWidth = '22px';
    if (shownDepth === depth) { b.style.background = '#2563eb'; b.style.color = '#fff'; }
    b.addEventListener('click', function(){ setLevels(depth); });
    host.appendChild(b);
  }
  for (var d = 1; d <= Math.min(max, 3); d++) mk(String(d), d);
  mk('All', 0);
}

function closeFoldMenu() {
  var m = document.getElementById('fold-menu');
  if (m) m.remove();
}
function openFoldMenu(nodeId, x, y) {
  closeFoldMenu();
  var t = foldTreeJs();
  var n = outlineNodeById(nodeId);
  var menu = document.createElement('div');
  menu.id = 'fold-menu';
  menu.style.cssText = 'position:fixed;z-index:900;min-width:236px;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:4px 0;font-size:12px;color:#1a1a1a';
  menu.style.left = Math.min(x, window.innerWidth - 250) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 290) + 'px';
  var head = document.createElement('div');
  head.style.cssText = 'padding:4px 12px 6px;font-size:11px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  head.textContent = (outlineNumOf(nodeId) ? outlineNumOf(nodeId) + '  ' : '') + (n ? n.title : nodeId);
  menu.appendChild(head);
  function add(action, scope, label) {
    var next = foldCompute(collapsedSet, action, scope, nodeId, t);
    var on = setsDiffer(collapsedSet, next);
    var b = document.createElement('button');
    b.textContent = label;
    b.disabled = !on;
    b.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;padding:5px 12px;border:none;background:transparent;text-align:left;font-size:12px;line-height:1.4;color:' + (on ? '#1a1a1a' : '#b0b4ba') + ';cursor:' + (on ? 'pointer' : 'default');
    if (on) {
      b.addEventListener('mouseenter', function(){ b.style.background = '#f3f4f6'; });
      b.addEventListener('mouseleave', function(){ b.style.background = 'transparent'; });
      b.addEventListener('click', function(){ foldPick(action, scope, nodeId); closeFoldMenu(); });
    }
    menu.appendChild(b);
  }
  function sep() {
    var d = document.createElement('div');
    d.style.cssText = 'height:1px;background:#f3f4f6;margin:4px 0';
    menu.appendChild(d);
  }
  add('expand', 'one', 'Expand children');
  add('expand', 'level', 'Expand this level');
  add('expand', 'chain', 'Expand all below');
  add('expand', 'all', 'Expand everything');
  sep();
  add('collapse', 'one', 'Collapse children');
  add('collapse', 'level', 'Collapse this level');
  add('collapse', 'chain', 'Collapse all below');
  add('collapse', 'all', 'Collapse everything');
  sep();
  var u = document.createElement('button');
  u.textContent = 'Undo last fold change';
  u.disabled = !foldHistory.length;
  u.style.cssText = 'display:flex;width:100%;padding:5px 12px;border:none;background:transparent;text-align:left;font-size:12px;color:' + (foldHistory.length ? '#1a1a1a' : '#b0b4ba') + ';cursor:' + (foldHistory.length ? 'pointer' : 'default');
  if (foldHistory.length) u.addEventListener('click', function(){ foldUndo(); closeFoldMenu(); });
  menu.appendChild(u);
  menu.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  menu.addEventListener('mousedown', function(e){ e.stopPropagation(); });
  document.body.appendChild(menu);
}
document.addEventListener('mousedown', function(e){
  var m = document.getElementById('fold-menu');
  if (m && !m.contains(e.target)) closeFoldMenu();
}, true);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeFoldMenu(); }, true);
document.addEventListener('contextmenu', function(e){
  var tag = e.target.closest ? e.target.closest('.ng-tag') : null;
  if (!tag) return;
  var card = tag.closest('.ng-node');
  if (!card) return;
  e.preventDefault();
  e.stopPropagation();
  openFoldMenu(card.id.replace('node-', ''), e.clientX, e.clientY);
}, true);

// \u2500\u2500 \uBAA9\uCC28 \uD328\uB110 \u2014 \uC5D0\uB514\uD130 OutlinePanel.tsx\uC640 \uAC19\uC740 \uADDC\uCE59.
// children[]\uC774 \uBE44\uC5B4 \uC788\uC5B4\uB3C4 \uB418\uB3C4\uB85D hop \uD2B8\uB9AC\uC758 parentOf\uC5D0\uC11C \uC790\uC2DD\uC744 \uC5ED\uC0B0\uD558\uACE0,
// contentExpanded\uB294 \uBCF4\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uC811\uD600 \uC788\uB294 \uB178\uB4DC\uB3C4 \uC804\uBD80 \uB098\uC628\uB2E4.
var outlineOpen=false;
var outlineFocusId=null;
function outlineChildren(){
  var tree=buildHopTreeJs();
  var kids={};
  NODES_DATA.forEach(function(n){
    var p=tree.parentOf[n.id];
    if(p!==undefined&&p!==null) (kids[p]=kids[p]||[]).push(n.id);
  });
  return {kids:kids,tree:tree};
}
function outlineNodeById(id){
  for(var i=0;i<NODES_DATA.length;i++) if(NODES_DATA[i].id===id) return NODES_DATA[i];
  return null;
}
function outlineNumOf(id){var n=nodeNumOfJs(id);return n===null?'':'#'+n;}
function toggleOutline(){
  outlineOpen=!outlineOpen;
  document.getElementById('outline').classList.toggle('open',outlineOpen);
  var b=document.getElementById('tb-outline-btn');
  b.style.background=outlineOpen?'#2563eb':''; b.style.color=outlineOpen?'#fff':'';
  if(outlineOpen) renderOutline();
}
function outlineDrill(id){
  outlineFocusId=id;
  revealNodeJs(id);
  selectNode(id);
  flyToNode(id);
  renderOutline();
}
function outlineUp(id){
  outlineFocusId=id;
  if(id){selectNode(id);flyToNode(id);} else {selectNode(null);}
  renderOutline();
}
function renderOutline(){
  if(!outlineOpen) return;
  var d=outlineChildren(), kids=d.kids, tree=d.tree;
  var focus=(outlineFocusId&&outlineNodeById(outlineFocusId))?outlineFocusId:null;

  // \uBE0C\uB808\uB4DC\uD06C\uB7FC
  var trail=[], seen={};
  for(var cur=focus; cur&&outlineNodeById(cur)&&!seen[cur]; cur=(tree.parentOf[cur]!==undefined?tree.parentOf[cur]:null)){
    seen[cur]=1; trail.unshift(cur);
  }
  var cr=document.getElementById('outline-crumbs');
  cr.innerHTML='';
  var top=document.createElement('button');
  top.textContent='Top';
  if(!trail.length) top.style.color='#6b7280';
  top.addEventListener('click',function(){outlineUp(null);});
  cr.appendChild(top);
  trail.forEach(function(id,i){
    var sep=document.createElement('span'); sep.textContent='\u203A'; sep.style.color='#9ca3af'; cr.appendChild(sep);
    var b=document.createElement('button');
    b.textContent=outlineNumOf(id)||(outlineNodeById(id)||{}).title;
    b.title=(outlineNodeById(id)||{}).title||'';
    if(i===trail.length-1) b.className='here';
    b.addEventListener('click',function(){outlineUp(id);});
    cr.appendChild(b);
  });

  // \uD604\uC7AC \uB178\uB4DC
  var curEl=document.getElementById('outline-cur');
  if(focus){
    var fn=outlineNodeById(focus);
    curEl.innerHTML='';
    var num=document.createElement('span');
    num.className='ng-out-num'; num.style.color=fn.color||'#888'; num.textContent=outlineNumOf(focus);
    curEl.appendChild(num);
    curEl.appendChild(document.createTextNode(' '+fn.title));
    curEl.classList.add('on');
  } else { curEl.classList.remove('on'); curEl.innerHTML=''; }

  // \uC9C1\uC18D \uC790\uC2DD \u2014 \uC77D\uB294 \uC21C\uC11C(\uD654\uBA74 \uBC30\uCE58 \uC21C\uC11C)\uB300\uB85C
  var ids = focus ? (kids[focus]||[]) : NODES_DATA.filter(function(n){return tree.depthOf[n.id]===0;}).map(function(n){return n.id;});
  var items = ids.map(outlineNodeById).filter(Boolean)
    .sort(function(a,b){return (a.ly-b.ly)||(a.lx-b.lx);});

  var list=document.getElementById('outline-list');
  list.innerHTML='';
  var label=document.createElement('div');
  label.id='outline-label';
  label.textContent = items.length===0 ? 'NOTHING BELOW THIS NODE' : (focus?'READ IN THIS ORDER':'BACKBONE \u2014 READ IN THIS ORDER');
  list.appendChild(label);
  items.forEach(function(n){
    var b=document.createElement('button');
    b.className='ng-out-item'+(n.id===selectedNodeId?' sel':'');
    b.title=n.title;
    var num=document.createElement('span');
    num.className='ng-out-num'; num.style.color=n.color||'#888'; num.textContent=outlineNumOf(n.id);
    b.appendChild(num);
    var t=document.createElement('span'); t.className='ng-out-title'; t.textContent=n.title; b.appendChild(t);
    var c=(kids[n.id]||[]).length;
    if(c>0){var cc=document.createElement('span');cc.className='ng-out-count';cc.textContent='\u203A'+c;b.appendChild(cc);}
    b.addEventListener('click',function(){outlineDrill(n.id);});
    list.appendChild(b);
  });
}

// 'text' = \uC81C\uBAA9/\uB0B4\uC6A9/\uC6D0\uBB38/\uD1A0\uAE00, 'number' = \uB178\uB4DC \uBC88\uD638. \uC5D0\uB514\uD130 SearchBar\uC758 \uBAA8\uB4DC\uC640 \uB3D9\uC77C
var searchMode='text';
function setSearchMode(m){
  searchMode=m;
  document.getElementById('search-mode-text').classList.toggle('active',m==='text');
  document.getElementById('search-mode-number').classList.toggle('active',m==='number');
  var input=document.getElementById('search-input');
  input.placeholder = m==='number' ? 'Node number\u2026 e.g. 17, 19-22' : 'Search nodes\u2026 (Ctrl+F)';
  doSearch(input.value);
  input.focus();
}
// "17", "17 19", "17,19", "17-20" \uACFC \uADF8 \uC870\uD569. \uC4F8 \uC218 \uC788\uB294 \uD1A0\uD070\uC774 \uC5C6\uC73C\uBA74 null\uC744 \uB3CC\uB824
// \uD638\uCD9C\uBD80\uAC00 "\uC804\uBD80 \uB9E4\uCE58"\uAC00 \uC544\uB2C8\uB77C 0\uAC74\uC744 \uBCF4\uC5EC\uC8FC\uAC8C \uD55C\uB2E4
function parseNumberQuery(q){
  var ranges=[];
  q.split(/[\\s,]+/).forEach(function(t){
    if(!t) return;
    var r=/^(\\d+)-(\\d+)$/.exec(t);
    if(r){var a=parseInt(r[1],10),b=parseInt(r[2],10);ranges.push(a<=b?[a,b]:[b,a]);return;}
    if(/^\\d+$/.test(t)){var v=parseInt(t,10);ranges.push([v,v]);}
  });
  if(!ranges.length) return null;
  return function(n){return ranges.some(function(p){return n>=p[0]&&n<=p[1];});};
}
function nodeNumOfJs(id){
  var m=/(\\d+)\\s*$/.exec(id);
  if(!m) return null;
  var n=parseInt(m[1],10);
  return isNaN(n)?null:n;
}
function doSearch(q){
  clearSearchHighlights();
  searchSelectedId=null;kbIdx=-1;
  var query=q.trim().toLowerCase();
  if(!query){document.getElementById('search-count').textContent='';closeDropdown();searchMatchNodes=[];return;}
  var numMatch = searchMode==='number' ? parseNumberQuery(query) : null;
  if(searchMode==='number' && !numMatch){
    searchMatchNodes=[];updateSearchCount();closeDropdown();return;
  }
  searchMatchNodes=NODES_DATA.filter(function(n){
    if(numMatch){var v=nodeNumOfJs(n.id);return v!==null&&numMatch(v);}
    return nodeMatchesQuery(n,query);
  });
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
    var num=nodeNumOfJs(n.id);
    if(num!==null){
      var numEl=document.createElement('span');
      numEl.className='ng-drop-num';
      numEl.textContent='#'+num;
      div.appendChild(numEl);
    }
    div.appendChild(document.createTextNode(titleEl?titleEl.textContent:n.id));
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
  revealNodeJs(id);
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
      if(!datum.contentExpanded){body.style.display='';datum.contentExpanded=true;widenForFormulas(nodeEl);applyContentCaps(nodeEl);applyKatexWidthForFold(nodeEl,true);}
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

// \uB178\uB4DC \uD3ED\uBCF4\uB2E4 \uB113\uC740 display \uC218\uC2DD\uC740 (\uC5D0\uB514\uD130\uC758 \uC790\uB3D9 \uD655\uC7A5\uACFC \uB3D9\uC77C\uD558\uAC8C) \uC2A4\uD06C\uB864\uBC14 \uB300\uC2E0
// \uB178\uB4DC min-width\uB97C \uB118\uCE5C \uC591\uB9CC\uD07C \uB298\uB824\uC11C \uC218\uC6A9. offsetWidth/scrollWidth\uB294 CSS transform\uACFC
// \uBB34\uAD00\uD55C \uB808\uC774\uC544\uC6C3 \uAC12\uC774\uB77C \uC90C \uC0C1\uD0DC\uC640 \uC0C1\uAD00\uC5C6\uC774 \uC5B8\uC81C\uB4E0 \uC548\uC804\uD558\uAC8C \uCE21\uC815 \uAC00\uB2A5 \u2014 fold\uB97C
// \uD3BC\uCE60 \uB54C(scope \uC9C0\uC815)\uB3C4 \uADF8\uB300\uB85C \uC7AC\uC0AC\uC6A9\uD55C\uB2E4.
function widenForFormulas(scope) {
  (scope ? [scope] : Array.prototype.slice.call(document.querySelectorAll('.ng-node'))).forEach(function(nodeEl) {
    var maxOv = 0;
    nodeEl.querySelectorAll('.katex-display').forEach(function(kd) {
      var ov = kd.scrollWidth - kd.clientWidth;
      if (ov > maxOv) maxOv = ov;
    });
    if (maxOv > 0) {
      // \uC811\uC744 \uB54C \uC6D0\uB798 \uD3ED\uC73C\uB85C \uBCF5\uADC0\uD560 \uC218 \uC788\uB3C4\uB85D \uC6D0\uBCF8 inline min-width\uB97C \uBA3C\uC800 \uBCF4\uAD00
      // (\uC5D0\uB514\uD130\uC758 katexMinWidth\uC640 \uB3D9\uC77C\uD558\uAC8C, \uC218\uC2DD \uD655\uC7A5 \uD3ED\uC740 \uD3BC\uCE5C \uB3D9\uC548\uB9CC \uC801\uC6A9).
      if (!nodeEl.hasAttribute('data-orig-minw')) nodeEl.setAttribute('data-orig-minw', nodeEl.style.minWidth || '');
      var widened = Math.ceil(nodeEl.offsetWidth + maxOv + 4) + 'px';
      nodeEl.setAttribute('data-katex-minw', widened);
      nodeEl.style.minWidth = widened;
    }
  });
}

// fold/unfold \uC2DC \uC218\uC2DD \uD655\uC7A5 \uD3ED\uC744 \uC801\uC6A9/\uD574\uC81C \u2014 \uC811\uD78C \uB178\uB4DC\uB294 \uC6D0\uB798 \uD3ED\uC73C\uB85C \uB3CC\uC544\uAC04\uB2E4.
function applyKatexWidthForFold(nodeEl, expanded) {
  if (!nodeEl.hasAttribute('data-katex-minw')) return;
  nodeEl.style.minWidth = expanded
    ? nodeEl.getAttribute('data-katex-minw')
    : nodeEl.getAttribute('data-orig-minw');
}

// \uBCF8\uBB38 \uB192\uC774 \uC0C1\uD55C(More/Less) \u2014 NodeCard.tsx\uC758 DEFAULT_CONTENT_MAX \uB85C\uC9C1\uC744 \uADF8\uB300\uB85C \uC774\uC2DD.
// .ng-content\uB294 node.content \uC804\uC6A9 \uD074\uB798\uC2A4\uB77C\uC11C(toggle/original\uC740 \uAC01\uAC01
// .ng-toggle-body / .ng-orig-text \uB97C \uC500) \uC774 \uC140\uB809\uD130\uB9CC\uC73C\uB85C \uC774\uBBF8 "content\uB9CC" \uBC94\uC704\uAC00
// \uC7A1\uD78C\uB2E4 \u2014 \uC5D0\uB514\uD130\uC640 \uB3D9\uC77C\uD558\uAC8C toggle/original\uC5D0\uB294 \uCEA1\uC744 \uC801\uC6A9\uD558\uC9C0 \uC54A\uC74C.
// scope\uB97C \uC8FC\uBA74 \uADF8 \uC548\uC758 .ng-content\uB9CC \uC7AC\uCE21\uC815(fold/unfold\uB098 \uAC80\uC0C9\uC73C\uB85C \uCC98\uC74C \uBCF4\uC774\uAC8C
// \uB420 \uB54C \u2014 display:none \uC0C1\uD0DC\uC5D0\uC11C \uCE21\uC815\uD558\uBA74 \uC804\uBD80 0\uC73C\uB85C \uB098\uC640\uC11C \uBC84\uD2BC\uC774 \uD544\uC694 \uC5C6\uB2E4\uACE0
// \uC798\uBABB \uD310\uB2E8\uD558\uAE30 \uB54C\uBB38\uC5D0 \uB2E4\uC2DC \uBCF4\uC774\uAC8C \uB41C \uC2DC\uC810\uC5D0 \uC7AC\uCE21\uC815\uC774 \uD544\uC694\uD568).
var DEFAULT_CONTENT_MAX = 500;
// \uAE30\uBCF8\uAC12 \uAEBC\uC9D0(\uD56D\uC0C1 \uC804\uCCB4 \uD3BC\uCE68) \u2014 \uC5D0\uB514\uD130 \uD234\uBC14\uC758 More \uD1A0\uAE00 \uAE30\uBCF8\uAC12\uACFC \uB3D9\uC77C\uD558\uAC8C \uC720\uC9C0.
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

// Original \uC139\uC158 \uAE30\uBCF8 \uC0C1\uD0DC\uB97C More \uD1A0\uAE00\uC5D0 \uC5F0\uB3D9: More \uAEBC\uC9D0(\uAE30\uBCF8)\uC774\uBA74 \uBAA8\uB4E0 Original\uC744
// \uD3BC\uCE58\uACE0, \uCF1C\uBA74 JSON\uC5D0 \uC800\uC7A5\uB41C \uC6D0\uB798 open \uC0C1\uD0DC(data-orig-open\uC5D0 \uCD5C\uCD08 1\uD68C \uBCF4\uAD00)\uB85C \uBCF5\uC6D0.
// \uC774\uD6C4\uC758 \uAC1C\uBCC4 \uC218\uB3D9 \uD1A0\uAE00(native details)\uC740 \uC5B4\uB290 \uBAA8\uB4DC\uC5D0\uC11C\uB4E0 \uC790\uC720\uB86D\uAC8C \uB3D9\uC791\uD55C\uB2E4.
function applyOriginalDefaults() {
  document.querySelectorAll('details.ng-original').forEach(function(d) {
    if (!d.hasAttribute('data-orig-open')) d.setAttribute('data-orig-open', d.open ? '1' : '0');
    d.open = capsEnabled ? (d.getAttribute('data-orig-open') === '1') : true;
  });
}

// \uD234\uBC14 More \uD1A0\uAE00 \u2014 \uB044\uBA74 \uBAA8\uB4E0 \uB178\uB4DC\uC758 \uCF58\uD150\uCE20 \uCEA1\uACFC More/Less \uBC84\uD2BC\uC774 \uC0AC\uB77C\uC9C0\uACE0 \uD56D\uC0C1
// \uC804\uCCB4 \uD3BC\uCE68 + Original \uC139\uC158\uB3C4 \uC804\uBD80 \uD3BC\uCE68(\uC5D0\uB514\uD130 \uD234\uBC14\uC758 \uB3D9\uC77C \uD1A0\uAE00\uACFC \uC9DD\uC744 \uC774\uB8F8).
// \uB2E4\uC2DC \uCF1C\uBA74 applyContentCaps()\uAC00 \uCEA1/\uBC84\uD2BC\uC744, applyOriginalDefaults()\uAC00 Original\uC758
// \uC800\uC7A5 \uC0C1\uD0DC\uB97C \uC6D0\uB798\uB300\uB85C \uBCF5\uC6D0\uD55C\uB2E4.
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
  applyOriginalDefaults();
  setTimeout(function() { recomputePositions(); drawEdges(); }, 0);
}

// \uC81C\uBAA9 \uD55C \uC904 \uB54C\uBB38\uC5D0 \uCE74\uB4DC\uAC00 \uC9C0\uB098\uCE58\uAC8C \uB113\uC5B4\uC9C0\uBA74 TITLE_MAX_WIDTH\uC5D0\uC11C \uBA48\uCD94\uACE0 \uC81C\uBAA9\uC744 \uC811\uB294\uB2E4.
// \uC5D0\uB514\uD130(NodeCard.tsx)\uC758 TITLE_MAX_WIDTH / titleWraps\uC640 \uAC19\uC740 \uAC12\xB7\uAC19\uC740 \uADDC\uCE59.
var TITLE_MAX_WIDTH = 660;
function clampWideTitles() {
  document.querySelectorAll('.ng-node').forEach(function(el) {
    // \uCD5C\uCD08 1\uD68C, \uC11C\uBC84\uAC00 \uB123\uC5B4\uC900 min-width\uB97C \uAE30\uC5B5\uD574\uB454\uB2E4 (\uC5EC\uB7EC \uBC88 \uBD88\uB824\uB3C4 \uAE30\uC900\uC774 \uD754\uB4E4\uB9AC\uC9C0 \uC54A\uAC8C)
    if (el.dataset.origMinw === undefined) el.dataset.origMinw = el.style.minWidth || '';
    el.classList.remove('title-wrap');
    el.style.removeProperty('max-width');
    if (el.dataset.origMinw) el.style.minWidth = el.dataset.origMinw;
    else el.style.removeProperty('min-width');

    // \uD45C\xB7\uC774\uBBF8\uC9C0\uAC00 \uD3ED\uC744 \uC694\uAD6C\uD558\uB294 \uCE74\uB4DC\uB294 \uC81C\uBAA9\uACFC \uBB34\uAD00\uD558\uAC8C \uB113\uC740 \uAC83\uC774\uBBC0\uB85C \uC190\uB300\uC9C0 \uC54A\uB294\uB2E4
    if (el.querySelector('.ng-body table, .ng-body img')) return;
    // \uC0AC\uC6A9\uC790\uAC00/\uC5D0\uC774\uC804\uD2B8\uAC00 \uC77C\uBD80\uB7EC \uC0C1\uD55C\uBCF4\uB2E4 \uB113\uAC8C \uC9C0\uC815\uD55C \uCE74\uB4DC\uB3C4 \uADF8\uB300\uB85C \uB454\uB2E4
    if ((parseFloat(el.dataset.origMinw) || 0) > TITLE_MAX_WIDTH) return;
    if (el.offsetWidth <= TITLE_MAX_WIDTH) return;

    // \uCE74\uB4DC \uD3ED\uC740 min-content\uB85C \uC815\uD574\uC9C0\uB294\uB370, \uC81C\uBAA9\uC774 \uC811\uD788\uBA74 min-content\uAC00 '\uAC00\uC7A5 \uAE34 \uB2E8\uC5B4'\uB85C
    // \uB5A8\uC5B4\uC838 \uCE74\uB4DC\uAC00 432px\uAE4C\uC9C0 \uC8FC\uC800\uC549\uB294\uB2E4 \u2014 \uADF8\uB798\uC11C max\uB9CC\uC774 \uC544\uB2C8\uB77C \uD3ED \uC790\uCCB4\uB97C \uACE0\uC815\uD55C\uB2E4.
    el.style.minWidth = TITLE_MAX_WIDTH + 'px';
    el.style.maxWidth = TITLE_MAX_WIDTH + 'px';
    el.classList.add('title-wrap');
  });
}

window.addEventListener('load', function() {
  // Render KaTeX first so node heights are accurate
  initKatex();
  widenForFormulas();
  applyOriginalDefaults();
  // KaTeX \uC6F9\uD3F0\uD2B8\uB294 load \uC774\uBCA4\uD2B8 \uC774\uD6C4\uC5D0 \uB3C4\uCC29\uD560 \uC218 \uC788\uACE0, \uADF8\uB7EC\uBA74 \uC218\uC2DD \uD3ED\uC774 \uBC14\uB010\uB2E4 \u2014
  // \uD3F0\uD2B8 \uC801\uC6A9 \uD6C4 \uD55C \uBC88 \uB354 \uCE21\uC815/\uD655\uC7A5\uD558\uACE0 \uB808\uC774\uC544\uC6C3 \uC7AC\uACC4\uC0B0 (\uC5D0\uB514\uD130 NodeCard\uC640 \uB3D9\uC77C \uBCF4\uAC15).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      widenForFormulas();
      recomputePositions();
      drawEdges();
    });
  }
  // scale\uB294 \uC544\uC9C1 \uCD08\uAE30\uAC12 1\uC774\uB77C(fitView\uAC00 \uC544\uC9C1 \uC548 \uB3CC\uC544\uC11C) getBoundingClientRect()
  // \uCE21\uC815\uAC12\uC774 \uCE94\uBC84\uC2A4 local \uC88C\uD45C\uC640 \uC77C\uCE58\uD568 \u2014 fitView \uC774\uD6C4\uB85C \uBBF8\uB8E8\uBA74 \uCD95\uC18C\uB41C \uD654\uBA74 \uD53D\uC140\uC744
  // local px\uB85C \uCC29\uAC01\uD574\uC11C \uCEA1 \uB192\uC774\uAC00 \uC798\uBABB \uACC4\uC0B0\uB428.
  clampWideTitles();
  renderLevelButtons();
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
</html>`}var $e={main_topic:{label:"Main topic",color:"#4B8BBE",icon:"file-text",shape:"sharp"},method:{label:"Method",color:"#5C9E6E",icon:"cpu",shape:"sharp"},result:{label:"Result",color:"#9B59B6",icon:"bar-chart-2",shape:"sharp"},claim:{label:"Claim",color:"#E74C3C",icon:"alert-circle",shape:"sharp"},question:{label:"Question",color:"#E5A835",icon:"help-circle",shape:"rounded"},gap:{label:"Gap / Idea",color:"#1ABC9C",icon:"lightbulb",shape:"rounded"},reference:{label:"Reference",color:"#95A5A6",icon:"book-open",shape:"rounded"},memo:{label:"Memo",color:"#BDC3C7",icon:"edit-3",shape:"rounded"}};function W(e="New Graph"){let t=new Date().toISOString();return{version:"1.0.0",title:e,created:t,modified:t,nodeTemplates:$e,nodes:[],edges:[],viewport:{x:0,y:0,zoom:1}}}function X(){let e="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)e+=t.charAt(Math.floor(Math.random()*t.length));return e}var D=M(require("vscode")),ce=M(require("fs"));var Y=class e{static{this.panels=new Map}static async openAndSearch(t,n,o,i){let l=n.toString(),c=e.panels.get(l);if(c){c.panel.reveal(D.ViewColumn.Beside,!0),c.ready?c.panel.webview.postMessage({type:"search",query:o,pageHint:i}):c.pending={query:o,pageHint:i};return}let f;try{f=await D.workspace.fs.readFile(n)}catch{D.window.showErrorMessage(`PDF\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${n.fsPath}`);return}let r=D.window.createWebviewPanel("nodegraph.pdfViewer",n.path.split("/").pop()??"PDF",{viewColumn:D.ViewColumn.Beside,preserveFocus:!1},{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[D.Uri.joinPath(t.extensionUri,"dist")]}),a={panel:r,ready:!1,pending:{query:o,pageHint:i}};e.panels.set(l,a),r.iconPath=D.Uri.joinPath(t.extensionUri,"resources","icon-hires.png"),r.webview.html=e._getHtml(t,r.webview);let p=Buffer.from(f).toString("base64");r.webview.onDidReceiveMessage(u=>{u.type==="ready"&&(a.ready=!0,r.webview.postMessage({type:"load",pdfData:p,query:a.pending?.query,pageHint:a.pending?.pageHint}),a.pending=null)}),r.onDidDispose(()=>{e.panels.delete(l)})}static _getHtml(t,n){let o=D.Uri.joinPath(t.extensionUri,"dist","pdfjs-viewer","web"),i=n.asWebviewUri(o).toString()+"/",l=n.asWebviewUri(D.Uri.joinPath(t.extensionUri,"dist","pdfjs-viewer","build","pdf.worker.min.mjs")),c=D.Uri.joinPath(o,"viewer.html").fsPath,f=X(),r=`default-src 'none'; img-src ${n.cspSource} data: blob:; script-src 'nonce-${f}' ${n.cspSource}; style-src 'unsafe-inline' ${n.cspSource}; worker-src ${n.cspSource} blob:; connect-src ${n.cspSource} blob:;`;return ce.readFileSync(c,"utf-8").replace('<meta charset="utf-8">',`<meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${r}">
    <base href="${i}">
    <style>
      /* VS Code injects default webview styles including body{padding:0 20px} \u2014
         that shifts the full-bleed pdf.js layout sideways and clips the toolbar's
         right edge off the panel. Reset to the full-window box the viewer expects. */
      html, body { margin: 0 !important; padding: 0 !important; }
    </style>
    <script nonce="${f}">
      window.__PDF_WORKER_URI__ = "${l}";
      document.addEventListener('webviewerloaded', () => {
        window.PDFViewerApplicationOptions.set('defaultUrl', '');
        // Start with the sidebar closed (0 = SidebarView.NONE). An explicit 0 (rather
        // than the -1/UNKNOWN default) also overrides any remembered open state from
        // the viewer's own view-history storage. The outline stays one click away on
        // the sidebar toggle; user preference is closed-by-default (quote-jump is the
        // primary use, and the sidebar eats horizontal space in a Beside panel).
        window.PDFViewerApplicationOptions.set('sidebarViewOnLoad', 0);
      });
    </script>`)}};var pe=M(require("child_process"));function V(e,t){try{return pe.execSync(e,{cwd:t,timeout:5e3,stdio:["pipe","pipe","pipe"]}).toString().trim()}catch{return""}}function _e(e){let t=e.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);return t?`${t[1]}/${t[2]}`:null}function ue(e){let t=V("git remote get-url origin",e);if(!t)return null;let n=_e(t);if(!n)return null;let o=V("git rev-parse HEAD",e);return o?`https://github.com/${n}/blob/${o}`:null}function fe(e){let t=V("git rev-parse --show-toplevel",e);if(!t)return"";let n=e.replace(/\\/g,"/").replace(t.replace(/\\/g,"/"),"").replace(/^\/+/,"");return n?`${n}/`:""}var O=class e{constructor(t){this.context=t;this._pendingSaves=new Set}static register(t){let n=new e(t);return s.window.registerCustomEditorProvider("nodegraph.editor",n,{webviewOptions:{retainContextWhenHidden:!0}})}static{this._activeWebview=null}static postToActive(t){e._activeWebview?.postMessage(t)}static async focusActiveAndPost(t){let n=e.activeGraphEntry()??e.lastActiveEntry();n&&(await s.commands.executeCommand("vscode.openWith",n.uri,"nodegraph.editor",{viewColumn:n.panel.viewColumn,preserveFocus:!1}),n.panel.webview.postMessage(t))}static{this._panels=new Map}static{this._lastActiveUri=null}static activeGraphEntry(){let t=s.window.tabGroups.activeTabGroup.activeTab?.input;if(!(t instanceof s.TabInputCustom)||t.viewType!=="nodegraph.editor")return;let n=e._panels.get(t.uri.toString());return n?{uri:t.uri,panel:n}:void 0}static lastActiveEntry(){let t=e._lastActiveUri,n=t?e._panels.get(t):void 0;return t&&n?{uri:s.Uri.parse(t),panel:n}:void 0}static syncGraphTabContext(){s.commands.executeCommand("setContext","nodegraph.graphTabActive",!!e.activeGraphPanel())}static activeGraphPanel(){return e.activeGraphEntry()?.panel}async resolveCustomTextEditor(t,n,o){n.iconPath=s.Uri.joinPath(this.context.extensionUri,"resources","icon-hires.png");let i=s.Uri.joinPath(t.uri,"..");n.webview.options={enableScripts:!0,localResourceRoots:[this.context.extensionUri,i]},n.webview.html=this._getHtmlForWebview(n.webview);let l=r=>{let a=t.getText();try{let p=a.trim()===""?W():JSON.parse(a),u=j(n.webview,t.uri,p);n.webview.postMessage({type:r,data:p,imageUris:u})}catch{}},c=n.webview.onDidReceiveMessage(async r=>{if(r.type==="ready")l("load");else if(r.type==="save"){let a=t.uri.toString();this._pendingSaves.add(a);try{let p=new s.WorkspaceEdit,u=new s.Range(t.positionAt(0),t.positionAt(t.getText().length));p.replace(t.uri,u,JSON.stringify(r.data,null,2)),await s.workspace.applyEdit(p),await t.save()}finally{this._pendingSaves.delete(a)}}else if(r.type==="openLink"){let a=r.link;if(a.type==="url")s.env.openExternal(s.Uri.parse(a.target));else if(a.type==="pdf"){let p=s.Uri.joinPath(s.Uri.joinPath(t.uri,".."),a.target);s.env.openExternal(p)}else if(a.type==="obsidian")s.env.openExternal(s.Uri.parse(a.target));else if(a.type==="code"){let{path:p,startLine:u,endLine:d}=F(a.target);try{let x=s.Uri.joinPath(s.Uri.joinPath(t.uri,".."),p),h=We(s.window.tabGroups.all.map(v=>v.viewColumn),n.viewColumn)??s.ViewColumn.Beside;if(p.toLowerCase().endsWith(".ipynb")){let v=await s.workspace.openNotebookDocument(x),b=await s.window.showNotebookDocument(v,{preview:!1,viewColumn:h});if(u){let A=Math.min(Math.max(0,u-1),v.cellCount-1),I=Math.min(Math.max(A,(d??u)-1),v.cellCount-1),S=new s.NotebookRange(A,I+1);b.selection=S,b.revealRange(S,s.NotebookEditorRevealType.InCenter)}}else{let v=await s.workspace.openTextDocument(x),b=await s.window.showTextDocument(v,{preview:!1,viewColumn:h});if(u){let A=Math.max(0,u-1),I=Math.max(A,(d??u)-1),S=v.lineAt(Math.min(I,v.lineCount-1)).text.length,y=new s.Range(A,0,I,S);b.selection=new s.Selection(y.start,y.end),b.revealRange(y,s.TextEditorRevealType.InCenter)}}}catch{s.window.showErrorMessage(`NodeGraph: couldn't open ${p}`)}}}else if(r.type==="searchInPdf"){let a=s.Uri.joinPath(s.Uri.joinPath(t.uri,".."),r.pdfTarget);Y.openAndSearch(this.context,a,r.query,r.pageHint)}else if(r.type==="exportHtml")try{let a=r.data,p=s.Uri.joinPath(t.uri,".."),u=he.basename(t.uri.fsPath,".nodegraph.json"),d=s.Uri.joinPath(p,`.${u}-imgs`),x={},h=/\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g,v=async T=>{if(!(!T||x[T]))try{let P=s.Uri.joinPath(d,T),U=await s.workspace.fs.readFile(P),g=T.split(".").pop()?.toLowerCase()??"png",C=g==="jpg"||g==="jpeg"?"image/jpeg":g==="gif"?"image/gif":g==="webp"?"image/webp":"image/png";x[T]=`data:${C};base64,${Buffer.from(U).toString("base64")}`}catch{}};for(let T of a.nodes){h.lastIndex=0;let P;for(;(P=h.exec(T.content??""))!==null;)await v(P[1])}let b=ue(p.fsPath),A=b?fe(p.fsPath):"",I=le(a,x,{githubBase:b,repoPrefix:A}),S=s.Uri.joinPath(p,`${u}.html`);await s.workspace.fs.writeFile(S,Buffer.from(I,"utf-8"));let y=await s.window.showInformationMessage(`HTML exported: ${u}.html`,"Open in Browser","Show in Explorer");y==="Open in Browser"?s.env.openExternal(S):y==="Show in Explorer"&&s.commands.executeCommand("revealFileInOS",S)}catch(a){s.window.showErrorMessage(`HTML export failed: ${a}`)}else if(r.type==="saveImage")try{let{filename:a,webviewUri:p}=await oe(n.webview,t.uri,r.data,r.ext??"png");n.webview.postMessage({type:"imageSaved",nodeId:r.nodeId,filename:a,webviewUri:p})}catch(a){s.window.showErrorMessage(`Failed to save image: ${a}`)}else if(r.type==="deleteImageFile")await re(t.uri,r.filename);else if(r.type==="reload")try{let a=await s.workspace.fs.readFile(t.uri),p=Buffer.from(a).toString("utf-8"),u=JSON.parse(p),d=j(n.webview,t.uri,u);n.webview.postMessage({type:"load",data:u,imageUris:d})}catch{l("load")}else if(r.type==="openHelp"){let a=s.Uri.joinPath(this.context.extensionUri,"README.md");s.commands.executeCommand("markdown.showPreviewToSide",a.with({fragment:"features"}))}}),f=s.workspace.onDidChangeTextDocument(r=>{r.document.uri.toString()===t.uri.toString()&&(this._pendingSaves.has(t.uri.toString())||l("externalChange"))});e._activeWebview=n.webview,e._panels.set(t.uri.toString(),n),e._lastActiveUri=t.uri.toString(),e.syncGraphTabContext(),n.onDidChangeViewState(r=>{e.syncGraphTabContext(),r.webviewPanel.active&&(e._activeWebview=n.webview,e._lastActiveUri=t.uri.toString(),n.webview.postMessage({type:"focusCanvas"}))}),n.onDidDispose(()=>{c.dispose(),f.dispose(),e._activeWebview===n.webview&&(e._activeWebview=null),e._panels.get(t.uri.toString())===n&&e._panels.delete(t.uri.toString()),e.syncGraphTabContext()})}_getHtmlForWebview(t){let n=t.asWebviewUri(s.Uri.joinPath(this.context.extensionUri,"dist","webview.js")),o=t.asWebviewUri(s.Uri.joinPath(this.context.extensionUri,"dist","katex","katex.min.css")),i=X();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${t.cspSource} blob: data:; script-src 'nonce-${i}'; style-src 'unsafe-inline' ${t.cspSource}; font-src ${t.cspSource};">
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
    /* No overflow-x here on purpose: making .katex-display a scroll container
       zeroes its min-content contribution, so nothing would ever size the node
       to fit the formula \u2014 the user explicitly wants wide formulas to WIDEN the
       node (NodeCard's katex-width effect), never to scroll inside it. */
    .katex-display { margin: 0.5em 0; }
    .katex-html { white-space: nowrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${i}" src="${n}"></script>
</body>
</html>`}};function We(e,t){let n=t===void 0?-1:e.indexOf(t);return n<0?e.length>1?e[1]:void 0:e[n+1]}var w=M(require("vscode")),ge=M(require("child_process"));function B(e){try{return ge.execSync(e,{timeout:5e3,stdio:["pipe","pipe","pipe"]}).toString().trim()}catch{return""}}function k(e){return B(e)!==""}function Xe(){let e=[],t=new Date().toISOString(),n=process.platform,o=n==="win32"?"Windows":n==="darwin"?"macOS":"Linux",i=process.arch,l=B("python3 --version 2>&1")||B("python --version 2>&1"),c=k("python3 --version 2>&1")?"python3":k("python --version 2>&1")?"python":"",f=c!=="",r=f&&k(`${c} -c "import fitz" 2>&1 && echo ok`),a=r?B(`${c} -c "import fitz; print(fitz.__version__)"`):"",p=f&&k(`${c} -c "import pdfplumber" 2>&1 && echo ok`),u=f&&k(`${c} -c "import pdfminer" 2>&1 && echo ok`),d=f&&k(`${c} -c "from PIL import Image" 2>&1 && echo ok`),x=d?B(`${c} -c "from PIL import __version__; print(__version__)"`):"",h=f&&k(`${c} -c "import cv2" 2>&1 && echo ok`),v=k("pdftotext -v 2>&1 && echo ok")||k("pdftotext --help 2>&1 && echo ok"),b=k("pdftoppm -v 2>&1 && echo ok")||k("pdftoppm -h 2>&1 && echo ok"),A=k("convert --version 2>&1 && echo ok"),I=k("magick --version 2>&1 && echo ok"),S=k("gs --version 2>&1 && echo ok")||k("gswin64c --version 2>&1 && echo ok"),y=T=>T?"\u2705":"\u274C";return e.push("# NodeGraph \u2014 Agent Environment Report"),e.push(""),e.push("> Auto-generated by the NodeGraph extension at activation."),e.push("> **AI agents: read this file to understand what tools are available on this machine.**"),e.push("> Re-generated each time a `.nodegraph.json` file is opened."),e.push(""),e.push(`Generated: \`${t}\``),e.push(""),e.push("---"),e.push(""),e.push("## System"),e.push(""),e.push("| | |"),e.push("|---|---|"),e.push(`| OS | ${o} (\`${n}\`) |`),e.push(`| Architecture | \`${i}\` |`),e.push(`| Python | ${f?`${y(!0)} \`${l}\``:`${y(!1)} not found`} |`),e.push(`| Python command | ${f?`\`${c}\``:"N/A"} |`),e.push(""),e.push("---"),e.push(""),e.push("## PDF Reading Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| PyMuPDF (\`fitz\`) | ${y(r)} | ${r?`v${a} \u2014 recommended`:"Install: `pip install pymupdf`"} |`),e.push(`| pdfplumber | ${y(p)} | ${p?"available":"Install: `pip install pdfplumber`"} |`),e.push(`| pdfminer | ${y(u)} | ${u?"available":"Install: `pip install pdfminer.six`"} |`),e.push(`| poppler (\`pdftotext\`) | ${y(v)} | ${v?"CLI tool available":n==="win32"?"Install: download poppler for Windows":n==="darwin"?"Install: `brew install poppler`":"Install: `apt install poppler-utils`"} |`),e.push(`| poppler (\`pdftoppm\`) | ${y(b)} | ${b?"renders pages to PNG \u2014 the image-extraction path when PyMuPDF is missing":n==="win32"?"Install: download poppler for Windows":n==="darwin"?"Install: `brew install poppler`":"Install: `apt install poppler-utils`"} |`),e.push(`| Ghostscript (\`gs\`) | ${y(S)} | ${S?"available":"optional"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Image Processing Capabilities"),e.push(""),e.push("| Tool | Available | Notes |"),e.push("|------|:---------:|-------|"),e.push(`| Pillow (\`PIL\`) | ${y(d)} | ${d?`v${x} \u2014 recommended`:"Install: `pip install Pillow`"} |`),e.push(`| OpenCV (\`cv2\`) | ${y(h)} | ${h?"available":"Install: `pip install opencv-python`"} |`),e.push(`| ImageMagick (\`convert\`) | ${y(A||I)} | ${A||I?"CLI tool available":n==="win32"?"Install: imagemagick.org":n==="darwin"?"Install: `brew install imagemagick`":"Install: `apt install imagemagick`"} |`),e.push(""),e.push("---"),e.push(""),e.push("## Agent Recommendations"),e.push(""),f||(e.push("> \u26A0\uFE0F **Python not found.** PDF reading and image processing via Python are not available."),e.push("> Install Python from https://python.org, then reopen a `.nodegraph.json` file to re-run this check."),e.push("")),e.push("### Reading a PDF"),r?(e.push("Use PyMuPDF (recommended \u2014 fastest and most accurate):"),e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push('text = "\\n".join(page.get_text() for page in doc)'),e.push("```")):p?(e.push("Use pdfplumber:"),e.push("```python"),e.push("import pdfplumber"),e.push('with pdfplumber.open("paper.pdf") as pdf:'),e.push('    text = "\\n".join(p.extract_text() or "" for p in pdf.pages)'),e.push("```")):v?(e.push("Use poppler CLI:"),e.push("```bash"),e.push("pdftotext paper.pdf -"),e.push("```")):e.push("\u274C No PDF reading tool available. Ask the user to install PyMuPDF: `pip install pymupdf`"),e.push(""),e.push("### Extracting images from a PDF"),r?(e.push("```python"),e.push("import fitz"),e.push('doc = fitz.open("paper.pdf")'),e.push("for i, page in enumerate(doc):"),e.push("    for img in page.get_images():"),e.push("        xref = img[0]"),e.push("        pix = fitz.Pixmap(doc, xref)"),e.push('        pix.save(f"fig_{i}_{xref}.png")'),e.push("```")):b?(e.push("PyMuPDF is not installed, so render the page with poppler and crop the figure out:"),e.push("```bash"),e.push("pdftoppm -png -r 240 -f 5 -l 5 paper.pdf page   # \u2192 page-05.png (page 5 at 240 dpi)"),e.push("```"),d?(e.push("Then crop the figure with Pillow:"),e.push("```python"),e.push("from PIL import Image"),e.push('img = Image.open("page-05.png")'),e.push('img.crop((left, top, right, bottom)).save("fig_01.png")   # pixels at 240 dpi'),e.push("```")):e.push("Pillow is not installed either, so crop with ImageMagick (`magick page-05.png -crop WxH+X+Y fig_01.png`) or save whole pages.")):d?e.push("Pillow can crop images but cannot read a PDF. Install one of: `pip install pymupdf`, or poppler (`apt install poppler-utils` / `brew install poppler`) for `pdftoppm`."):e.push("\u274C No image extraction tool available. Install `pip install pymupdf`, or poppler for `pdftoppm`."),e.push(""),e.push("---"),e.push(""),e.push("*To refresh this report, reopen any `.nodegraph.json` file.*"),e.join(`
`)}async function J(e){let t=w.Uri.joinPath(e,".agent","nodegraph"),n=w.Uri.joinPath(t,"ENVIRONMENT.md");try{return await w.workspace.fs.createDirectory(t),await w.workspace.fs.writeFile(n,Buffer.from(Xe(),"utf-8")),!0}catch{return!1}}async function me(e){if(!(!e||e.length===0))for(let t of e)await J(t.uri)}async function ve(e,t){let n=w.Uri.joinPath(e,".agent","nodegraph","SPEC.md"),o;try{o=await w.workspace.fs.readFile(n)}catch{return!1}let i=w.Uri.joinPath(t,".agent","nodegraph"),l=w.Uri.joinPath(i,"SPEC.md");try{return await w.workspace.fs.createDirectory(i),await w.workspace.fs.writeFile(l,o),!0}catch{return!1}}async function xe(e,t){let n=w.Uri.joinPath(e,".prompt","nodegraph"),o=w.Uri.joinPath(t,".prompt","nodegraph");try{for(let i of["paper","lecture","code"]){let l=w.Uri.joinPath(o,i);await w.workspace.fs.createDirectory(l);for(let c of["korean.md","english.md"]){let f=await w.workspace.fs.readFile(w.Uri.joinPath(n,i,c));await w.workspace.fs.writeFile(w.Uri.joinPath(l,c),f)}}return!0}catch{return!1}}var Ye=[{id:"tomoki1207.pdf",name:"vscode-pdf (PDF Viewer)"}];async function Ue(){for(let e of Ye)if(!m.extensions.getExtension(e.id))try{await m.commands.executeCommand("workbench.extensions.installExtension",e.id)}catch{}}async function be(e){if(e)return e;let t=m.workspace.workspaceFolders??[];return t.length===0?void 0:t.length===1?t[0].uri:(await m.window.showWorkspaceFolderPick({placeHolder:"Select a folder for NodeGraph"}))?.uri}async function Ge(e){let t=await be(e),n=t?m.Uri.joinPath(t,"untitled.nodegraph.json"):void 0,o=await m.window.showSaveDialog({defaultUri:n,filters:{NodeGraph:["nodegraph.json"]},title:"Create New NodeGraph"});if(!o)return;let i=o.fsPath.endsWith(".nodegraph.json")?o:o.with({path:o.path.replace(/(\.nodegraph)?(\.json)?$/,"")+".nodegraph.json"}),l=W();await m.workspace.fs.writeFile(i,Buffer.from(JSON.stringify(l,null,2),"utf-8")),await m.commands.executeCommand("vscode.openWith",i,"nodegraph.editor")}function je(e){e.subscriptions.push(O.register(e)),e.subscriptions.push(m.commands.registerCommand("nodegraph.search",()=>{O.focusActiveAndPost({type:"openSearch"})}),m.commands.registerCommand("nodegraph.fitView",()=>{O.postToActive({type:"fitView"})}),m.commands.registerCommand("nodegraph.collapseAll",()=>{O.postToActive({type:"collapseAll"})}),m.commands.registerCommand("nodegraph.expandAll",()=>{O.postToActive({type:"expandAll"})}),m.commands.registerCommand("nodegraph.new",n=>Ge(n)));let t=()=>O.syncGraphTabContext();t(),e.subscriptions.push(m.window.tabGroups.onDidChangeTabs(t),m.window.tabGroups.onDidChangeTabGroups(t),m.window.onDidChangeActiveTextEditor(t)),me(m.workspace.workspaceFolders??[]),e.subscriptions.push(m.commands.registerCommand("nodegraph.copyAgentSpec",async n=>{let o=await be(n);if(!o){m.window.showWarningMessage("NodeGraph: open or select a folder first \u2014 there is no workspace to copy the spec into.");return}let i=await ve(e.extensionUri,o),l=await J(o),c=await xe(e.extensionUri,o);i&&l&&c?m.window.showInformationMessage(`NodeGraph: wrote .agent/nodegraph/{SPEC,ENVIRONMENT}.md and .prompt/nodegraph/{paper,lecture,code}/{korean,english}.md in ${o.fsPath}.`):m.window.showErrorMessage("NodeGraph: failed to write the agent files \u2014 check that the folder is writable and try again.")})),Ue()}function ze(){}0&&(module.exports={activate,deactivate});
