import * as pdfjsLib from 'pdfjs-dist'
import { TextLayer } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { buildPageWordMap, findInPage, PageWordMap } from './textMatch'

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void }
declare global {
  interface Window {
    __PDF_WORKER_URI__?: string
  }
}

const vscode = acquireVsCodeApi()

const RENDER_SCALE = 1.4
const WORKER_LOAD_TIMEOUT_MS = 15000
const NEIGHBOR_PAGE_SEARCH_RADIUS = 3

interface PageEntry {
  wordMap: PageWordMap
  textDivs: HTMLElement[]
  pageEl: HTMLDivElement
}

const pagesContainer = document.getElementById('pages') as HTMLDivElement
const statusEl = document.getElementById('status') as HTMLDivElement
let pageEntries: PageEntry[] = []
let lastHighlighted: HTMLElement[] = []

function showStatus(text: string): void {
  statusEl.textContent = text
  statusEl.style.display = 'block'
}

function showError(context: string, err: unknown): void {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err)
  statusEl.textContent = `[${context}] ${message}`
  statusEl.style.display = 'block'
  statusEl.style.color = '#ff8080'
  statusEl.style.whiteSpace = 'pre-wrap'
  console.error(context, err)
}

window.addEventListener('error', (e) => showError('window.onerror', e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => showError('unhandledrejection', e.reason))

// pdf.js compares `window.location`'s origin against `workerSrc`'s origin to decide
// whether it can spawn the worker directly; a webview's own page origin never matches
// the `webview.asWebviewUri(...)` origin of the bundled worker file, so pdf.js falls
// back to a cross-origin "CDN wrapper" (a blob worker that dynamically `import()`s the
// real worker) — that fallback silently hangs forever under this extension's CSP
// instead of erroring. Fetching the worker script ourselves and handing pdf.js a
// same-origin `blob:` URL for it sidesteps that fallback path entirely.
let workerBlobUrlPromise: Promise<string> | null = null
function getWorkerBlobUrl(): Promise<string> {
  if (!workerBlobUrlPromise) {
    workerBlobUrlPromise = (async () => {
      const uri = window.__PDF_WORKER_URI__
      if (!uri) throw new Error('__PDF_WORKER_URI__ was not injected into the page')
      const res = await fetch(uri)
      if (!res.ok) throw new Error(`Failed to fetch pdf.worker script: HTTP ${res.status}`)
      const source = await res.text()
      const blob = new Blob([source], { type: 'text/javascript' })
      return URL.createObjectURL(blob)
    })()
  }
  return workerBlobUrlPromise
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function clearHighlight(): void {
  for (const el of lastHighlighted) el.classList.remove('match-highlight')
  lastHighlighted = []
}

async function loadPdf(base64: string): Promise<void> {
  showStatus('Preparing PDF worker…')
  pdfjsLib.GlobalWorkerOptions.workerSrc = await withTimeout(
    getWorkerBlobUrl(), WORKER_LOAD_TIMEOUT_MS, 'Fetching pdf.worker script'
  )

  showStatus('Loading PDF…')
  const pdfDoc = await withTimeout(
    pdfjsLib.getDocument({ data: base64ToBytes(base64) }).promise,
    WORKER_LOAD_TIMEOUT_MS,
    'PDF worker initialization'
  )
  pageEntries = []
  pagesContainer.innerHTML = ''

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    showStatus(`Rendering page ${pageNum}/${pdfDoc.numPages}…`)
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: RENDER_SCALE })

    const pageEl = document.createElement('div')
    pageEl.className = 'pdf-page'
    pageEl.style.cssText = `position:relative; width:${viewport.width}px; height:${viewport.height}px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.4); margin-bottom:12px;`
    pageEl.style.setProperty('--total-scale-factor', String(viewport.scale))
    pageEl.style.setProperty('--scale-round-x', '1px')
    pageEl.style.setProperty('--scale-round-y', '1px')
    pagesContainer.appendChild(pageEl)

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.cssText = 'position:absolute; inset:0;'
    pageEl.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise

    const textLayerDiv = document.createElement('div')
    textLayerDiv.className = 'textLayer'
    pageEl.appendChild(textLayerDiv)

    const textContent = await page.getTextContent()
    const textLayer = new TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport })
    await textLayer.render()

    const wordMap = buildPageWordMap(textContent.items as TextItem[])
    pageEntries.push({ wordMap, textDivs: textLayer.textDivs, pageEl })
  }

  statusEl.style.display = 'none'
}

function searchAndJump(query: string, pageHint?: number): void {
  clearHighlight()
  if (pageEntries.length === 0) return

  const order: number[] = []
  if (pageHint && pageHint >= 1 && pageHint <= pageEntries.length) {
    order.push(pageHint - 1)
    for (let d = 1; d <= NEIGHBOR_PAGE_SEARCH_RADIUS; d++) {
      if (pageHint - 1 - d >= 0) order.push(pageHint - 1 - d)
      if (pageHint - 1 + d < pageEntries.length) order.push(pageHint - 1 + d)
    }
  } else {
    for (let i = 0; i < pageEntries.length; i++) order.push(i)
  }

  for (const pageIdx of order) {
    const entry = pageEntries[pageIdx]
    const result = findInPage(entry.wordMap, query)
    if (result) {
      const els = result.itemIndices.map(i => entry.textDivs[i]).filter((el): el is HTMLElement => !!el)
      for (const el of els) el.classList.add('match-highlight')
      lastHighlighted = els
      const target = els[0] ?? entry.pageEl
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
  }

  // No text match anywhere searched — still land on the hinted page.
  if (pageHint && pageEntries[pageHint - 1]) {
    pageEntries[pageHint - 1].pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data
  if (msg.type === 'load') {
    loadPdf(msg.pdfData)
      .then(() => { if (msg.query) searchAndJump(msg.query, msg.pageHint) })
      .catch((err) => showError('loadPdf', err))
  } else if (msg.type === 'search') {
    searchAndJump(msg.query, msg.pageHint)
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') clearHighlight()
})

vscode.postMessage({ type: 'ready' })
