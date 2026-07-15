"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode4 = __toESM(require("vscode"));

// src/extension/NodeGraphEditorProvider.ts
var vscode2 = __toESM(require("vscode"));
var path = __toESM(require("path"));

// src/extension/imageManager.ts
var vscode = __toESM(require("vscode"));
function getImgsFolder(documentUri) {
  const documentDir = vscode.Uri.joinPath(documentUri, "..");
  const baseName = documentUri.path.split("/").pop()?.replace(/\.nodegraph\.json$/, "") ?? "graph";
  return vscode.Uri.joinPath(documentDir, `.${baseName}-imgs`);
}
function getImageWebviewUri(webview, documentUri, filename) {
  const imageUri = vscode.Uri.joinPath(getImgsFolder(documentUri), filename);
  return webview.asWebviewUri(imageUri).toString();
}
var INLINE_IMG_RE = /\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;
function computeImageUris(webview, documentUri, graph) {
  const uris = {};
  const add = (fn) => {
    if (fn && !uris[fn])
      uris[fn] = getImageWebviewUri(webview, documentUri, fn);
  };
  for (const node of graph.nodes) {
    INLINE_IMG_RE.lastIndex = 0;
    let m;
    while ((m = INLINE_IMG_RE.exec(node.content ?? "")) !== null)
      add(m[1]);
  }
  for (const ci of graph.canvasImages ?? [])
    add(ci.filename);
  return uris;
}
async function saveImageToAssetsFolder(webview, documentUri, base64Data, ext = "png") {
  const imgsFolder = getImgsFolder(documentUri);
  try {
    await vscode.workspace.fs.createDirectory(imgsFolder);
  } catch {
  }
  const filename = `img_${Date.now()}.${ext}`;
  const imageUri = vscode.Uri.joinPath(imgsFolder, filename);
  await vscode.workspace.fs.writeFile(imageUri, Buffer.from(base64Data, "base64"));
  return { filename, webviewUri: webview.asWebviewUri(imageUri).toString() };
}
async function deleteImageFile(documentUri, filename) {
  const imgUri = vscode.Uri.joinPath(getImgsFolder(documentUri), filename);
  try {
    await vscode.workspace.fs.delete(imgUri);
  } catch {
  }
}

// src/extension/htmlExporter.ts
function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function isHtmlTableLine(line) {
  return /^\s*\|/.test(line) && line.indexOf("|", 1) !== -1;
}
function isHtmlSepLine(line) {
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line) && !/[a-zA-Z0-9]/.test(line);
}
function parseHtmlCells(line) {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((s) => s.trim());
}
function parseHtmlTableBlocks(content) {
  if (!content)
    return [{ type: "text", text: "", startChar: 0, endChar: 0 }];
  const lines = content.split("\n");
  const blocks = [];
  let i = 0;
  let charPos = 0;
  const lineLen = (idx) => lines[idx].length + (idx < lines.length - 1 ? 1 : 0);
  while (i < lines.length) {
    const isStart = isHtmlTableLine(lines[i]) && i + 1 < lines.length && isHtmlSepLine(lines[i + 1]);
    if (isStart) {
      const startChar = charPos;
      const tLines = [];
      while (i < lines.length && isHtmlTableLine(lines[i])) {
        tLines.push(lines[i]);
        charPos += lineLen(i);
        i++;
      }
      if (tLines.length >= 3) {
        blocks.push({ type: "table", headers: parseHtmlCells(tLines[0]), rows: tLines.slice(2).map(parseHtmlCells), startChar, endChar: charPos });
      } else {
        blocks.push({ type: "text", text: tLines.join("\n"), startChar, endChar: charPos });
      }
    } else {
      const startChar = charPos;
      const tLines = [];
      while (i < lines.length) {
        if (isHtmlTableLine(lines[i]) && i + 1 < lines.length && isHtmlSepLine(lines[i + 1]))
          break;
        tLines.push(lines[i]);
        charPos += lineLen(i);
        i++;
      }
      blocks.push({ type: "text", text: tLines.join("\n"), startChar, endChar: charPos });
    }
  }
  return blocks;
}
function hasHtmlTable(content) {
  const lines = content.split("\n");
  for (let i = 0; i + 1 < lines.length; i++) {
    if (isHtmlTableLine(lines[i]) && isHtmlSepLine(lines[i + 1]))
      return true;
  }
  return false;
}
function renderTextSegment(text) {
  return escHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong style="font-size:1.1em">$1</strong>');
}
function renderCellHtml(cellText, imageData) {
  const IMG_RE = /\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g;
  let result = "";
  let lastIdx = 0;
  let match;
  while ((match = IMG_RE.exec(cellText)) !== null) {
    if (match.index > lastIdx)
      result += renderTextSegment(cellText.slice(lastIdx, match.index));
    const filename = match[1];
    const imgW = match[2];
    const imgH = match[3];
    const sizeAttr = imgW && imgH ? ` width="${imgW}" height="${imgH}"` : "";
    const src = imageData[filename];
    result += src ? `<img class="ng-img${sizeAttr ? " ng-img-sized" : ""}" src="${src}"${sizeAttr} alt="${escHtml(filename)}" onclick="showLightbox(this.src)" title="Click to enlarge">` : `<span class="ng-img-missing">${escHtml(filename)}</span>`;
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < cellText.length)
    result += renderTextSegment(cellText.slice(lastIdx));
  return result;
}
function renderTableBlockHtml(block, imageData) {
  const th = block.headers.map((h) => `<th>${renderCellHtml(h, imageData)}</th>`).join("");
  const rows = block.rows.map(
    (row) => `<tr>${row.map((cell) => `<td>${renderCellHtml(cell, imageData)}</td>`).join("")}</tr>`
  ).join("");
  return `<div class="ng-table-wrap"><table class="ng-table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderNodeCard(node, template, offsetX, offsetY, imageData) {
  const color = template?.color ?? "#888";
  const borderRadius = template?.shape === "rounded" ? "22px" : "2px";
  const label = escHtml(template?.label ?? node.template);
  const nx = Math.round(node.position.x + offsetX);
  const ny = Math.round(node.position.y + offsetY);
  let bodyHtml = "";
  const content = node.content ?? "";
  if (hasHtmlTable(content)) {
    const blocks = parseHtmlTableBlocks(content);
    bodyHtml += '<div class="ng-content">';
    for (const block of blocks) {
      if (block.type === "table") {
        bodyHtml += renderTableBlockHtml(block, imageData);
      } else if (block.text) {
        bodyHtml += `<div class="ng-seg">${renderCellHtml(block.text, imageData).replace(/\n/g, "<br>")}</div>`;
      }
    }
    bodyHtml += "</div>";
  } else if (content) {
    bodyHtml += `<div class="ng-content">${renderCellHtml(content, imageData).replace(/\n/g, "<br>")}</div>`;
  }
  if (node.original) {
    const origTitle = escHtml(node.original.title ?? "Original");
    const openAttr = node.originalExpanded ? " open" : "";
    bodyHtml += `<details class="ng-original"${openAttr}><summary>${origTitle}${node.original.location ? ` <span class="ng-loc">${escHtml(node.original.location)}</span>` : ""}</summary>
<div class="ng-orig-text">${escHtml(node.original.text).replace(/\n/g, "<br>")}</div></details>`;
  }
  for (const t of node.toggleItems ?? []) {
    bodyHtml += `<details class="ng-toggle"${t.expanded ? " open" : ""}><summary>${escHtml(t.title || "(untitled)")}</summary>
<div class="ng-toggle-body">${escHtml(t.content).replace(/\n/g, "<br>")}</div></details>`;
  }
  if (node.links.length) {
    bodyHtml += `<div class="ng-links">${node.links.map((l) => {
      const icon = l.type === "url" ? "\u{1F517}" : l.type === "pdf" ? "\u{1F4C4}" : l.type === "obsidian" ? "\u{1F7E3}" : "\u2B21";
      const href = l.type === "url" || l.type === "pdf" ? ` href="${escHtml(l.target)}" target="_blank"` : "";
      return `<a class="ng-link"${href}>${icon} ${escHtml(l.label || l.target)}</a>`;
    }).join("")}</div>`;
  }
  const hasBody = !!bodyHtml;
  const bodyDisplay = node.contentExpanded ? "" : ' style="display:none"';
  const childrenAttr = node.children.length ? ` data-children="${node.children.join(",")}"` : "";
  const hasTableClass = hasHtmlTable(content) ? " ng-has-table" : "";
  const IMG_SIZE_RE = /\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g;
  let maxImgW = 0;
  let _m;
  while ((_m = IMG_SIZE_RE.exec(content)) !== null)
    maxImgW = Math.max(maxImgW, Number(_m[1]));
  const autoMinWidth = maxImgW > 0 ? hasHtmlTable(content) ? maxImgW + 280 : maxImgW + 32 : 0;
  const extraStyle = [
    node.nodeWidth ? `min-width:${node.nodeWidth}px` : autoMinWidth > 432 ? `min-width:${autoMinWidth}px` : "",
    node.nodeHeight && node.contentExpanded ? `min-height:${node.nodeHeight}px` : ""
  ].filter(Boolean).join(";");
  const minHAttr = node.nodeHeight ? ` data-min-h="${node.nodeHeight}"` : "";
  return `<div class="ng-node${hasTableClass}" id="node-${escHtml(node.id)}"${childrenAttr}${minHAttr} style="--color:${color};border-radius:${borderRadius};left:${nx}px;top:${ny}px${extraStyle ? ";" + extraStyle : ""}">
  <div class="ng-header" onclick="onHeaderClick(this)" title="Click to select node">
    <span class="ng-tag" onmousedown="onNodeTagMousedown(event,this.closest('.ng-node'))" style="background:color-mix(in srgb,${color} 22%,transparent);color:${color}">${label}</span>
    ${hasBody ? `<span class="ng-title" onclick="onTitleClick(event,this)" title="Click to fold/unfold">${escHtml(node.title)}</span>` : `<span class="ng-title">${escHtml(node.title)}</span>`}
  </div>
  ${hasBody ? `<div class="ng-body"${bodyDisplay}${node.fontSize ? ` style="font-size:${node.fontSize}px"` : ""}>${bodyHtml}</div>` : ""}
</div>`;
}
function generateHtml(graph, imageData = {}) {
  let minX = Infinity, minY = Infinity;
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
  }
  const offsetX = -minX + 100;
  const offsetY = -minY + 100;
  const nodesHtml = graph.nodes.map((n) => renderNodeCard(n, graph.nodeTemplates[n.template], offsetX, offsetY, imageData)).join("\n");
  const nodesData = JSON.stringify(graph.nodes.map((n) => ({
    id: n.id,
    lx: Math.round(n.position.x + offsetX),
    ly: Math.round(n.position.y + offsetY),
    children: n.children ?? [],
    template: n.template,
    contentExpanded: n.contentExpanded,
    isMain: (graph.nodeTemplates[n.template]?.shape ?? "sharp") === "sharp",
    nodeHeight: n.nodeHeight ?? null,
    naturalY: Math.round((n.nodeNaturalY ?? n.position.y) + offsetY),
    searchText: [n.title, n.content ?? "", n.original?.text ?? ""].join(" ").toLowerCase()
  })));
  const edgeData = JSON.stringify(graph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    label: e.label || ""
  })));
  const source = graph.source ? `${escHtml(graph.source.authors)} \xB7 ${escHtml(graph.source.venue)}` : "";
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
/* \uC120\uD0DD \uB178\uB4DC\uC758 \uD55C \uC138\uB300(\uBD80\uBAA8+\uC790\uC2DD) \uD558\uC774\uB77C\uC774\uD2B8 */
.ng-node.ng-gen{border:2px solid #fcd34d !important;box-shadow:0 0 0 3px rgba(252,211,77,.28),0 1px 4px rgba(0,0,0,.08) !important}
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
          <polygon points="0 0,10 3.5,0 7" fill="#f59e0b"/>
        </marker>
      </defs>
    </svg>
    ${nodesHtml}
  </div>
</div>
<div id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" onclick="event.stopPropagation()" src="" alt="">
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
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
  updateGenHighlight();
  drawEdges();
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

// \uC120\uD0DD \uB178\uB4DC\uC758 \uC774\uC6C3 \uB178\uB4DC\uB4E4\uC5D0 \uB178\uB780 \uD14C\uB450\uB9AC \uC801\uC6A9 (wire \uC0C9\uC740 drawEdges\uC5D0\uC11C \uCC98\uB9AC)
function updateGenHighlight() {
  document.querySelectorAll('.ng-gen').forEach(function(el) { el.classList.remove('ng-gen'); });
  if (!selectedNodeId) return;
  getGenNeighbors(selectedNodeId).forEach(function(id) {
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

    // \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8: source\uAC00 \uC120\uD0DD\uB410\uAC70\uB098 \uD0C0\uAC9F \uC911 \uD558\uB098\uAC00 \uC120\uD0DD\uB410\uC73C\uBA74 \uD2B8\uB801\uD06C(\uACF5\uC6A9 \uAD6C\uAC04)\uB3C4 \uB178\uB780\uC0C9
    var srcSel=srcId===selectedNodeId;
    var groupHl=srcSel||targets.some(function(t){return t.e.target===selectedNodeId;});
    var trunkColor=groupHl?'#f59e0b':'#888', trunkW=groupHl?'2.5':'1.5';

    var g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','ng-eg');
    g.appendChild(svgLine(sr.x+sr.w,srcAnchorY,busX,srcAnchorY,trunkColor,trunkW));
    g.appendChild(svgLine(busX,busMinY,busX,busMaxY,trunkColor,trunkW));
    g.appendChild(svgCirc(sr.x+sr.w,srcAnchorY,4,trunkColor));
    targets.forEach(function(t){
      var tHl=srcSel||t.e.target===selectedNodeId;
      var branchColor=tHl?'#f59e0b':'#888';
      g.appendChild(svgLine(busX,t.r.cy,t.r.x,t.r.cy,branchColor,tHl?'2.5':'1.5'));
      g.appendChild(svgCirc(t.r.x,t.r.cy,4,branchColor));
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
    // \uC138\uB300 \uD558\uC774\uB77C\uC774\uD2B8: \uC120\uD0DD \uB178\uB4DC\uC640 \uC9C1\uC811 \uC5F0\uACB0\uB41C wire\uB294 \uB178\uB780\uC0C9
    var hl=selectedNodeId&&(edge.source===selectedNodeId||edge.target===selectedNodeId);
    var strokeColor=hl?'#f59e0b':'#666';
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
</html>`;
}

// src/extension/NodeGraphEditorProvider.ts
var NodeGraphEditorProvider = class _NodeGraphEditorProvider {
  constructor(context) {
    this.context = context;
    this._pendingSaves = /* @__PURE__ */ new Set();
  }
  static register(context) {
    const provider = new _NodeGraphEditorProvider(context);
    return vscode2.window.registerCustomEditorProvider(
      "nodegraph.editor",
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    );
  }
  static {
    // Track the most recently active webview so extension commands can post messages to it
    this._activeWebview = null;
  }
  static postToActive(message) {
    _NodeGraphEditorProvider._activeWebview?.postMessage(message);
  }
  async resolveCustomTextEditor(document, webviewPanel, _token) {
    const documentDir = vscode2.Uri.joinPath(document.uri, "..");
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, documentDir]
    };
    webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview);
    const sendGraph = (type) => {
      try {
        const data = JSON.parse(document.getText());
        const imageUris = computeImageUris(webviewPanel.webview, document.uri, data);
        webviewPanel.webview.postMessage({ type, data, imageUris });
      } catch {
      }
    };
    const msgDisposable = webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "ready") {
        sendGraph("load");
      } else if (msg.type === "save") {
        const docKey = document.uri.toString();
        this._pendingSaves.add(docKey);
        try {
          const edit = new vscode2.WorkspaceEdit();
          const fullRange = new vscode2.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          edit.replace(document.uri, fullRange, JSON.stringify(msg.data, null, 2));
          await vscode2.workspace.applyEdit(edit);
          await document.save();
        } finally {
          this._pendingSaves.delete(docKey);
        }
      } else if (msg.type === "openLink") {
        const link = msg.link;
        if (link.type === "url") {
          vscode2.env.openExternal(vscode2.Uri.parse(link.target));
        } else if (link.type === "pdf") {
          const pdfUri = vscode2.Uri.joinPath(vscode2.Uri.joinPath(document.uri, ".."), link.target);
          vscode2.env.openExternal(pdfUri);
        } else if (link.type === "obsidian") {
          vscode2.env.openExternal(vscode2.Uri.parse(link.target));
        }
      } else if (msg.type === "exportHtml") {
        try {
          const data = msg.data;
          const docDir = vscode2.Uri.joinPath(document.uri, "..");
          const baseName = path.basename(document.uri.fsPath, ".nodegraph.json");
          const imgsFolder = vscode2.Uri.joinPath(docDir, `.${baseName}-imgs`);
          const imageData = {};
          const INLINE_IMG_RE2 = /\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;
          const loadImg = async (filename) => {
            if (!filename || imageData[filename])
              return;
            try {
              const imgUri = vscode2.Uri.joinPath(imgsFolder, filename);
              const bytes = await vscode2.workspace.fs.readFile(imgUri);
              const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
              const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/png";
              imageData[filename] = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
            } catch {
            }
          };
          for (const node of data.nodes) {
            INLINE_IMG_RE2.lastIndex = 0;
            let m;
            while ((m = INLINE_IMG_RE2.exec(node.content ?? "")) !== null)
              await loadImg(m[1]);
          }
          const htmlContent = generateHtml(data, imageData);
          const outUri = vscode2.Uri.joinPath(docDir, `${baseName}.html`);
          await vscode2.workspace.fs.writeFile(outUri, Buffer.from(htmlContent, "utf-8"));
          const choice = await vscode2.window.showInformationMessage(
            `HTML exported: ${baseName}.html`,
            "Open in Browser",
            "Show in Explorer"
          );
          if (choice === "Open in Browser") {
            vscode2.env.openExternal(outUri);
          } else if (choice === "Show in Explorer") {
            vscode2.commands.executeCommand("revealFileInOS", outUri);
          }
        } catch (err) {
          vscode2.window.showErrorMessage(`HTML export failed: ${err}`);
        }
      } else if (msg.type === "saveImage") {
        try {
          const { filename, webviewUri } = await saveImageToAssetsFolder(
            webviewPanel.webview,
            document.uri,
            msg.data,
            msg.ext ?? "png"
          );
          webviewPanel.webview.postMessage({ type: "imageSaved", nodeId: msg.nodeId, filename, webviewUri });
        } catch (err) {
          vscode2.window.showErrorMessage(`Failed to save image: ${err}`);
        }
      } else if (msg.type === "deleteImageFile") {
        await deleteImageFile(document.uri, msg.filename);
      } else if (msg.type === "reload") {
        try {
          const bytes = await vscode2.workspace.fs.readFile(document.uri);
          const text = Buffer.from(bytes).toString("utf-8");
          const data = JSON.parse(text);
          const imageUris = computeImageUris(webviewPanel.webview, document.uri, data);
          webviewPanel.webview.postMessage({ type: "load", data, imageUris });
        } catch {
          sendGraph("load");
        }
      }
    });
    const changeDisposable = vscode2.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString())
        return;
      if (this._pendingSaves.has(document.uri.toString()))
        return;
      sendGraph("externalChange");
    });
    _NodeGraphEditorProvider._activeWebview = webviewPanel.webview;
    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active)
        _NodeGraphEditorProvider._activeWebview = webviewPanel.webview;
    });
    webviewPanel.onDidDispose(() => {
      msgDisposable.dispose();
      changeDisposable.dispose();
      if (_NodeGraphEditorProvider._activeWebview === webviewPanel.webview) {
        _NodeGraphEditorProvider._activeWebview = null;
      }
    });
  }
  _getHtmlForWebview(webview) {
    const scriptUri = webview.asWebviewUri(
      vscode2.Uri.joinPath(this.context.extensionUri, "dist", "webview.js")
    );
    const katexCssUri = webview.asWebviewUri(
      vscode2.Uri.joinPath(this.context.extensionUri, "dist", "katex", "katex.min.css")
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeGraph</title>
  <link rel="stylesheet" href="${katexCssUri}">
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
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
};
function getNonce() {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

// src/extension/environmentChecker.ts
var vscode3 = __toESM(require("vscode"));
var cp = __toESM(require("child_process"));
function run(cmd) {
  try {
    return cp.execSync(cmd, { timeout: 5e3, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  } catch {
    return "";
  }
}
function check(cmd) {
  return run(cmd) !== "";
}
async function writeEnvironmentReport(workspaceFolders) {
  if (!workspaceFolders || workspaceFolders.length === 0)
    return;
  const lines = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const platform = process.platform;
  const osName = platform === "win32" ? "Windows" : platform === "darwin" ? "macOS" : "Linux";
  const arch = process.arch;
  const py3 = run("python3 --version 2>&1") || run("python --version 2>&1");
  const pyCmd = check("python3 --version 2>&1") ? "python3" : check("python --version 2>&1") ? "python" : "";
  const hasPy = pyCmd !== "";
  const hasFitz = hasPy && check(`${pyCmd} -c "import fitz" 2>&1 && echo ok`);
  const fitzVer = hasFitz ? run(`${pyCmd} -c "import fitz; print(fitz.__version__)"`) : "";
  const hasPlumber = hasPy && check(`${pyCmd} -c "import pdfplumber" 2>&1 && echo ok`);
  const hasPdfminer = hasPy && check(`${pyCmd} -c "import pdfminer" 2>&1 && echo ok`);
  const hasPillow = hasPy && check(`${pyCmd} -c "from PIL import Image" 2>&1 && echo ok`);
  const pillowVer = hasPillow ? run(`${pyCmd} -c "from PIL import __version__; print(__version__)"`) : "";
  const hasCV2 = hasPy && check(`${pyCmd} -c "import cv2" 2>&1 && echo ok`);
  const hasPdftotext = check("pdftotext -v 2>&1 && echo ok") || check("pdftotext --help 2>&1 && echo ok");
  const hasConvert = check("convert --version 2>&1 && echo ok");
  const hasMagick = check("magick --version 2>&1 && echo ok");
  const hasGhostscript = check("gs --version 2>&1 && echo ok") || check("gswin64c --version 2>&1 && echo ok");
  const ok = (v) => v ? "\u2705" : "\u274C";
  lines.push(`# NodeGraph \u2014 Agent Environment Report`);
  lines.push(``);
  lines.push(`> Auto-generated by the NodeGraph extension at activation.`);
  lines.push(`> **AI agents: read this file to understand what tools are available on this machine.**`);
  lines.push(`> Re-generated each time a \`.nodegraph.json\` file is opened.`);
  lines.push(``);
  lines.push(`Generated: \`${now}\``);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## System`);
  lines.push(``);
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| OS | ${osName} (\`${platform}\`) |`);
  lines.push(`| Architecture | \`${arch}\` |`);
  lines.push(`| Python | ${hasPy ? `${ok(true)} \`${py3}\`` : `${ok(false)} not found`} |`);
  lines.push(`| Python command | ${hasPy ? `\`${pyCmd}\`` : "N/A"} |`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## PDF Reading Capabilities`);
  lines.push(``);
  lines.push(`| Tool | Available | Notes |`);
  lines.push(`|------|:---------:|-------|`);
  lines.push(`| PyMuPDF (\`fitz\`) | ${ok(hasFitz)} | ${hasFitz ? `v${fitzVer} \u2014 recommended` : "Install: `pip install pymupdf`"} |`);
  lines.push(`| pdfplumber | ${ok(hasPlumber)} | ${hasPlumber ? "available" : "Install: `pip install pdfplumber`"} |`);
  lines.push(`| pdfminer | ${ok(hasPdfminer)} | ${hasPdfminer ? "available" : "Install: `pip install pdfminer.six`"} |`);
  lines.push(`| poppler (\`pdftotext\`) | ${ok(hasPdftotext)} | ${hasPdftotext ? "CLI tool available" : platform === "win32" ? "Install: download poppler for Windows" : platform === "darwin" ? "Install: `brew install poppler`" : "Install: `apt install poppler-utils`"} |`);
  lines.push(`| Ghostscript (\`gs\`) | ${ok(hasGhostscript)} | ${hasGhostscript ? "available" : "optional"} |`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Image Processing Capabilities`);
  lines.push(``);
  lines.push(`| Tool | Available | Notes |`);
  lines.push(`|------|:---------:|-------|`);
  lines.push(`| Pillow (\`PIL\`) | ${ok(hasPillow)} | ${hasPillow ? `v${pillowVer} \u2014 recommended` : "Install: `pip install Pillow`"} |`);
  lines.push(`| OpenCV (\`cv2\`) | ${ok(hasCV2)} | ${hasCV2 ? "available" : "Install: `pip install opencv-python`"} |`);
  lines.push(`| ImageMagick (\`convert\`) | ${ok(hasConvert || hasMagick)} | ${hasConvert || hasMagick ? "CLI tool available" : platform === "win32" ? "Install: imagemagick.org" : platform === "darwin" ? "Install: `brew install imagemagick`" : "Install: `apt install imagemagick`"} |`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Agent Recommendations`);
  lines.push(``);
  if (!hasPy) {
    lines.push(`> \u26A0\uFE0F **Python not found.** PDF reading and image processing via Python are not available.`);
    lines.push(`> Install Python from https://python.org, then reopen a \`.nodegraph.json\` file to re-run this check.`);
    lines.push(``);
  }
  lines.push(`### Reading a PDF`);
  if (hasFitz) {
    lines.push(`Use PyMuPDF (recommended \u2014 fastest and most accurate):`);
    lines.push(`\`\`\`python`);
    lines.push(`import fitz`);
    lines.push(`doc = fitz.open("paper.pdf")`);
    lines.push(`text = "\\n".join(page.get_text() for page in doc)`);
    lines.push(`\`\`\``);
  } else if (hasPlumber) {
    lines.push(`Use pdfplumber:`);
    lines.push(`\`\`\`python`);
    lines.push(`import pdfplumber`);
    lines.push(`with pdfplumber.open("paper.pdf") as pdf:`);
    lines.push(`    text = "\\n".join(p.extract_text() or "" for p in pdf.pages)`);
    lines.push(`\`\`\``);
  } else if (hasPdftotext) {
    lines.push(`Use poppler CLI:`);
    lines.push(`\`\`\`bash`);
    lines.push(`pdftotext paper.pdf -`);
    lines.push(`\`\`\``);
  } else {
    lines.push(`\u274C No PDF reading tool available. Ask the user to install PyMuPDF: \`pip install pymupdf\``);
  }
  lines.push(``);
  lines.push(`### Extracting images from a PDF`);
  if (hasFitz) {
    lines.push(`\`\`\`python`);
    lines.push(`import fitz`);
    lines.push(`doc = fitz.open("paper.pdf")`);
    lines.push(`for i, page in enumerate(doc):`);
    lines.push(`    for img in page.get_images():`);
    lines.push(`        xref = img[0]`);
    lines.push(`        pix = fitz.Pixmap(doc, xref)`);
    lines.push(`        pix.save(f"fig_{i}_{xref}.png")`);
    lines.push(`\`\`\``);
  } else if (hasPillow) {
    lines.push(`Pillow is available but cannot extract from PDF directly. Use PyMuPDF for extraction.`);
  } else {
    lines.push(`\u274C No image extraction tool available.`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*To refresh this report, reopen any \`.nodegraph.json\` file.*`);
  const report = lines.join("\n");
  for (const folder of workspaceFolders) {
    const agentDir = vscode3.Uri.joinPath(folder.uri, ".agent");
    const outFile = vscode3.Uri.joinPath(agentDir, "ENVIRONMENT.md");
    try {
      await vscode3.workspace.fs.createDirectory(agentDir);
      await vscode3.workspace.fs.writeFile(outFile, Buffer.from(report, "utf-8"));
    } catch {
    }
  }
}

// src/extension/extension.ts
var RECOMMENDED_EXTENSIONS = [
  { id: "tomoki1207.pdf", name: "vscode-pdf (PDF Viewer)" }
];
async function installRecommendedExtensions() {
  for (const ext of RECOMMENDED_EXTENSIONS) {
    if (!vscode4.extensions.getExtension(ext.id)) {
      try {
        await vscode4.commands.executeCommand("workbench.extensions.installExtension", ext.id);
      } catch {
      }
    }
  }
}
function activate(context) {
  context.subscriptions.push(
    NodeGraphEditorProvider.register(context)
  );
  context.subscriptions.push(
    vscode4.commands.registerCommand("nodegraph.search", () => {
      NodeGraphEditorProvider.postToActive({ type: "openSearch" });
    })
  );
  writeEnvironmentReport(vscode4.workspace.workspaceFolders ?? []);
  installRecommendedExtensions();
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
