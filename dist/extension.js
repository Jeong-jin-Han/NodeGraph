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
    for (const img of node.images)
      add(img.filename);
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
function renderCellHtml(cellText, imageData) {
  const IMG_RE = /\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g;
  let result = "";
  let lastIdx = 0;
  let match;
  while ((match = IMG_RE.exec(cellText)) !== null) {
    if (match.index > lastIdx)
      result += escHtml(cellText.slice(lastIdx, match.index));
    const filename = match[1];
    const imgW = match[2];
    const imgH = match[3];
    const sizeAttr = imgW && imgH ? ` width="${imgW}" height="${imgH}"` : "";
    const src = imageData[filename];
    result += src ? `<img class="ng-img${sizeAttr ? " ng-img-sized" : ""}" src="${src}"${sizeAttr} alt="${escHtml(filename)}" onclick="showLightbox(this.src)" title="\uD074\uB9AD\uD558\uC5EC \uD655\uB300">` : `<span class="ng-img-missing">${escHtml(filename)}</span>`;
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < cellText.length)
    result += escHtml(cellText.slice(lastIdx));
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
  const inlineImgs = node.images.filter((img) => img.position !== void 0).sort((a, b) => a.position - b.position);
  const bottomImgs = node.images.filter((img) => img.position === void 0);
  const renderImg = (img) => {
    const src = imageData[img.filename];
    if (!src)
      return `<div class="ng-img-missing">${escHtml(img.filename)}</div>`;
    return `<img class="ng-img" src="${src}" alt="${escHtml(img.caption || img.filename)}" onclick="showLightbox(this.src)" title="\uD074\uB9AD\uD558\uC5EC \uD655\uB300">`;
  };
  let bodyHtml = "";
  const content = node.content ?? "";
  if (hasHtmlTable(content)) {
    const blocks = parseHtmlTableBlocks(content);
    bodyHtml += '<div class="ng-content">';
    for (const block of blocks) {
      if (block.type === "table") {
        bodyHtml += renderTableBlockHtml(block, imageData);
      } else {
        const blockImgs = inlineImgs.filter(
          (img) => img.position >= block.startChar && img.position < block.endChar
        );
        if (blockImgs.length > 0) {
          const segs = [];
          let last = block.startChar;
          for (const img of blockImgs) {
            segs.push(block.text.slice(last - block.startChar, img.position - block.startChar));
            last = img.position;
          }
          segs.push(block.text.slice(last - block.startChar));
          for (let k = 0; k < segs.length; k++) {
            if (segs[k])
              bodyHtml += `<div class="ng-seg">${renderCellHtml(segs[k], imageData).replace(/\n/g, "<br>")}</div>`;
            if (k < blockImgs.length)
              bodyHtml += `<div class="ng-img-wrap">${renderImg(blockImgs[k])}</div>`;
          }
        } else if (block.text) {
          bodyHtml += `<div class="ng-seg">${renderCellHtml(block.text, imageData).replace(/\n/g, "<br>")}</div>`;
        }
      }
    }
    bodyHtml += "</div>";
  } else if (inlineImgs.length > 0) {
    const segments = [];
    let lastPos = 0;
    for (const img of inlineImgs) {
      const pos = Math.min(img.position, content.length);
      segments.push(content.slice(lastPos, pos));
      lastPos = pos;
    }
    segments.push(content.slice(lastPos));
    bodyHtml += '<div class="ng-content">';
    for (let k = 0; k < segments.length; k++) {
      if (segments[k])
        bodyHtml += `<div class="ng-seg">${renderCellHtml(segments[k], imageData).replace(/\n/g, "<br>")}</div>`;
      if (k < inlineImgs.length)
        bodyHtml += `<div class="ng-img-wrap">${renderImg(inlineImgs[k])}</div>`;
    }
    bodyHtml += "</div>";
  } else if (content) {
    bodyHtml += `<div class="ng-content">${renderCellHtml(content, imageData).replace(/\n/g, "<br>")}</div>`;
  }
  if (bottomImgs.length) {
    bodyHtml += `<div class="ng-images">${bottomImgs.map(renderImg).join("")}</div>`;
  }
  if (node.original) {
    const origTitle = escHtml(node.original.title ?? "Original");
    const openAttr = node.originalExpanded ? " open" : "";
    bodyHtml += `<details class="ng-original"${openAttr}><summary>${origTitle}${node.original.location ? ` <span class="ng-loc">${escHtml(node.original.location)}</span>` : ""}</summary>
<div class="ng-orig-text">${escHtml(node.original.text).replace(/\n/g, "<br>")}</div></details>`;
  }
  for (const t of node.toggleItems ?? []) {
    bodyHtml += `<details class="ng-toggle"${t.expanded ? " open" : ""}><summary>${escHtml(t.title || "(\uC81C\uBAA9 \uC5C6\uC74C)")}</summary>
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
    node.nodeWidth ? `min-width:${node.nodeWidth}px` : autoMinWidth > 220 ? `min-width:${autoMinWidth}px` : "",
    node.nodeHeight ? `min-height:${node.nodeHeight}px` : ""
  ].filter(Boolean).join(";");
  return `<div class="ng-node${hasTableClass}" id="node-${escHtml(node.id)}"${childrenAttr} style="--color:${color};border-radius:${borderRadius};left:${nx}px;top:${ny}px${extraStyle ? ";" + extraStyle : ""}">
  <div class="ng-header" onclick="onHeaderClick(this)" onmousedown="onNodeHeaderMousedown(event,this.parentNode)" title="\uD074\uB9AD: \uB178\uB4DC \uC120\uD0DD">
    <span class="ng-tag" style="background:color-mix(in srgb,${color} 22%,transparent);color:${color}">${label}</span>
    <span class="ng-title">${escHtml(node.title)}</span>
    ${hasBody ? `<span class="ng-chevron" onclick="toggleFold(event,this.closest('.ng-header'))" title="\uC774 \uB178\uB4DC\uB9CC \uC811\uAE30/\uD3BC\uCE58\uAE30">${node.contentExpanded ? "\u25B2" : "\u25BC"}</span>` : ""}
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
    naturalY: Math.round((n.nodeNaturalY ?? n.position.y) + offsetY)
  })));
  const edgeData = JSON.stringify(graph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    label: e.label || ""
  })));
  const source = graph.source ? `${escHtml(graph.source.authors)} \xB7 ${escHtml(graph.source.venue)}` : "";
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
#toolbar{position:fixed;top:0;left:0;right:0;height:38px;background:#ffffff;border-bottom:1px solid #d4d4d4;display:flex;align-items:center;gap:8px;padding:0 12px;z-index:200;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#tb-title{font-weight:600;color:#1a1a1a;margin-right:4px;flex-shrink:0}
#tb-source{opacity:.5;font-size:11px;flex-shrink:0;color:#555}
#tb-sel{opacity:.7;font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0066cc}
button{background:#fff;color:#1a1a1a;border:1px solid #c0c0c0;border-radius:3px;padding:3px 10px;font-size:11px;cursor:pointer;flex-shrink:0}
button:hover{background:#e8e8e8;border-color:#aaa}
.tb-sep{width:1px;height:16px;background:#d4d4d4;flex-shrink:0}
#viewport{position:fixed;top:38px;left:0;right:0;bottom:0;overflow:hidden;cursor:grab}
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
  <span id="tb-title">${escHtml(graph.title)}</span>
  <span id="tb-source">${source}</span>
  <div class="tb-sep"></div>
  <button onclick="fitView()">Fit View</button>
  <div class="tb-sep"></div>
  <button onclick="doExpand()" title="\uC120\uD0DD \uB178\uB4DC+\uD558\uC704 \uD3BC\uCE58\uAE30 (\uC120\uD0DD \uC5C6\uC73C\uBA74 \uC804\uCCB4)">\uD3BC\uCE58\uAE30\u2193</button>
  <button onclick="doCollapse()" title="\uC120\uD0DD \uB178\uB4DC+\uD558\uC704 \uC811\uAE30 (\uC120\uD0DD \uC5C6\uC73C\uBA74 \uC804\uCCB4)">\uC811\uAE30\u2191</button>
  <div class="tb-sep"></div>
  <span id="tb-sel" style="opacity:.35">\uD074\uB9AD\uC73C\uB85C \uB178\uB4DC \uC120\uD0DD</span>
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
  <span id="lightbox-close" onclick="closeLightbox()">\u2715</span>
</div>
<script>
var NODES_DATA = ${nodesData};
var EDGES = ${edgeData};
var HEADER_H = 36;

var vp = document.getElementById('viewport');
var canvas = document.getElementById('canvas');
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
  var sorted = NODES_DATA.slice().sort(function(a, b) { return a.ly - b.ly; });
  var renderY = {};
  sorted.forEach(function(n) {
    var nIsMain = n.isMain;
    var y = n.ly;
    var nEl = document.getElementById('node-' + n.id);
    var nW = nEl ? nEl.offsetWidth : 300;
    sorted.forEach(function(other) {
      if (other.id === n.id) return;
      if (other.ly >= n.ly) return;
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
          // Rounded \u2192 main: only if pushed/expanded AND not own descendant
          if (isDescendantOf(other.id, n.id)) return;
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
  recomputePositions();
  drawEdges();
  fitView();
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
            for (const img of node.images)
              await loadImg(img.filename);
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
      }
    });
    const changeDisposable = vscode2.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString())
        return;
      if (this._pendingSaves.has(document.uri.toString()))
        return;
      sendGraph("externalChange");
    });
    webviewPanel.onDidDispose(() => {
      msgDisposable.dispose();
      changeDisposable.dispose();
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

// src/extension/extension.ts
function activate(context) {
  context.subscriptions.push(
    NodeGraphEditorProvider.register(context)
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
