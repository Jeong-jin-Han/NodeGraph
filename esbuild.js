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

function copyPdfjsAssets() {
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true })
  fs.copyFileSync(
    path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    path.join(__dirname, 'dist/pdf.worker.min.mjs')
  )
  fs.copyFileSync(
    path.join(__dirname, 'src/pdfviewer/pdfviewer.css'),
    path.join(__dirname, 'dist/pdfviewer.css')
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

const pdfViewerConfig = {
  ...common,
  entryPoints: ['src/pdfviewer/main.ts'],
  outfile: 'dist/pdfviewer.js',
  format: 'esm',
  platform: 'browser',
}

async function build() {
  copyKatexAssets()
  copyPdfjsAssets()
  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig)
    const webCtx = await esbuild.context(webviewConfig)
    const pdfCtx = await esbuild.context(pdfViewerConfig)
    await Promise.all([extCtx.watch(), webCtx.watch(), pdfCtx.watch()])
    console.log('Watching...')
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
      esbuild.build(pdfViewerConfig),
    ])
    console.log('Build complete')
  }
}

build().catch((e) => { console.error(e); process.exit(1) })
