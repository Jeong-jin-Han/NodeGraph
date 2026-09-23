// 노드 번호 — `node_017` 같은 id의 숫자 부분을 그대로 쓴다. 별도 필드를 두지 않는
// 이유는 두 가지다: id가 이미 파일 안에서 유일하고, 에이전트가 "17번 노드를 추가했다"
// 라고만 말해도 사용자가 Ctrl+F 번호 모드로 바로 찾아갈 수 있어야 하기 때문.

/** `node_017` → 17. 숫자를 못 찾으면 null. */
export function nodeNumber(id: string): number | null {
  const m = /(\d+)\s*$/.exec(id)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isNaN(n) ? null : n
}

/** 노드 헤더에 찍히는 라벨. 번호가 없는 id(타임스탬프 등)면 null. */
export function formatNodeNumber(id: string): string | null {
  const n = nodeNumber(id)
  return n === null ? null : `#${n}`
}

/**
 * 번호 모드 검색어를 술어로 바꾼다. `17`, `17 19`, `17,19`, `17-20`과 그 조합을 받는다.
 * 쓸 수 있는 토큰이 하나도 없으면 null을 돌려준다 — 호출부가 "전부 매치"가 아니라
 * "0 results"를 보여줄 수 있게 하기 위함.
 */
export function parseNumberQuery(q: string): ((n: number) => boolean) | null {
  const ranges: Array<[number, number]> = []
  for (const t of q.split(/[\s,]+/).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(t)
    if (range) {
      const a = parseInt(range[1], 10)
      const b = parseInt(range[2], 10)
      ranges.push(a <= b ? [a, b] : [b, a])
      continue
    }
    if (/^\d+$/.test(t)) {
      const v = parseInt(t, 10)
      ranges.push([v, v])
    }
  }
  if (ranges.length === 0) return null
  return (n: number) => ranges.some(([a, b]) => n >= a && n <= b)
}
