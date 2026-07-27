// Matches a node's `original.text` quote against a PDF page's extracted text.
// Verified against real papers (demo/1706.03762v7.pdf): exact substring
// match after normalization succeeds ~45% of the time (PDF text extraction and
// `original.text` diverge on hyphenation, subscripts, and light paraphrasing);
// a word-overlap fuzzy match on top recovers most of the rest.

export interface PageWordMap {
  words: string[]
  wordToItem: number[] // words[i] came from item wordToItem[i]
}

export function normalizeText(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/-\s+/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

function toWords(s: string): string[] {
  return s.replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean)
}

export function buildPageWordMap(items: Array<{ str: string }>): PageWordMap {
  const words: string[] = []
  const wordToItem: number[] = []
  items.forEach((item, itemIndex) => {
    for (const w of toWords(normalizeText(item.str))) {
      words.push(w)
      wordToItem.push(itemIndex)
    }
  })
  return { words, wordToItem }
}

export interface MatchResult {
  method: 'exact' | 'fuzzy'
  score: number
  itemIndices: number[]
}

const FUZZY_THRESHOLD = 0.55

// Finds the query text inside a page. Tries an exact substring match first,
// falls back to a best-window word-overlap match (handles paraphrase/hyphenation drift).
export function findInPage(pageMap: PageWordMap, query: string): MatchResult | null {
  const chunks = query.split('...').map(normalizeText).filter(c => c.length > 15)
  if (chunks.length === 0) return null

  const pageText = pageMap.words.join(' ')
  for (const chunk of chunks) {
    const idx = pageText.indexOf(chunk)
    if (idx === -1) continue
    // map character offset back to a word range
    const before = pageText.slice(0, idx).split(' ').filter(Boolean).length
    const wordCount = chunk.split(' ').filter(Boolean).length
    const itemIndices = uniqueItemsInRange(pageMap, before, before + wordCount)
    if (itemIndices.length > 0) return { method: 'exact', score: 1, itemIndices }
  }

  // 각 후보 윈도우는 삽입/의역 여백을 감안해 목표 단어 수보다 ~30% 넉넉하게 잡는데,
  // 예전엔 그 여백 안에 실제로 안 맞은 단어(다른 문단/섹션 헤더 등)까지 통째로
  // 하이라이트해버리는 버그가 있었음(예: "6 Results"/"6.1 Machine Translation" 같은
  // 헤더가 인용구보다 훨씬 앞쪽에서 우연히 한 단어("translation")만 겹쳐도, 넉넉한
  // 윈도우가 그 지점부터 시작해서 진짜 인용구까지 쭉 이어붙여 스코어가 동점이 되면
  // 먼저 발견된(더 앞쪽의, 더 헐렁한) 윈도우가 그대로 채택됐었음). 이제 (1) 실제로
  // 겹친 단어들의 첫/마지막 위치로 범위를 좁혀서 안 겹친 여백은 하이라이트하지 않고,
  // (2) 스코어가 동점이면 그 실제 겹침 범위가 더 좁은(더 촘촘한, 즉 진짜일 확률이
  // 높은) 윈도우를 우선하도록 함.
  let best: (MatchResult & { spanLen: number }) | null = null
  for (const chunk of chunks) {
    const targetWords = toWords(chunk)
    if (targetWords.length === 0) continue
    const targetSet = new Set(targetWords)
    const minWindow = Math.max(3, Math.floor(targetWords.length * 0.5))
    for (let i = 0; i <= pageMap.words.length - minWindow; i++) {
      const winLen = Math.min(targetWords.length + Math.ceil(targetWords.length * 0.3), pageMap.words.length - i)
      const seen = new Set<string>()
      let overlap = 0
      let firstMatch = -1
      let lastMatch = -1
      for (let j = i; j < i + winLen; j++) {
        const w = pageMap.words[j]
        if (targetSet.has(w) && !seen.has(w)) {
          overlap++
          seen.add(w)
          if (firstMatch === -1) firstMatch = j
          lastMatch = j
        }
      }
      if (overlap === 0) continue
      const score = overlap / targetSet.size
      const spanLen = lastMatch - firstMatch + 1
      const better = !best || score > best.score || (score === best.score && spanLen < best.spanLen)
      if (better) {
        const itemIndices = uniqueItemsInRange(pageMap, firstMatch, lastMatch + 1)
        best = { method: 'fuzzy', score, itemIndices, spanLen }
      }
    }
  }
  if (best && best.score >= FUZZY_THRESHOLD) return { method: best.method, score: best.score, itemIndices: best.itemIndices }
  return null
}

// Ctrl+F 스타일 검색용: findInPage와 달리 (1) 최소 길이 제한이 없고(짧은 단어도 검색
// 가능), (2) 첫 매치가 아니라 페이지 안의 모든 매치를 반환(다음/이전 탐색·개수 표시용).
// 인용구 매칭과 달리 fuzzy fallback은 쓰지 않음 — 사용자가 직접 타이핑한 검색어는
// 정확히 일치하는 것만 찾는 게 맞음(일반 PDF 뷰어의 Ctrl+F와 동일한 기대치).
export function findAllInPage(pageMap: PageWordMap, query: string): MatchResult[] {
  const q = toWords(normalizeText(query)).join(' ')
  if (!q) return []
  const pageText = pageMap.words.join(' ')
  const results: MatchResult[] = []
  let searchFrom = 0
  while (searchFrom <= pageText.length) {
    const idx = pageText.indexOf(q, searchFrom)
    if (idx === -1) break
    const before = pageText.slice(0, idx).split(' ').filter(Boolean).length
    const wordCount = q.split(' ').filter(Boolean).length
    const itemIndices = uniqueItemsInRange(pageMap, before, before + wordCount)
    if (itemIndices.length > 0) results.push({ method: 'exact', score: 1, itemIndices })
    searchFrom = idx + Math.max(1, q.length)
  }
  return results
}

function uniqueItemsInRange(pageMap: PageWordMap, startWord: number, endWord: number): number[] {
  const set = new Set<number>()
  for (let i = Math.max(0, startWord); i < Math.min(pageMap.wordToItem.length, endWord); i++) {
    set.add(pageMap.wordToItem[i])
  }
  return [...set].sort((a, b) => a - b)
}
