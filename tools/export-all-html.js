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
      const html = generateHtml(graph, {});
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
