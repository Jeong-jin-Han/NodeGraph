// Matches a node's `original.text` quote against a PDF page's extracted text.
// Verified against real papers (test-demo-v2/1706.03762v7.pdf): exact substring
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

  let best: MatchResult | null = null
  for (const chunk of chunks) {
    const targetWords = toWords(chunk)
    if (targetWords.length === 0) continue
    const targetSet = new Set(targetWords)
    const minWindow = Math.max(3, Math.floor(targetWords.length * 0.5))
    for (let i = 0; i <= pageMap.words.length - minWindow; i++) {
      const winLen = Math.min(targetWords.length + Math.ceil(targetWords.length * 0.3), pageMap.words.length - i)
      const seen = new Set<string>()
      let overlap = 0
      for (let j = i; j < i + winLen; j++) {
        const w = pageMap.words[j]
        if (targetSet.has(w) && !seen.has(w)) { overlap++; seen.add(w) }
      }
      const score = overlap / targetSet.size
      if (!best || score > best.score) {
        const itemIndices = uniqueItemsInRange(pageMap, i, i + winLen)
        best = { method: 'fuzzy', score, itemIndices }
      }
    }
  }
  if (best && best.score >= FUZZY_THRESHOLD) return best
  return null
}

function uniqueItemsInRange(pageMap: PageWordMap, startWord: number, endWord: number): number[] {
  const set = new Set<number>()
  for (let i = Math.max(0, startWord); i < Math.min(pageMap.wordToItem.length, endWord); i++) {
    set.add(pageMap.wordToItem[i])
  }
  return [...set].sort((a, b) => a - b)
}
