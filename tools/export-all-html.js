#!/usr/bin/env node
// Regenerate .html next to every *.nodegraph.json found under a root directory,
// by running the extension's own htmlExporter.ts (bundled on the fly with esbuild).
// Usage: node tools/export-all-html.js [rootDir]

const fs = require('fs');
const path = require('path');
const os = require('os');
const esbuild = require('esbuild');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_ROOT = '/media/hanjeongjin/T7/Workspace/Obsidian/2026_CAMEL';
const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;

function bundleHtmlExporter() {
  const outfile = path.join(os.tmpdir(), 'nodegraph-htmlExporter.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(PROJECT_ROOT, 'src/extension/htmlExporter.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
  });
  delete require.cache[require.resolve(outfile)];
  return require(outfile).generateHtml;
}

const INLINE_IMG_RE = /\[\[IMG:([^:\]]+)(?::[^\]]+)?\]\]/g;

// Mirrors NodeGraphEditorProvider.ts's exportHtml handler: read every image an
// [[IMG:filename]] token references from `.<baseName>-imgs/` and inline it as base64,
// so batch exports match what "Export HTML" produces inside the extension itself.
function buildImageData(graph, jsonPath) {
  const baseName = path.basename(jsonPath, '.nodegraph.json');
  const imgsFolder = path.join(path.dirname(jsonPath), `.${baseName}-imgs`);
  const imageData = {};
  const loadImg = (filename) => {
    if (!filename || imageData[filename]) return;
    try {
      const bytes = fs.readFileSync(path.join(imgsFolder, filename));
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : 'image/png';
      imageData[filename] = `data:${mime};base64,${bytes.toString('base64')}`;
    } catch {
      // image file not found — leave unresolved, same as the extension's behavior
    }
  };
  for (const node of graph.nodes || []) {
    INLINE_IMG_RE.lastIndex = 0;
    let m;
    while ((m = INLINE_IMG_RE.exec(node.content || '')) !== null) loadImg(m[1]);
  }
  return imageData;
}

function findNodegraphFiles(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findNodegraphFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.nodegraph.json')) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(rootDir)) {
    console.error(`Root directory not found: ${rootDir}`);
    process.exit(1);
  }
  const generateHtml = bundleHtmlExporter();
  const files = findNodegraphFiles(rootDir);
  if (files.length === 0) {
    console.log(`No *.nodegraph.json files found under ${rootDir}`);
    return;
  }
  console.log(`Found ${files.length} nodegraph file(s) under ${rootDir}\n`);
  let okCount = 0;
  for (const jsonPath of files) {
    try {
      const graph = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const html = generateHtml(graph, buildImageData(graph, jsonPath));
      const htmlPath = jsonPath.replace(/\.nodegraph\.json$/, '.html');
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`OK   ${(html.length / 1024).toFixed(1).padStart(7)}KB  ${htmlPath}`);
      okCount++;
    } catch (err) {
      console.error(`FAIL           ${jsonPath}\n     ${err.message}`);
    }
  }
  console.log(`\n${okCount}/${files.length} exported.`);
}

main();
