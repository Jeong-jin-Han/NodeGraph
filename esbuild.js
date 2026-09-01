const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')
const isWatch = process.argv.includes('--watch')
const isProd = process.argv.includes('--production')

function copyKatexAssets() {
  const src = path.join(__dirname, 'node_modules/katex/dist')
  const dst = path.join(__dirname, 'dist/katex')
  fs.mkdirSync(path.join(dst, 'fonts'), { recursive: true })
  fs.copyFileSync(path.join(src, 'katex.min.css'), path.join(dst, 'katex.min.css'))
  for (const f of fs.readdirSync(path.join(src, 'fonts'))) {
    fs.copyFileSync(path.join(src, 'fonts', f), path.join(dst, 'fonts', f))
  }
}

// The PDF viewer webview loads Mozilla's official pdf.js "generic build" reference
// viewer (vendored in src/pdfviewer/vendor/web/, same one tomoki1207.pdf/Firefox embed)
// instead of a hand-rolled UI, so highlighting/find/zoom/etc. are pdf.js's own
// battle-tested TextHighlighter — see bridge.ts for how we drive it. viewer.html expects
// its core (pdf.mjs) at a sibling ../build/ folder, so that layout is preserved here;
// pdf.mjs/pdf.worker.min.mjs come straight from our own pdfjs-dist dependency (not a
// second vendored copy) so there's exactly one pdf.js core version in this extension.
function copyPdfjsAssets() {
  const viewerWebDir = path.join(__dirname, 'dist/pdfjs-viewer/web')
  const viewerBuildDir = path.join(__dirname, 'dist/pdfjs-viewer/build')
  fs.mkdirSync(viewerWebDir, { recursive: true })
  fs.mkdirSync(viewerBuildDir, { recursive: true })

  const vendorWebDir = path.join(__dirname, 'src/pdfviewer/vendor/web')
  for (const f of ['viewer.html', 'viewer.mjs', 'viewer.css']) {
    fs.copyFileSync(path.join(vendorWebDir, f), path.join(viewerWebDir, f))
  }
  const imagesDst = path.join(viewerWebDir, 'images')
  fs.mkdirSync(imagesDst, { recursive: true })
  for (const f of fs.readdirSync(path.join(vendorWebDir, 'images'))) {
    fs.copyFileSync(path.join(vendorWebDir, 'images', f), path.join(imagesDst, f))
  }

  fs.copyFileSync(
    path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.mjs'),
    path.join(viewerBuildDir, 'pdf.mjs')
  )
  fs.copyFileSync(
    path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    path.join(viewerBuildDir, 'pdf.worker.min.mjs')
  )
}

const common = {
  bundle: true,
  minify: isProd,
  sourcemap: !isProd,
}

const extensionConfig = {
  ...common,
  entryPoints: ['src/extension/extension.ts'],
  outfile: 'dist/extension.js',
  format: 'cjs',
  platform: 'node',
  external: ['vscode'],
}

const webviewConfig = {
  ...common,
  entryPoints: ['src/webview/index.tsx'],
  outfile: 'dist/webview.js',
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
}

const pdfBridgeConfig = {
  ...common,
  entryPoints: ['src/pdfviewer/bridge.ts'],
  outfile: 'dist/pdfjs-viewer/web/bridge.mjs',
  format: 'esm',
  platform: 'browser',
}

async function build() {
  copyKatexAssets()
  copyPdfjsAssets()
  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig)
    const webCtx = await esbuild.context(webviewConfig)
    const pdfCtx = await esbuild.context(pdfBridgeConfig)
    await Promise.all([extCtx.watch(), webCtx.watch(), pdfCtx.watch()])
    console.log('Watching...')
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
      esbuild.build(pdfBridgeConfig),
    ])
    console.log('Build complete')
  }
}

build().catch((e) => { console.error(e); process.exit(1) })
