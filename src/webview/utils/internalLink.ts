// `internal` 링크 — 그래프 안의 다른 노드, 또는 옆 그래프 파일의 노드를 가리킨다.
//
// 두 가지 형태를 받는다:
//   "node_017"                          같은 그래프의 노드
//   "other.nodegraph.json#node_017"     같은 폴더에 있는 다른 그래프의 노드
//
// 파일 경로는 다른 링크 타입과 똑같이 **그 json이 있는 디렉터리 기준**이다. 두 그래프를
// 같은 폴더에 나란히 두면 `code`/`pdf` 링크와 이미지 폴더가 전부 그대로 동작한다.
// (워크플로 그래프에서 파일별 그래프의 노드로 거는 것이 이 링크의 주된 쓰임이다.)

export interface ParsedInternalLink {
  /** 다른 파일이면 그 상대경로, 같은 그래프면 null */
  file: string | null
  nodeId: string
}

export function parseInternalTarget(target: string): ParsedInternalLink | null {
  const raw = (target ?? '').trim()
  if (!raw) return null
  const hash = raw.indexOf('#')
  if (hash === -1) return { file: null, nodeId: raw }
  const file = raw.slice(0, hash).trim()
  const nodeId = raw.slice(hash + 1).trim()
  if (!nodeId) return null
  return { file: file === '' ? null : file, nodeId }
}
