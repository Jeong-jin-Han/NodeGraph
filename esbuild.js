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

async function build() {
  copyKatexAssets()
  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig)
    const webCtx = await esbuild.context(webviewConfig)
    await Promise.all([extCtx.watch(), webCtx.watch()])
    console.log('Watching...')
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ])
    console.log('Build complete')
  }
}

build().catch((e) => { console.error(e); process.exit(1) })
