// 계층 접기 — "이 노드 아래를 숨긴다".
//
// 지금까지 Collapse는 노드의 본문만 접었을 뿐 자손 노드는 그대로 화면에 남아 있었다
// (`childrenExpanded`는 스키마에만 있고 렌더러가 무시했다). 여기서 다루는 것은 그것과
// 다른 축이다: 접힌 노드의 **자손 노드 자체가 화면에서 사라진다**.
//
// 상태는 `collapsed`(자손을 숨기고 있는 노드들의 집합) 하나뿐이고, 어떤 노드가 보이는지는
// "조상 중에 collapsed가 있는가"로만 정해진다. 상태를 하나로 두면 펼치기/접기의 네 가지
// 범위가 전부 이 집합에 대한 연산이 되고, 되돌리기도 이전 집합을 스택에 쌓기만 하면 된다.
//
// 이 상태는 파일에 저장하지 않는다(세션 한정) — 기존 그래프는 전부 `childrenExpanded:false`라
// 파일의 값을 그대로 믿으면 열자마자 백본만 남고 전부 사라져 버린다. 초기 접힘 상태를
// 파일에 담는 것은 별도 결정거리다.

export type FoldScope =
  | 'one'    // 이 노드 한 단계만
  | 'level'  // 같은 층(depth) 전체를 한 단계씩
  | 'chain'  // 이 노드 아래 끝까지
  | 'all'    // 그래프 전체

export interface FoldTree {
  parentOf: Map<string, string>
  childrenOf: Map<string, string[]>
  depthOf: Map<string, number>
}

/** 조상 중 하나라도 접혀 있으면 그 노드는 화면에서 빠진다. */
export function hiddenIds(collapsed: Set<string>, tree: FoldTree, allIds: string[]): Set<string> {
  const hidden = new Set<string>()
  if (collapsed.size === 0) return hidden
  for (const id of allIds) {
    for (let p = tree.parentOf.get(id); p !== undefined; p = tree.parentOf.get(p)) {
      if (collapsed.has(p)) { hidden.add(id); break }
      if (p === id) break // 방어: 자기 자신을 부모로 갖는 데이터
    }
  }
  return hidden
}

export function descendantsOf(id: string, tree: FoldTree): string[] {
  const out: string[] = []
  const stack = [...(tree.childrenOf.get(id) ?? [])]
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    if (seen.has(cur)) continue
    seen.add(cur)
    out.push(cur)
    for (const c of tree.childrenOf.get(cur) ?? []) stack.push(c)
  }
  return out
}

/** 접었을 때 실제로 숨겨지는 노드가 있는 노드들 — 메뉴 항목 활성/비활성 판단에 쓴다. */
function foldable(tree: FoldTree, allIds: string[]): string[] {
  return allIds.filter(id => (tree.childrenOf.get(id) ?? []).length > 0)
}

function idsAtSameDepth(id: string, tree: FoldTree, allIds: string[]): string[] {
  const d = tree.depthOf.get(id)
  if (d === undefined) return [id]
  return allIds.filter(other => tree.depthOf.get(other) === d)
}

export function expand(
  collapsed: Set<string>, scope: FoldScope, id: string, tree: FoldTree, allIds: string[],
): Set<string> {
  const next = new Set(collapsed)
  switch (scope) {
    case 'one':
      next.delete(id)
      break
    case 'level':
      for (const other of idsAtSameDepth(id, tree, allIds)) next.delete(other)
      break
    case 'chain':
      next.delete(id)
      for (const d of descendantsOf(id, tree)) next.delete(d)
      break
    case 'all':
      next.clear()
      break
  }
  return next
}

export function collapseTo(
  collapsed: Set<string>, scope: FoldScope, id: string, tree: FoldTree, allIds: string[],
): Set<string> {
  const next = new Set(collapsed)
  switch (scope) {
    case 'one':
      next.add(id)
      break
    case 'level':
      for (const other of idsAtSameDepth(id, tree, allIds)) {
        if ((tree.childrenOf.get(other) ?? []).length > 0) next.add(other)
      }
      break
    case 'chain':
      next.add(id)
      for (const d of descendantsOf(id, tree)) {
        if ((tree.childrenOf.get(d) ?? []).length > 0) next.add(d)
      }
      break
    case 'all':
      for (const f of foldable(tree, allIds)) next.add(f)
      break
  }
  return next
}

/**
 * 메뉴 항목을 켤지 끌지 — 그 동작이 화면을 실제로 바꾸는 경우에만 켠다.
 * ("연쇄 펼치기를 한 뒤에야 연쇄 접기가 나온다"는 요구를, 히스토리를 따로 추적하는 대신
 * '지금 접을 것이 남아 있는가'로 판정한다. 결과는 같고 상태가 하나 줄어든다.)
 */
export function wouldChange(
  collapsed: Set<string>, action: 'expand' | 'collapse', scope: FoldScope,
  id: string, tree: FoldTree, allIds: string[],
): boolean {
  const next = action === 'expand'
    ? expand(collapsed, scope, id, tree, allIds)
    : collapseTo(collapsed, scope, id, tree, allIds)
  if (next.size !== collapsed.size) return true
  for (const v of next) if (!collapsed.has(v)) return true
  return false
}

/**
 * "몇 층까지 보여줄지"를 한 번에 정한다. depth 1이면 백본만, 2면 백본+hop1, ...
 *
 * 층 단위로 파일을 쪼개는 대신 이걸 쓴다 — 화면에 보이는 결과는 같으면서 검색·목차·접기
 * 상태가 파일 경계에서 끊기지 않는다.
 */
export function collapseToDepth(depth: number, tree: FoldTree, allIds: string[]): Set<string> {
  const next = new Set<string>()
  if (depth <= 0) return next
  for (const id of allIds) {
    if ((tree.childrenOf.get(id) ?? []).length === 0) continue
    const d = tree.depthOf.get(id)
    if (d !== undefined && d >= depth - 1) next.add(id)
  }
  return next
}

/** 그래프에서 가장 깊은 hop. 층 선택 버튼을 몇 개 그릴지 정하는 데 쓴다. */
export function maxDepthOf(tree: FoldTree, allIds: string[]): number {
  let max = 0
  for (const id of allIds) max = Math.max(max, tree.depthOf.get(id) ?? 0)
  return max
}

/** 접힌 노드 배지에 보여줄, 이 노드 때문에 숨겨진 자손 수. */
export function hiddenCountUnder(id: string, tree: FoldTree): number {
  return descendantsOf(id, tree).length
}
