import * as pdfjsLib from 'pdfjs-dist'
import { TextLayer } from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { buildPageWordMap, findInPage, findAllInPage, PageWordMap } from './textMatch'

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void }
declare global {
  interface Window {
    __PDF_WORKER_URI__?: string
  }
}

const vscode = acquireVsCodeApi()

const DEFAULT_SCALE = 1.4
const MIN_SCALE = 0.5
const MAX_SCALE = 4
const ZOOM_STEP = 1.15
const WORKER_LOAD_TIMEOUT_MS = 15000
const NEIGHBOR_PAGE_SEARCH_RADIUS = 3
const FIND_DEBOUNCE_MS = 150

interface PageEntry {
  wordMap: PageWordMap
  textDivs: HTMLElement[]
  pageEl: HTMLDivElement
}

interface FindMatch {
  pageIdx: number
  itemIndices: number[]
}

const pagesContainer = document.getElementById('pages') as HTMLDivElement
const pagesScroll = document.getElementById('pagesScroll') as HTMLDivElement
const statusEl = document.getElementById('status') as HTMLDivElement
const loadingLabel = document.getElementById('loadingLabel') as HTMLSpanElement
const zoomOutBtn = document.getElementById('zoomOutBtn') as HTMLButtonElement
const zoomInBtn = document.getElementById('zoomInBtn') as HTMLButtonElement
const zoomLabel = document.getElementById('zoomLabel') as HTMLSpanElement
const findToggleBtn = document.getElementById('findToggleBtn') as HTMLButtonElement
const findBar = document.getElementById('findBar') as HTMLDivElement
const findInput = document.getElementById('findInput') as HTMLInputElement
const findCount = document.getElementById('findCount') as HTMLSpanElement
const findPrevBtn = document.getElementById('findPrevBtn') as HTMLButtonElement
const findNextBtn = document.getElementById('findNextBtn') as HTMLButtonElement
const findCloseBtn = document.getElementById('findCloseBtn') as HTMLButtonElement

let pdfDoc: PDFDocumentProxy | null = null
let pageEntries: PageEntry[] = []
let lastHighlighted: HTMLElement[] = []
let zoomScale = DEFAULT_SCALE

// 인용구 점프(quote-jump)와 Ctrl+F 검색이 재줌(re-render) 후에도 하이라이트를 이어갈 수
// 있도록, 마지막으로 실행한 검색을 기억해뒀다가 renderAllPages() 직후 재적용한다.
let lastQuoteSearch: { query: string; pageHint?: number } | null = null

let findMatches: FindMatch[] = []
let findIndex = -1
let findDebounceTimer: number | null = null

function showLoading(text: string): void {
  loadingLabel.textContent = text
  loadingLabel.style.display = 'inline'
}

function hideLoading(): void {
  loadingLabel.style.display = 'none'
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

function clearFindHighlight(): void {
  for (const entry of pageEntries) {
    for (const el of entry.textDivs) el.classList.remove('find-highlight', 'find-highlight-active')
  }
}

async function loadPdf(base64: string): Promise<void> {
  showLoading('Preparing PDF worker…')
  pdfjsLib.GlobalWorkerOptions.workerSrc = await withTimeout(
    getWorkerBlobUrl(), WORKER_LOAD_TIMEOUT_MS, 'Fetching pdf.worker script'
  )

  showLoading('Loading PDF…')
  pdfDoc = await withTimeout(
    pdfjsLib.getDocument({ data: base64ToBytes(base64) }).promise,
    WORKER_LOAD_TIMEOUT_MS,
    'PDF worker initialization'
  )
  await renderAllPages()
}

// 초기 로드와 줌 변경(재렌더) 양쪽에서 공유하는 렌더 루프. 매번 캔버스/텍스트 레이어를
// 새로 만들기 때문에 이전 하이라이트는 자동으로 사라짐 — 호출부에서 필요하면
// lastQuoteSearch/findMatches를 이용해 재적용한다.
//
// +/- 를 빠르게 연달아 누르면 이전 renderAllPages() 호출이 아직 페이지를 렌더링하는
// 도중에 새 호출이 시작될 수 있다 — pageEntries/pagesContainer가 module-level 공유
// 상태라서, 가드 없이 두 호출이 동시에 진행되면 서로의 결과가 뒤섞여(중복 textDiv,
// 잘못된 wordMap 등) 검색 매치 개수가 실제보다 부풀려지는 등 오작동함(헤드리스 테스트로
// 실제 재현: 줌 조작 직후 검색하면 매치 개수가 배로 나옴). 세대(generation) 카운터로
// "내가 아직 최신 호출인가"를 매 await 지점마다 확인해서, 낡은 호출은 DOM을 더 이상
// 건드리지 않고 조용히 중단하도록 함(최신 호출만 결과를 반영 — "last wins").
interface PendingPage {
  pageNum: number
  page: PDFPageProxy
  viewport: PageViewport
  pageEl: HTMLDivElement
}

function makePageEl(viewport: PageViewport): HTMLDivElement {
  const pageEl = document.createElement('div')
  pageEl.className = 'pdf-page'
  pageEl.style.cssText = `position:relative; width:${viewport.width}px; height:${viewport.height}px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.4); margin-bottom:12px;`
  pageEl.style.setProperty('--total-scale-factor', String(viewport.scale))
  pageEl.style.setProperty('--scale-round-x', '1px')
  pageEl.style.setProperty('--scale-round-y', '1px')
  return pageEl
}

// 줌 재렌더 도중 스크롤이 첫 페이지로 튀어 보이는 "깜빡임" 버그(사용자 리포트: 확대/축소를
// 하면 현재 페이지 -> 첫 페이지 -> 현재 페이지로 눈에 보이게 튐) 수정. 기존에는 컨테이너를
// 통째로 비운 뒤 페이지를 하나씩 순차 렌더링+추가했기 때문에, 전체 페이지가 다 그려지기
// 전까지는 스크롤 높이가 실제보다 작아서(이미 그려진 페이지 수만큼만) 스크롤 복원이 계속
// 어긋났음. 이제 2단계로 나눔: (1) 모든 페이지의 최종 크기와 동일한 빈 placeholder를 먼저
// 한꺼번에 만들어 붙여서 스크롤 높이를 즉시 최종값으로 맞추고, 그 직후 스크롤 위치를
// 복원한다(아직 비어있는 placeholder라 화면엔 회색 페이지만 보이고 페이지 점프는 없음).
// (2) 그다음 각 placeholder에 실제 캔버스/텍스트 레이어 내용을 채워 넣는다 — 이 단계는
// 크기를 바꾸지 않으므로 스크롤 위치가 다시 흔들리지 않는다.
let renderGeneration = 0
async function renderAllPages(scrollToMatch = true, anchor: ScrollAnchor | null = null): Promise<void> {
  if (!pdfDoc) return
  const myGen = ++renderGeneration
  pagesContainer.innerHTML = ''
  updateZoomLabel()
  showLoading('Loading PDF…')

  // Pass 1: placeholders for every page, sized to their final dimensions.
  const pending: PendingPage[] = []
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    if (myGen !== renderGeneration) return // superseded by a newer render
    const page = await pdfDoc.getPage(pageNum)
    if (myGen !== renderGeneration) return
    const viewport = page.getViewport({ scale: zoomScale })
    const pageEl = makePageEl(viewport)
    pagesContainer.appendChild(pageEl)
    pending.push({ pageNum, page, viewport, pageEl })
  }
  if (myGen !== renderGeneration) return

  // Scroll height is now final — safe to restore the pre-zoom position before
  // any pixel of actual content is drawn, so the user never sees page 1.
  if (anchor) restoreScrollAnchor(anchor, pending.map(p => p.pageEl))

  // Pass 2: fill each placeholder with its canvas + text layer.
  const localEntries: PageEntry[] = []
  for (const { pageNum, page, viewport, pageEl } of pending) {
    if (myGen !== renderGeneration) return
    showLoading(`Rendering page ${pageNum}/${pdfDoc.numPages}…`)

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.cssText = 'position:absolute; inset:0;'
    pageEl.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    if (myGen !== renderGeneration) return

    const textLayerDiv = document.createElement('div')
    textLayerDiv.className = 'textLayer'
    pageEl.appendChild(textLayerDiv)

    const textContent = await page.getTextContent()
    if (myGen !== renderGeneration) return
    const textLayer = new TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport })
    await textLayer.render()
    if (myGen !== renderGeneration) return

    const wordMap = buildPageWordMap(textContent.items as TextItem[])
    localEntries.push({ wordMap, textDivs: textLayer.textDivs, pageEl })
  }

  if (myGen !== renderGeneration) return
  pageEntries = localEntries
  hideLoading()

  // 재줌 뒤에도 검색 결과/하이라이트를 그대로 이어감(단, 줌은 scrollToMatch=false로
  // 불러서 하이라이트만 다시 칠하고 스크롤은 위에서 이미 복원한 위치를 유지)
  if (findMatches.length > 0 || findInput.value.trim()) {
    runFind(findInput.value, findIndex, scrollToMatch)
  } else if (lastQuoteSearch) {
    searchAndJump(lastQuoteSearch.query, lastQuoteSearch.pageHint, false, scrollToMatch)
  }
}

function updateZoomLabel(): void {
  zoomLabel.textContent = `${Math.round(zoomScale * 100)}%`
  zoomOutBtn.disabled = zoomScale <= MIN_SCALE + 0.001
  zoomInBtn.disabled = zoomScale >= MAX_SCALE - 0.001
}

// 줌 변경은 renderAllPages()로 모든 페이지를 다시 그리는데, 그때 컨테이너를 통째로
// 비우기 때문에 스크롤 위치가 유실되어 항상 첫 페이지로 튕겨 돌아가는 버그가 있었음
// (사용자 리포트). 줌 전에 "몇 번째 페이지의 몇 %쯤 보고 있었는지"를 기록해뒀다가,
// 재렌더(치수가 바뀐) 뒤 그 페이지의 같은 비율 위치로 스크롤을 복원한다.
interface ScrollAnchor { pageIdx: number; frac: number }
function captureScrollAnchor(): ScrollAnchor | null {
  if (pageEntries.length === 0) return null
  const scrollTop = pagesScroll.scrollTop
  for (let i = 0; i < pageEntries.length; i++) {
    const el = pageEntries[i].pageEl
    const top = el.offsetTop
    const height = el.offsetHeight
    if (scrollTop < top + height) {
      return { pageIdx: i, frac: Math.max(0, (scrollTop - top) / height) }
    }
  }
  return { pageIdx: pageEntries.length - 1, frac: 0 }
}
function restoreScrollAnchor(anchor: ScrollAnchor | null, pageEls: HTMLElement[]): void {
  if (!anchor) return
  const el = pageEls[anchor.pageIdx]
  if (!el) return
  pagesScroll.scrollTop = el.offsetTop + anchor.frac * el.offsetHeight
}

async function setZoom(newScale: number): Promise<void> {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale))
  if (Math.abs(clamped - zoomScale) < 0.001) return
  const anchor = captureScrollAnchor()
  zoomScale = clamped
  await renderAllPages(false, anchor)
}

zoomInBtn.addEventListener('click', () => setZoom(zoomScale * ZOOM_STEP))
zoomOutBtn.addEventListener('click', () => setZoom(zoomScale / ZOOM_STEP))

function searchAndJump(query: string, pageHint?: number, remember = true, scroll = true): void {
  clearHighlight()
  if (remember) lastQuoteSearch = { query, pageHint }
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
      if (scroll) {
        const target = els[0] ?? entry.pageEl
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
  }

  // No text match anywhere searched — still land on the hinted page.
  if (scroll && pageHint && pageEntries[pageHint - 1]) {
    pageEntries[pageHint - 1].pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ── Ctrl+F / 돋보기 검색 ──────────────────────────────────────────────
function openFindBar(): void {
  findBar.style.display = 'flex'
  findInput.focus()
  findInput.select()
}

function closeFindBar(): void {
  findBar.style.display = 'none'
  clearFindHighlight()
  findMatches = []
  findIndex = -1
  findCount.textContent = ''
}

function runFind(query: string, preferIndex = 0, scroll = true): void {
  clearFindHighlight()
  const q = query.trim()
  if (!q) {
    findMatches = []
    findIndex = -1
    findCount.textContent = ''
    updateFindNavButtons()
    return
  }
  const matches: FindMatch[] = []
  for (let pageIdx = 0; pageIdx < pageEntries.length; pageIdx++) {
    const results = findAllInPage(pageEntries[pageIdx].wordMap, q)
    for (const r of results) matches.push({ pageIdx, itemIndices: r.itemIndices })
  }
  findMatches = matches
  findIndex = matches.length === 0 ? -1 : Math.min(preferIndex, matches.length - 1)
  updateFindNavButtons()
  gotoFindMatch(findIndex, scroll)
}

function updateFindNavButtons(): void {
  const has = findMatches.length > 0
  findCount.textContent = has ? `${findIndex + 1} of ${findMatches.length}` : (findInput.value.trim() ? '0 of 0' : '')
  findPrevBtn.disabled = !has
  findNextBtn.disabled = !has
}

function gotoFindMatch(index: number, scroll = true): void {
  clearFindHighlight()
  if (index < 0 || index >= findMatches.length) return
  findIndex = index
  const match = findMatches[index]
  const entry = pageEntries[match.pageIdx]
  if (!entry) return
  const els = match.itemIndices.map(i => entry.textDivs[i]).filter((el): el is HTMLElement => !!el)
  for (const el of els) el.classList.add('find-highlight-active')
  // 같은 검색어의 다른 매치들도 옅은 주황으로 같이 표시(현재 위치만 진하게)
  for (let i = 0; i < findMatches.length; i++) {
    if (i === index) continue
    const m = findMatches[i]
    const e = pageEntries[m.pageIdx]
    if (!e) continue
    for (const idx of m.itemIndices) e.textDivs[idx]?.classList.add('find-highlight')
  }
  updateFindNavButtons()
  if (scroll) (els[0] ?? entry.pageEl).scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function findNext(): void {
  if (findMatches.length === 0) return
  gotoFindMatch((findIndex + 1) % findMatches.length)
}
function findPrev(): void {
  if (findMatches.length === 0) return
  gotoFindMatch((findIndex - 1 + findMatches.length) % findMatches.length)
}

findToggleBtn.addEventListener('click', () => {
  if (findBar.style.display === 'flex') closeFindBar()
  else openFindBar()
})
findCloseBtn.addEventListener('click', closeFindBar)
findPrevBtn.addEventListener('click', findPrev)
findNextBtn.addEventListener('click', findNext)
findInput.addEventListener('input', () => {
  if (findDebounceTimer !== null) window.clearTimeout(findDebounceTimer)
  findDebounceTimer = window.setTimeout(() => runFind(findInput.value, 0), FIND_DEBOUNCE_MS)
})
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) findPrev(); else findNext() }
  else if (e.key === 'Escape') { e.preventDefault(); closeFindBar() }
})

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data
  if (msg.type === 'load') {
    loadPdf(msg.pdfData)
      .then(() => { if (msg.query) searchAndJump(msg.query, msg.pageHint) })
      .catch((err) => showError('loadPdf', err))
  } else if (msg.type === 'search') {
    if (findBar.style.display === 'flex') closeFindBar()
    searchAndJump(msg.query, msg.pageHint)
  }
})

window.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    openFindBar()
    return
  }
  if (e.key === '=' && mod) { e.preventDefault(); setZoom(zoomScale * ZOOM_STEP); return }
  if (e.key === '-' && mod) { e.preventDefault(); setZoom(zoomScale / ZOOM_STEP); return }
  if (e.key === 'Escape') {
    if (findBar.style.display === 'flex') closeFindBar()
    else clearHighlight()
  }
})

vscode.postMessage({ type: 'ready' })
