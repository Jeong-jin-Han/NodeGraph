// Bridges the extension host <-> the official pdf.js reference viewer (vendored in
// vendor/web/, same generic build tomoki1207.pdf embeds, version-matched to our own
// pdfjs-dist dependency). We don't touch viewer.mjs itself — everything here drives it
// through its own public surface (window.PDFViewerApplication / *Options / eventBus),
// the same integration points pdf.js documents for third-party embedders.
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { buildPageWordMap, findInPage } from './textMatch'

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void }
declare global {
  interface Window {
    __PDF_WORKER_URI__?: string
    // pdf.mjs (loaded via its own <script> tag) sets this; viewer.mjs itself reads
    // GlobalWorkerOptions/PDFWorker/getDocument off of it rather than a static ES
    // import, since viewer.mjs treats the core as an external dependency.
    pdfjsLib?: { GlobalWorkerOptions: { workerPort: Worker | null } }
    PDFViewerApplication: {
      initializedPromise: Promise<void>
      pdfDocument: {
        numPages: number
        getPage(n: number): Promise<{ getTextContent(opts?: { disableNormalization?: boolean }): Promise<{ items: TextItem[] }> }>
      } | null
      eventBus: {
        on(name: string, listener: (e?: unknown) => void, opts?: { once?: boolean }): void
        dispatch(name: string, data: unknown): void
      }
      open(args: { data: Uint8Array }): Promise<void>
      page: number
    }
    PDFViewerApplicationOptions: { set(name: string, value: unknown): void }
  }
}

const vscode = acquireVsCodeApi()
const WORKER_LOAD_TIMEOUT_MS = 15000
const NEIGHBOR_PAGE_SEARCH_RADIUS = 3

// The generic viewer auto-opens its bundled sample PDF on startup: run() reads
// AppOptions "defaultUrl" (default "compressed.tracemonkey-pldi-09.pdf") and calls
// open(url) with it. That open happens BEFORE our 'load' message arrives, so no
// workerPort is set yet and pdf.js falls back to its default workerSrc
// ("../build/pdf.worker.mjs" — the unminified name we never ship), producing the
// "Setting up fake worker failed ... pdf.worker.mjs" startup error. Clearing
// defaultUrl synchronously here (bridge.mjs runs right after viewer.mjs's sync
// startup, while run() is still awaiting its async initialize()) disables that
// auto-open entirely; the only open() is then ours, which supplies the workerPort.
window.PDFViewerApplicationOptions.set('defaultUrl', '')

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
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

// pdf.js's own worker bootstrap (PDFWorker._initialize in pdf.mjs) refuses to trust a
// `workerSrc` unless `_isSameOrigin(window.location.href, workerSrc)` passes — and that
// check hard-fails (`base.origin === "null"`) whenever the page's own origin is opaque,
// which a VS Code webview's document location is. That sends it down a "CDN wrapper"
// fallback that dynamically import()s the *default* (unminified, never-copied)
// "../build/pdf.worker.mjs" path, regardless of any workerSrc override, and always 404s
// here — confirmed empirically (F5 test), not just from reading the source.
//
// Passing a `workerPort` instead sidesteps _initialize()/_isSameOrigin entirely:
// PDFWorker.fromPort() goes straight to _initializeFromPort(port), no origin check at
// all. So we construct the Worker ourselves — a same-origin `new Worker(blobUrl)` from
// our own fetched copy of the script, exactly like the old custom viewer's workaround —
// and hand pdf.js the live Worker instance instead of a src string for it to construct
// its own (unchecked) Worker from.
let workerPromise: Promise<Worker> | null = null
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const uri = window.__PDF_WORKER_URI__
      if (!uri) throw new Error('__PDF_WORKER_URI__ was not injected into the page')
      const res = await fetch(uri)
      if (!res.ok) throw new Error(`Failed to fetch pdf.worker script: HTTP ${res.status}`)
      const source = await res.text()
      const blob = new Blob([source], { type: 'text/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      return new Worker(blobUrl, { type: 'module' })
    })()
  }
  return workerPromise
}

function showFatalError(context: string, err: unknown): void {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err)
  console.error(context, err)
  document.title = `[error] ${context}`
  const pre = document.createElement('pre')
  pre.style.cssText = 'position:fixed;inset:0;margin:0;padding:16px;background:#1e1e1e;color:#ff8080;white-space:pre-wrap;overflow:auto;z-index:99999;font-family:monospace;'
  pre.textContent = `[${context}] ${message}`
  document.body.appendChild(pre)
}

window.addEventListener('error', (e) => showFatalError('window.onerror', e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => showFatalError('unhandledrejection', e.reason))

let opened = false

async function ensureOpen(base64: string): Promise<void> {
  if (opened) return
  opened = true
  const app = window.PDFViewerApplication
  const worker = await withTimeout(getWorker(), WORKER_LOAD_TIMEOUT_MS, 'Fetching pdf.worker script')
  window.PDFViewerApplicationOptions.set('workerPort', worker)
  // Belt-and-suspenders: open()'s own Object.assign(GlobalWorkerOptions, AppOptions.getAll(...))
  // *should* propagate the line above, but set it directly too — same object, no
  // dependency on that internal step actually running the way we expect.
  if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerPort = worker
  await app.initializedPromise
  const documentLoaded = new Promise<void>((resolve) => app.eventBus.on('documentloaded', () => resolve(), { once: true }))
  await withTimeout(app.open({ data: base64ToBytes(base64) }), WORKER_LOAD_TIMEOUT_MS, 'Opening PDF')
  await withTimeout(documentLoaded, WORKER_LOAD_TIMEOUT_MS, 'Waiting for documentloaded')
}

// Our own quote text (`original.text`) frequently doesn't appear verbatim in the PDF's
// extracted text (hyphenation/paraphrase drift — see textMatch.ts) so the official find
// controller's plain substring search can't be handed the quote directly; it would just
// fail on the ~55% of quotes that don't match exactly. Instead we run our existing
// fuzzy word-overlap matcher ourselves to resolve which page + which exact run of text
// the quote corresponds to, then hand the official find controller that *exact* substring
// (pulled verbatim from the page's own extracted text, so it's guaranteed to
// substring-match) — this gets us robust quote resolution AND pixel-perfect,
// official TextHighlighter-based highlighting, instead of picking one or the other.
//
// The reconstruction must mirror how PDFFindController builds each page's searchable
// text: item strs concatenated with NO separator, plus "\n" after items flagged hasEOL
// (see #extractText in the viewer source). Items routinely split mid-word, so joining
// with spaces produces a string that never occurs in the page text and every find
// comes back "Phrase not found" — the exact no-highlight failure seen in testing.
async function resolveQuote(query: string, pageHint?: number): Promise<{ pageNum: number; text: string } | null> {
  const doc = window.PDFViewerApplication.pdfDocument
  if (!doc) return null

  const order: number[] = []
  if (pageHint && pageHint >= 1 && pageHint <= doc.numPages) {
    order.push(pageHint)
    for (let d = 1; d <= NEIGHBOR_PAGE_SEARCH_RADIUS; d++) {
      if (pageHint - d >= 1) order.push(pageHint - d)
      if (pageHint + d <= doc.numPages) order.push(pageHint + d)
    }
  } else {
    for (let p = 1; p <= doc.numPages; p++) order.push(p)
  }

  for (const pageNum of order) {
    const page = await doc.getPage(pageNum)
    // disableNormalization mirrors the find controller's own #extractText — it
    // searches RAW item strs, so the query must be reconstructed from the same
    // raw form or ligature/unicode differences break the substring guarantee.
    const textContent = await page.getTextContent({ disableNormalization: true })
    const items = textContent.items as TextItem[]
    const wordMap = buildPageWordMap(items)
    const result = findInPage(wordMap, query)
    if (result && result.itemIndices.length > 0) {
      const first = result.itemIndices[0]
      const last = result.itemIndices[result.itemIndices.length - 1]
      let text = ''
      for (let i = first; i <= last; i++) {
        const item = items[i]
        if (!item) continue
        text += item.str
        if (item.hasEOL && i < last) text += '\n'
      }
      // A span ending at a hyphenated line break leaves a trailing "-" whose "\n"
      // we just dropped. The find controller's normalize() collapses "-\n" pairs
      // out of the page text entirely ("re-\n"+"lieves" → "relieves"), so a bare
      // boundary "-" (or stray boundary whitespace) can never match — strip it.
      // This was exactly the failing case: a quote whose matched span ended with
      // "It re-" found no match while every non-hyphen-boundary quote worked.
      text = text.replace(/[-\s]+$/, '').replace(/^[-\s]+/, '')
      if (text) return { pageNum, text }
    }
  }
  return null
}

// The find controller scrolls its selected match to a hardcoded near-top position
// (MATCH_SCROLL_OFFSET_TOP = -50 in viewer.mjs) — not configurable. To center the
// quote instead, wait for the selected-match span (".highlight.selected", added when
// the page's text layer renders its matches) and re-center it ourselves. The poll
// also naturally waits out lazy page rendering; a fresh search invalidates any
// pending recenter from the previous one via the generation token.
let recenterGeneration = 0
function recenterSelectedMatch(): void {
  const myGen = ++recenterGeneration
  const startedAt = Date.now()
  // The previous search's selected span can still be in the DOM for a moment after
  // the new find dispatch (highlights only reset when updatetextlayermatches fires),
  // so don't recenter onto it — wait for a different node. If the new search selects
  // the exact same span again (same quote re-clicked), the 600ms grace lets it through.
  const stale = document.querySelector('.textLayer .highlight.selected')
  const poll = () => {
    if (myGen !== recenterGeneration) return
    const el = document.querySelector('.textLayer .highlight.selected')
    if (el && (el !== stale || Date.now() - startedAt > 600)) {
      // Small delay so pdf.js's own scrollMatchIntoView (same render tick the
      // element appears in) runs first and doesn't override the recenter.
      setTimeout(() => {
        if (myGen !== recenterGeneration) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }, 150)
      return
    }
    if (Date.now() - startedAt < 5000) setTimeout(poll, 100)
  }
  poll()
}

async function searchAndJump(query: string, pageHint?: number): Promise<void> {
  const app = window.PDFViewerApplication
  const resolved = await resolveQuote(query, pageHint)
  if (resolved) {
    // Land on the resolved page first — the find below then only has to scroll
    // within it, and even a find miss still leaves the user in the right place.
    app.page = resolved.pageNum
    app.eventBus.dispatch('find', {
      source: window,
      type: '',
      query: resolved.text,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
      matchDiacritics: false,
    })
    recenterSelectedMatch()
    return
  }
  // No text match anywhere searched — still land on the hinted page.
  if (pageHint) app.page = pageHint
}

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data
  if (msg.type === 'load') {
    ensureOpen(msg.pdfData)
      .then(() => { if (msg.query) return searchAndJump(msg.query, msg.pageHint) })
      .catch((err) => showFatalError('loadPdf', err))
  } else if (msg.type === 'search') {
    // 'search' is only ever sent to a panel that already received 'load' (see
    // PdfViewerPanel.ts), but ensureOpen() may still be mid-flight (worker fetch,
    // app.open() awaiting) — if so, silently no-op rather than pass along undefined
    // pdfData, same graceful "not ready yet" handling the old viewer had.
    if (!opened) return
    searchAndJump(msg.query, msg.pageHint).catch((err) => showFatalError('search', err))
  }
})

vscode.postMessage({ type: 'ready' })
