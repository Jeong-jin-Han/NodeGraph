import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { NodeGraph, GraphNode, Viewport, NodeLink, CanvasImage } from '../types/graph'
import { NodeCard } from './NodeCard'
import { WireLayer } from './WireLayer'
import { CanvasImageLayer } from './CanvasImageLayer'
import { SearchBar } from './SearchBar'
import { Port } from '../utils/wireGeometry'
import { THEME } from '../utils/themeSnapshot'
import { parentIdOf, childIdsOf } from '../hooks/useGraph'

interface CanvasProps {
  openSearchSignal: number
  fitViewSignal: number
  focusCanvasSignal: number
  viewport: Viewport
  cursor: string
  nativeWheelHandler: (e: WheelEvent) => void
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void
  onSetViewport: (vp: Viewport) => void
  graph: NodeGraph
  onUpdateNodePosition: (id: string, x: number, y: number) => void
  onUpdateNode: (id: string, field: string, value: string) => void
  onAddNode: (x: number, y: number, template?: string) => void
  onAddChildNode: (parentId: string, template?: string) => void
  onDeleteNodes: (ids: string[]) => void
  onSetNodeWidth: (id: string, width: number) => void
  onSetNodeHeight: (id: string, height: number) => void
  onSetFontSize: (id: string, size: number) => void
  onBumpFontSize: (ids: string[], delta: number) => void
  onSetFontSizeExact: (ids: string[], size: number) => void
  onPushHistory: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onToggleContent: (id: string) => void
  onToggleOriginal: (id: string) => void
  onAddEdge: (sourceId: string, targetId: string) => void
  onDeleteEdge: (id: string) => void
  onAddToggle: (nodeId: string) => void
  onUpdateToggle: (nodeId: string, toggleId: string, field: 'title' | 'content', value: string) => void
  onDeleteToggle: (nodeId: string, toggleId: string) => void
  onExpandToggle: (nodeId: string, toggleId: string) => void
  onDeleteOriginal: (nodeId: string) => void
  onAddOriginal: (nodeId: string) => void
  onAddLink: (nodeId: string, link: NodeLink) => void
  onDeleteLink: (nodeId: string, idx: number) => void
  onOpenLink: (link: NodeLink) => void
  onSearchInPdf: (query: string, pageHint?: number) => void
  onSetNodeTemplate: (nodeId: string, template: string) => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onExpandNodes: (ids: string[]) => void
  onCollapseNodes: (ids: string[]) => void
  onExpandByLabel: (template: string) => void
  onExportHtml: () => void
  onReload: () => void
  onOpenHelp: () => void
  imageUris: Record<string, string>
  onSaveImage: (nodeId: string, base64: string, ext?: string, position?: number, toggleId?: string) => void
  onAddCanvasImage: (ci: CanvasImage) => void
  onAddFilenameToNode: (nodeId: string, filename: string, width?: number, height?: number) => void
  onSaveCanvasImage: (base64: string, ext: string, x: number, y: number) => void
  onUpdateCanvasImage: (id: string, updates: Partial<CanvasImage>) => void
  onRemoveCanvasImage: (id: string) => void
  onMoveCanvasImageToNode: (imgId: string, nodeId: string, tableCell?: { tableIdx: number; rowIdx: number; colIdx: number }) => void
  lastAddedCanvasImageId: string | null
}

const HEADER_H = 36

// main_topic(+ 그 hop 자식 전체)을 하나의 "묶음"으로 취급하는 트리 기반 레이아웃.
// 이전 버전(union-find 컬럼 + 전역 greedy 패킹)은 펼침이 반복될 때마다 무관한 노드까지
// 서로 밀어내며 재계산되어 hop 정렬이 흐트러지고 선이 얽히는 문제가 있었음 — 사용자 피드백:
// "one hop, two hop 형제끼리는 서로 밀리면 안 된다", "leaf부터 거꾸로(bottom-up) 계산해서
// 얼마나 공간이 필요한지 먼저 알아야 한다". 그래서 각 서브트리가 필요로 하는 세로 공간을
// bottom-up으로 한 번만 계산(Pass 1)한 뒤, 그 값을 그대로 써서 top-down으로 위치를
// 확정(Pass 2)하는 방식으로 교체 — 반복적 재밀림이 없어 얽힘이 구조적으로 발생하지 않는다.
// 레이아웃 트리 공통 구성: main_topic은 항상 루트(백본 간 arrow 엣지는 트리 엣지로
// 취급하지 않음 — 순서만 가짐). 그 외 노드는 children[]/edge로 찾은 부모에 귀속되고,
// 부모를 못 찾은 고아 노드는 자기 자신만의 독립 루트로 취급한다. computeRenderPositions
// (Y 배치·X tier 정렬)와 computeGridLines(디버그 격자)가 이 구조를 동일하게 써야
// 서로 어긋나지 않으므로(과거 gapFor 불일치 버그와 같은 클래스) 하나로 공유한다.
interface HopTree {
  isRoot: Set<string>
  parentOf: Map<string, string>
  childrenOf: Map<string, string[]>
  depthOf: Map<string, number>
  rootOf: Map<string, string>
}
function buildHopTree(
  nodes: GraphNode[],
  edges: { source: string; target: string; type?: string }[],
  nodeTemplates: Record<string, { shape: 'sharp' | 'rounded' }>
): HopTree {
  // main_topic(백본) 여부는 template의 shape가 아니라 template 키 자체로 판별해야 함 —
  // Method/Result/Claim도 "paper-derived fact"를 나타내려고 shape:'sharp'를 쓰지만
  // 구조적으로는 main_topic의 평범한 hop 자식일 뿐, 별도 백본/루트가 아니다.
  const isMainNode = (n: GraphNode) => n.template === 'main_topic'
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const parentIdOf = (nodeId: string): string | null => {
    const byChildren = nodes.find(n => n.children?.includes(nodeId))
    if (byChildren) return byChildren.id
    const byEdge = edges.find(e => e.target === nodeId)
    if (byEdge) return byEdge.source
    // 포트를 반대 방향(새 노드 → 기존 노드)으로 끌어 만든 엣지는 source/target이 뒤바뀐
    // 채로 저장돼 있을 수 있다(예: source=새 노드, target=main topic) — addEdge가 이제
    // 이런 경우를 새로 만들 땐 자동으로 바로잡지만, 이미 이렇게 저장된 기존 데이터도
    // 여기서 인식해줘야 리로드 없이(또는 재연결 없이) 바로 hop 트리에 편입된다.
    //
    // 이 fallback은 원래 target이 main_topic일 때만 적용됐는데, "여러 source →
    // 하나의 target" 수렴 구조에서는 그 source 중 하나(target의 실제 부모로 채택
    // 안 된 나머지)가 어디에도 들어오는 edge가 없는 채 남아 orphan 취급되어 격자/
    // hop 트리 배치에서 완전히 빠지는 버그가 있었다(사용자 리포트: "여러 개의 src,
    // 1개의 dst" 케이스만 grid 밖으로 위치). target이 main_topic이 아니어도 이
    // fallback을 적용해 그 target을 "가상 부모"로 삼아 트리에 편입시킨다 — 단,
    // target 쪽에서 "자신을 향하는 첫 edge"가 바로 이 edge라면(target의 실제 부모가
    // 이 nodeId가 되어버리는 경우) 서로가 서로의 부모가 되는 2노드 순환이 생겨
    // computeDepth가 무한 재귀에 빠지므로 그 경우만 제외한다.
    const outgoing = edges.find(e => e.source === nodeId && !!nodeById.get(e.target))
    if (outgoing) {
      const targetsFirstIncoming = edges.find(e => e.target === outgoing.target)
      if (targetsFirstIncoming !== outgoing) return outgoing.target
    }
    return null
  }

  const isRoot = new Set<string>()
  const parentOf = new Map<string, string>()
  for (const n of nodes) {
    if (isMainNode(n)) { isRoot.add(n.id); continue }
    const p = parentIdOf(n.id)
    if (p && nodeById.has(p)) parentOf.set(n.id, p)
    else isRoot.add(n.id)
  }
  const childrenOf = new Map<string, string[]>()
  for (const n of nodes) {
    const p = parentOf.get(n.id)
    if (!p) continue
    if (!childrenOf.has(p)) childrenOf.set(p, [])
    childrenOf.get(p)!.push(n.id)
  }

  const depthOf = new Map<string, number>()
  const rootOf = new Map<string, string>()
  const computeDepth = (id: string): { depth: number; root: string } => {
    if (depthOf.has(id)) return { depth: depthOf.get(id)!, root: rootOf.get(id)! }
    if (isRoot.has(id)) { depthOf.set(id, 0); rootOf.set(id, id); return { depth: 0, root: id } }
    const p = computeDepth(parentOf.get(id)!)
    depthOf.set(id, p.depth + 1); rootOf.set(id, p.root)
    return { depth: p.depth + 1, root: p.root }
  }
  for (const n of nodes) computeDepth(n.id)

  return { isRoot, parentOf, childrenOf, depthOf, rootOf }
}

function computeRenderPositions(
  nodes: GraphNode[],
  nodeSizes: Record<string, { width: number; height: number }>,
  nodeTemplates: Record<string, { shape: 'sharp' | 'rounded' }>,
  edges: { source: string; target: string; type?: string }[],
  draggingNodeId: string | null
): Record<string, { x: number; y: number }> {
  const isMainNode = (node: GraphNode) => node.template === 'main_topic'
  const nw = (n: GraphNode) => nodeSizes[n.id]?.width ?? (n.nodeWidth ?? 432)
  const nh = (n: GraphNode) => {
    const measured = nodeSizes[n.id]?.height
    if (measured !== undefined) return measured
    // nodeSizes 미측정 상태: 접힌 노드는 무조건 HEADER_H로 처리
    if (!n.contentExpanded) return HEADER_H
    return n.nodeHeight ?? HEADER_H
  }

  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const tree = buildHopTree(nodes, edges, nodeTemplates)
  const { childrenOf } = tree
  // main topic(백본) 기준 좌/우 — Pass 4(X 정렬)뿐 아니라 아래 세로 배치(Pass 1/2)에서도
  // 왼쪽·오른쪽 자식을 독립적으로 다루기 위해 먼저 계산해둔다.
  const sideOf = new Map<string, 1 | -1 | 0>()
  for (const n of nodes) {
    if (tree.depthOf.get(n.id) === 0) { sideOf.set(n.id, 0); continue }
    const root = nodeById.get(tree.rootOf.get(n.id)!)!
    sideOf.set(n.id, n.position.x >= root.position.x ? 1 : -1)
  }
  // 각 부모의 자식들을 저장된 상대 Y(디자인 의도상 순서) 기준으로 정렬
  for (const [pid, kids] of childrenOf) {
    const parent = nodeById.get(pid)!
    kids.sort((a, b) =>
      (nodeById.get(a)!.position.y - parent.position.y) - (nodeById.get(b)!.position.y - parent.position.y))
  }
  // 형제 그룹을 부모의 원래 Y 기준 위/아래로, 그리고 좌/우(side)로 분리한다. 왼쪽·오른쪽
  // 자식은 서로 다른 X에 그려져 세로 공간을 절대 공유하지 않는데, side를 안 나누고
  // 위/아래로만 묶으면 왼쪽 자식 하나가 커질 때 같은 묶음에 있던 오른쪽 자식까지 분기점이
  // 같이 밀려 내려가버리는 버그가 있었음(사용자가 실제로 왼쪽 노드를 펼쳐서 오른쪽 자식
  // 묶음 중심이 부모에서 벗어나는 것을 스크린샷으로 확인) — side별로 완전히 독립된
  // above/below 계산을 하도록 분리.
  //
  // 지금 드래그 중인 노드는 이 그룹에서 아예 빼버린다 — 안 그러면 드래그로 raw Y가
  // 실시간으로 바뀌면서 형제 정렬 순서 안에서 자리가 계속 옮겨 다니는데, assign()의
  // 커서 진행은 "그 자리에 정말 그 노드가 있다"고 가정하고 gap+높이만큼 진행해버려서
  // (실제로는 그 노드가 특수 케이스로 완전히 다른 곳에 떠 있는데도) 다른 형제들이 그
  // "유령 자리"만큼 밀려버렸다(사용자 리포트: "드래그로 순서를 바꾸는 게 거의 불가능,
  // 아래로 내리면 늘 맨 밑으로 간다" — 실제로는 드래그 중인 노드가 형제 배열 안에서
  // 계속 재정렬되면서 다른 형제들을 끌고 다녔던 것). 드래그 중엔 완전히 손을 떼서
  // 다른 형제들은 그 노드가 원래 없었던 것처럼 재배치되고, 드래그 중인 노드 자신은
  // assign()의 draggingNodeId 특례로 커서와 무관하게 raw 위치를 그대로 따라간다.
  const splitByOriginalSide = (parentId: string, side: 1 | -1) => {
    const parent = nodeById.get(parentId)!
    const kids = (childrenOf.get(parentId) ?? [])
      .filter(k => k !== draggingNodeId)
      .filter(k => sideOf.get(k) === side)
    // kids는 위에서 이미 상대 Y 오름차순(작은 Y 먼저)으로 정렬돼 있다 — below 그룹은
    // assign()이 배열을 순서대로 소비하며 부모에서 "멀어지는" 방향으로 커서를 진행하므로
    // 이 순서(작은 Y=부모와 가까움 먼저)가 그대로 맞다. 하지만 above 그룹은 assign()이
    // 배열 순서대로 소비하며 부모에서 "멀어지는" 방향(더 위로)으로 진행하는 건 같은데,
    // 오름차순 정렬에서는 "가장 작은(가장 음수인=가장 멀리 있는) Y"가 배열 맨 앞에 오므로
    // 그게 먼저 소비돼 오히려 부모와 가장 가까운 자리에 배치되고, 그 다음 항목이 더
    // 멀리 밀려나는 식으로 시각적 순서가 통째로 뒤집혔다 — 실제로 above 그룹에서만
    // 재현되고 below 그룹은 멀쩡했던 이유(사용자 리포트: "위치에 따라서 되는 부분도
    // 있고 안되는 부분도 있어"). above만 reverse해서 "부모와 가까운 것부터" 순서로
    // 맞춘다.
    const above = kids
      .filter(k => nodeById.get(k)!.position.y < parent.position.y)
      .reverse()
    return {
      below: kids.filter(k => nodeById.get(k)!.position.y >= parent.position.y),
      above,
    }
  }

  // mainLevel은 "이 부모의 자식들이 main topic이냐"가 아니라 "비교하는 두 노드 자체가
  // 둘 다 main topic이냐"로 판단 — main topic끼리(백본)만 20px 기준을 쓰고, hop 자식들은
  // (부모가 main topic이든 아니든) 항상 30px 기준을 쓴다. 예전엔 부모 기준으로 판단해서
  // main topic 바로 아래 hop-1 형제들이 (자기 자신은 main topic이 아닌데도) 잘못 20px로
  // 계산되어 실제 필요한 간격보다 좁게 잡히는 버그가 있었음 — 자식 간격을 기준으로 다음
  // main topic을 밀어야 하는데, 그 자식 간격 자체가 과소 계산됐던 것.
  const gapFor = (a: GraphNode, b: GraphNode): number => {
    const base = (isMainNode(a) && isMainNode(b)) ? 20 : 30
    return (nh(a) > HEADER_H || nh(b) > HEADER_H) ? 48 : base
  }

  // ── Pass 1 (bottom-up): 각 서브트리가 자기 중심(center) 기준 위/아래로 필요한 공간 ──
  interface VInfo { above: number; below: number }
  const infoCache = new Map<string, VInfo>()
  // assign()의 실제 순회(부모→첫 자식 사이에도 gap이 들어감)와 정확히 같은 식이어야 함.
  // 여기서 첫 자식 앞의 gap을 빼먹으면 bottom-up 추정치가 top-down 실제 배치보다
  // 작게 나와서, 트리가 깊어질수록(hop-2, hop-3 ...) 오차가 누적되고 결국 다른
  // main topic 클러스터와 겹치는 버그가 생김(사용자가 실제 테스트로 발견) — layoutInfo와
  // assign이 이 함수 하나를 공유해야 서로 어긋나지 않는다.
  function stackSize(group: string[], parentNode: GraphNode): number {
    if (group.length === 0) return 0
    let total = 0
    for (let i = 0; i < group.length; i++) {
      const kid = nodeById.get(group[i])!
      const prev = i === 0 ? parentNode : nodeById.get(group[i - 1])!
      total += gapFor(prev, kid)
      const kInfo = layoutInfo(group[i])
      total += kInfo.above + kInfo.below
    }
    return total
  }
  // above+below 블록을 부모 중심에 맞추기 위한 분기점 이동량(shift)을 계산한다.
  // 이상적으로는 (belowSize-aboveSize)/2만큼 이동해야 블록 전체가 정확히 부모 중심에
  //오지만, 양쪽에 다 형제가 있는 상태(hop-1 부채꼴)에서 두 그룹의 크기 차이가 크면
  // (예: 3:1 이상) 이 이동량이 큰 쪽 그룹의 "부모와 가장 가까운 자식"을 부모 중심 반대편
  // 으로 밀어버린다 — below 그룹의 첫 자식이 부모보다 위에, 혹은 above 그룹의 첫 자식이
  // 부모보다 아래에 렌더링되는 것 — 이는 "블록이 부모와 대략 비슷한 위치에 있었으면
  // 좋겠다"는 원래 요청보다 훨씬 나쁜, 자식이 자기 부모를 시각적으로 뛰어넘는 버그다
  // (실측: 위 1개 vs 아래 3개처럼 불균형한 실제 구성에서 재현, 사용자 리포트: "위치에
  // 따라서 되는 부분도 있고 안되는 부분도 있어"). 두 그룹이 다 있을 때만, "더 큰 쪽의
  // 첫 자식이 부모 중심을 넘어가지 않는 한도"로 이동량을 clamp한다 — 한쪽만 있는 경우
  // (hop-2+ 단방향 뻗기)는 애초에 넘어갈 반대쪽이 없으므로 원래 동작 그대로 둔다.
  function splitShift(id: string, side: 1 | -1) {
    const node = nodeById.get(id)!
    const { above, below } = splitByOriginalSide(id, side)
    const belowSize = stackSize(below, node)
    const aboveSize = stackSize(above, node)
    let shift = (belowSize - aboveSize) / 2
    if (above.length > 0 && below.length > 0) {
      if (shift > 0) {
        const first = nodeById.get(below[0])!
        const firstInfo = layoutInfo(below[0])
        shift = Math.min(shift, gapFor(node, first) + firstInfo.above)
      } else if (shift < 0) {
        const first = nodeById.get(above[0])!
        const firstInfo = layoutInfo(above[0])
        shift = Math.max(shift, -(gapFor(node, first) + firstInfo.below))
      }
    }
    return { above, below, belowSize, aboveSize, shift }
  }

  const layoutInfo = (id: string): VInfo => {
    const cached = infoCache.get(id)
    if (cached) return cached
    const node = nodeById.get(id)!
    const ownHalf = nh(node) / 2
    // assign()이 side별로 독립적으로 above+below 블록을 자기 중심에 맞춰 재센터링하므로
    // (아래 참고), 이 노드가 자기 부모의 형제 배치를 위해 보고하는 "필요 공간"도 side별로
    // 따로 구해서 — 왼쪽·오른쪽은 같은 세로 공간을 놓고 겹칠 일이 없으므로 둘을 더하지
    // 않고 더 많이 필요한 쪽(bounding box) 기준으로 잡는다. splitShift가 clamp한 실제
    // shift를 그대로 반영해야 assign()이 실제로 만드는 위치와 어긋나지 않는다(안 그러면
    // "다른 main topic 클러스터와 겹침" 같은 예전 버그 계열이 재발함).
    let aboveReach = 0, belowReach = 0
    for (const side of [1, -1] as const) {
      const { aboveSize, belowSize, shift } = splitShift(id, side)
      aboveReach = Math.max(aboveReach, aboveSize + shift)
      belowReach = Math.max(belowReach, belowSize - shift)
    }
    const info: VInfo = {
      above: Math.max(ownHalf, aboveReach),
      below: Math.max(ownHalf, belowReach),
    }
    infoCache.set(id, info)
    return info
  }

  // ── Pass 2 (top-down): center Y 확정 — 부모가 정해지면 그 중심을 기준으로
  // 위/아래 그룹을 각자의 layoutInfo만큼만 떨어뜨려 배치. 형제끼리는 여기서 서로의
  // 필요 공간만 참고할 뿐, 무관한 다른 묶음의 상태에 따라 재계산되지 않는다.
  const centerY = new Map<string, number>()
  const assign = (id: string, cy: number) => {
    const node = nodeById.get(id)!
    const actualCy = id === draggingNodeId ? node.position.y + nh(node) / 2 : cy
    centerY.set(id, actualCy)

    // 왼쪽/오른쪽을 완전히 독립적으로 배치한다 — 두 side 다 "above+below 블록을 부모
    // 중심에 맞춘다"는 원리는 같지만, 그 계산에 쓰이는 stackSize는 오직 같은 side의
    // 형제끼리만 더해지므로 한쪽 크기가 반대쪽 분기점에 영향을 주지 않는다(사용자
    // 리포트: "왼쪽을 펼치면 오른쪽 자식 block의 중심이 내려간다").
    for (const side of [1, -1] as const) {
      // above+below 전체를 하나의 블록으로 보고, 그 블록의 세로 중심이 (가능한 한) 부모
      // 중심과 일치하도록 분기점(split)을 옮겨둔다 — splitShift가 "한쪽 그룹이 부모 반대
      // 편으로 넘어가지 않는 한도" 안에서만 이동량을 계산해준다(그 이상 필요한 경우는
      // 대칭을 100% 맞추는 대신 자식이 부모를 뛰어넘지 않는 쪽을 우선한다).
      const { above, below, shift } = splitShift(id, side)
      const split = actualCy - shift

      let cursor = split
      for (let i = 0; i < below.length; i++) {
        const kid = nodeById.get(below[i])!
        const kInfo = layoutInfo(below[i])
        const prev = i === 0 ? node : nodeById.get(below[i - 1])!
        cursor += gapFor(prev, kid) + kInfo.above
        assign(below[i], cursor)
        cursor += kInfo.below
      }
      cursor = split
      for (let i = 0; i < above.length; i++) {
        const kid = nodeById.get(above[i])!
        const kInfo = layoutInfo(above[i])
        const prev = i === 0 ? node : nodeById.get(above[i - 1])!
        cursor -= gapFor(prev, kid) + kInfo.below
        assign(above[i], cursor)
        cursor -= kInfo.above
      }
    }
  }

  // ── 루트 시퀀싱: X범위가 겹치는 루트끼리만(보통 main_topic 백본 전체) 그룹으로 묶어
  // 순서(원래 Y)대로 배치하되, 앞 클러스터의 하단(bottom.below) 이후로 밀려야 하면
  // 그만큼 간격을 벌려 확보한다(요청: "간격을 넓혀서 공간을 확보"). X가 겹치지 않는
  // 루트(고아 노드 등)는 서로 전혀 영향을 주지 않는다.
  const roots = nodes.filter(n => tree.isRoot.has(n.id))
  const rootPar = new Map<string, string>(roots.map(n => [n.id, n.id]))
  const rootFind = (id: string): string => {
    const p = rootPar.get(id)!
    if (p === id) return id
    const r = rootFind(p)
    rootPar.set(id, r)
    return r
  }
  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i], b = roots[j]
      if (a.position.x < b.position.x + nw(b) && b.position.x < a.position.x + nw(a)) {
        const ra = rootFind(a.id), rb = rootFind(b.id)
        if (ra !== rb) rootPar.set(ra, rb)
      }
    }
  }
  const rootGroups = new Map<string, GraphNode[]>()
  for (const r of roots) {
    const g = rootFind(r.id)
    if (!rootGroups.has(g)) rootGroups.set(g, [])
    rootGroups.get(g)!.push(r)
  }
  for (const group of rootGroups.values()) {
    group.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    let cursorBottom = -Infinity
    for (let i = 0; i < group.length; i++) {
      const root = group[i]
      const info = layoutInfo(root.id)
      const naturalCenter = root.position.y + nh(root) / 2
      const gap = i === 0 ? 0 : gapFor(group[i - 1], root)
      const cy = i === 0 ? naturalCenter : Math.max(naturalCenter, cursorBottom + gap + info.above)
      assign(root.id, cy)
      cursorBottom = (centerY.get(root.id) ?? cy) + info.below
    }
  }

  // 드래그 중인 노드는 부모의 below/above 그룹에서 빠져 있어서(위 splitByOriginalSide
  // 참고) 위 재귀가 알아서 방문해주지 않는다 — 그 자신은 draggingNodeId 특례로 이미
  // 올바른 위치를 갖지만(아래 renderY 계산의 fallback이 처리), 그 노드에게 자기 자신의
  // 자식(손자뻘)이 있다면 그 자식들의 위치는 여전히 assign()을 통해 계산돼야 하므로
  // 여기서 별도로 한 번 호출해준다 — 인자로 넘기는 cy는 draggingNodeId 특례가 무시하므로
  // 아무 값이나 상관없다.
  if (draggingNodeId && !tree.isRoot.has(draggingNodeId) && !centerY.has(draggingNodeId)) {
    assign(draggingNodeId, 0)
  }

  const renderY: Record<string, number> = {}
  for (const n of nodes) {
    const cy = centerY.get(n.id) ?? (n.position.y + nh(n) / 2)
    renderY[n.id] = cy - nh(n) / 2
  }

  // Pass 4: hop tier(깊이)별 X 정렬 — 같은 depth의 모든 노드가 항상 같은 X에서
  // 시작하도록 통일한다. 예전엔 노드 단위로 세로 겹침이 있을 때만 그 노드만 오른쪽으로
  // 밀었는데, 그러면 표 등으로 넓어진 노드가 있는 브랜치만 밀리고 다른 브랜치는 그대로라
  // 같은 hop 레벨인데도 브랜치마다 X가 달라져(정렬이 깨짐) grid로 보면 hop1/hop2 열이
  // 삐뚤빼뚤해 보이는 문제가 있었음(사용자 리포트). 이제 depth+방향(좌/우)별로 "그 앞
  // depth에서 가장 넓은 노드"를 기준으로 다음 depth 전체를 균일하게 밀어서, 같은 depth는
  // (그래프 전체에 걸쳐) 항상 같은 X에서 시작 — 한 브랜치의 표 때문에 다른 브랜치의
  // 같은 레벨 열도 함께 밀리더라도, "정렬 유지"가 사용자가 명시적으로 우선시한 값이다.
  const MIN_HOP_GAP = 750
  const COL_PAD = 60
  const maxDepth = nodes.reduce((m, n) => Math.max(m, tree.depthOf.get(n.id) ?? 0), 0)
  // 전역에서 가장 넓은 main topic 폭 — 어느 main topic 하나가 표 등으로 넓어지면, 그
  // main topic 자신의 왼쪽·오른쪽 hop1 간격이 똑같이 유지되는 것은 물론(오른쪽 변만
  // 넓어지므로 오른쪽 계산에만 필요), 다른 (안 넓어진) main topic들의 hop1도 전부 같은
  // 만큼 같이 밀려서 hop1 열이 문서 전체에서 계속 나란히 정렬돼야 한다(사용자 리포트:
  // "모든 hop1과 hop2가 다 같이 밀려야 하는데 지금은 같은 main topic의 hop1, hop2에
  // 대해서만 밀려서"). 그래서 "이 브랜치 자신의 폭"이 아니라 "전역에서 제일 넓은 main
  // topic의 폭"을 모든 브랜치의 오른쪽 오프셋에 똑같이 더한다 — 표가 없는 보통 상황(모든
  // main topic 폭이 같음)에서는 이 값이 곧 자기 자신의 폭과 같아서 좌우 간격이 정확히
  // MIN_HOP_GAP으로 대칭이고, 표로 넓어진 그 main topic 자신도 좌우가 대칭을 유지한다.
  // 왼쪽은 main topic이 아무리 넓어져도 왼쪽 변 자체는 움직이지 않으므로 폭 보정이
  // 필요 없다 — 그래서 왼쪽은 항상 고정 MIN_HOP_GAP.
  let globalWidestMainTopic = 0
  for (const n of nodes) {
    if (tree.depthOf.get(n.id) === 0) globalWidestMainTopic = Math.max(globalWidestMainTopic, nw(n))
  }
  const colOffset = new Map<string, number>() // `${depth}:${side}` -> root 기준 누적 X 오프셋
  for (const side of [1, -1] as const) {
    let offset = side === 1 ? globalWidestMainTopic + MIN_HOP_GAP : MIN_HOP_GAP
    let prevMaxWidth = 0
    for (let d = 1; d <= maxDepth; d++) {
      if (d > 1) offset += Math.max(MIN_HOP_GAP, prevMaxWidth + COL_PAD)
      colOffset.set(`${d}:${side}`, offset)
      let widest = 0
      for (const n of nodes) {
        if (tree.depthOf.get(n.id) === d && sideOf.get(n.id) === side) widest = Math.max(widest, nw(n))
      }
      prevMaxWidth = widest
    }
  }
  // offset은 "root와 가장 가까운 쪽 모서리"까지의 거리다. side=1(오른쪽)은 그 모서리가
  // 곧 CSS left(카드의 왼쪽 변)라 그대로 쓰면 되지만, side=-1(왼쪽)은 root와 가장 가까운
  // 모서리가 카드의 오른쪽 변이므로, CSS left를 구하려면 거기서 카드 너비만큼 더 빼야
  // 한다. 이걸 안 하면(예전 코드) 왼쪽 변이 열 기준으로 정렬되고 반대로 main topic과
  // 가까운 오른쪽 변은 카드 너비에 따라 들쭉날쭉해져서, 커넥터가 main topic으로 모이는
  // 지점이 노드마다 제각각이 되는 문제가 있었음(사용자 리포트: "hop1 시작점에 대해서
  // 왼쪽 정렬이 아니라 오른쪽 정렬을 하라는 것").
  // main topic(백본)도 hop1/hop2처럼 "어디에 배치되든 하나의 세로줄로 자동 정렬"되게 한다 —
  // 지금까지는 depth 0 노드가 자기 raw 저장 좌표를 그대로 썼어서, 새 main topic을 만들거나
  // (그 경우 저장 좌표가 화면 중앙 기준 임의값이 됨) 실수로 다른 X로 드래그해두면 기존
  // 백본과 다른 세로줄에 떨어져 "왼쪽부터 쭉 이어지는 하나의 백본"이 깨졌음(사용자 리포트:
  // "main topic에 대해서는 노드 배치를 수평에 대해서 왼쪽 배치를 기준으로 해서 user가
  // main topic관련 노드를 배치해도 해당 지점으로 갈 수 있게"). 현재 드래그 중인 main
  // topic은 제외하고(안 그러면 드래그하는 동안 나머지가 그 쪽으로 실시간으로 튀어버림)
  // 나머지 main topic들 중 가장 왼쪽(raw x 최소값)을 기준으로 전부 그 X로 통일한다.
  // depth 0에는 main_topic 말고도(연결이 끊긴) 고아 노드가 섞일 수 있는데, 그런 노드는
  // 백본이 아니라 자유 배치가 맞으므로 isMainNode인 것만 대상으로 한다.
  const settledMainTopicXs = nodes
    .filter(n => isMainNode(n) && n.id !== draggingNodeId)
    .map(n => n.position.x)
  const mainTopicAnchorX = settledMainTopicXs.length > 0 ? Math.min(...settledMainTopicXs) : 0

  const renderX: Record<string, number> = {}
  for (const n of nodes) {
    if (n.id === draggingNodeId) { renderX[n.id] = n.position.x; continue }
    const depth = tree.depthOf.get(n.id) ?? 0
    if (depth === 0) { renderX[n.id] = isMainNode(n) ? mainTopicAnchorX : n.position.x; continue }
    const side = sideOf.get(n.id) ?? 1
    const root = nodeById.get(tree.rootOf.get(n.id)!)!
    // root가 main topic이면(항상 그렇진 않음 — 연결 끊긴 고아 노드도 자기 자손의 root가
    // 될 수 있음) raw 저장 좌표가 아니라 위에서 통일한 mainTopicAnchorX를 기준 삼아야,
    // main topic 자신의 렌더 위치와 그 hop 자식들의 렌더 위치가 서로 어긋나지 않는다.
    const rootX = isMainNode(root) ? mainTopicAnchorX : root.position.x
    const offset = colOffset.get(`${depth}:${side}`) ?? depth * MIN_HOP_GAP
    const nearRootEdge = rootX + side * offset
    renderX[n.id] = side === 1 ? nearRootEdge : nearRootEdge - nw(n)
  }

  return Object.fromEntries(nodes.map(n => [n.id, {
    x: renderX[n.id] ?? n.position.x,
    y: renderY[n.id] ?? n.position.y,
  }]))
}

// 디버그용 격자선: 세로선은 hop 레벨(main topic으로부터 몇 단계 떨어졌는지) 경계,
// 가로선은 main topic 클러스터(자신 + 모든 hop 자손) 경계. computeRenderPositions가
// 실제로 만들어낸 최종 위치를 그대로 읽어서 계산하므로, 정렬이 어긋나면 이 격자선도
// 같이 어긋나 보여서 레이아웃 버그를 눈으로 바로 확인할 수 있다.
interface GridLines { hLines: number[]; vLines: number[] }
function computeGridLines(
  nodes: GraphNode[],
  edges: { source: string; target: string; type?: string }[],
  nodeTemplates: Record<string, { shape: 'sharp' | 'rounded' }>,
  renderPositions: Record<string, { x: number; y: number }>,
  nodeSizes: Record<string, { width: number; height: number }>
): GridLines {
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const nw = (n: GraphNode) => nodeSizes[n.id]?.width ?? (n.nodeWidth ?? 432)
  const nh = (n: GraphNode) => nodeSizes[n.id]?.height ?? (n.contentExpanded ? (n.nodeHeight ?? HEADER_H) : HEADER_H)
  const rx = (n: GraphNode) => renderPositions[n.id]?.x ?? n.position.x
  const ry = (n: GraphNode) => renderPositions[n.id]?.y ?? n.position.y

  const { depthOf, rootOf } = buildHopTree(nodes, edges, nodeTemplates)
  // 격자는 "main topic 기반 계층 구조"를 보여주기 위한 것이므로, 그래프에 도달할 수
  // 없는 고아 노드(예: 테스트용 미연결 노드)는 대상에서 제외 — 안 그러면 고아 노드의
  // 임의 좌표가 main topic(depth 0) 범위에 섞여 들어가 경계선이 잘못 억제된다.
  const rootIsMain = (id: string) => nodeById.get(rootOf.get(id)!)?.template === 'main_topic'

  // ── 가로선: main topic 클러스터(자신+전체 hop 자손)의 Y 범위 경계 ──
  const clusterYRange = new Map<string, { min: number; max: number }>()
  for (const n of nodes) {
    if (!rootIsMain(n.id)) continue
    const root = rootOf.get(n.id)!
    const top = ry(n), bottom = ry(n) + nh(n)
    const cur = clusterYRange.get(root)
    if (!cur) clusterYRange.set(root, { min: top, max: bottom })
    else { cur.min = Math.min(cur.min, top); cur.max = Math.max(cur.max, bottom) }
  }
  const roots = nodes.filter(n => depthOf.get(n.id) === 0 && clusterYRange.has(n.id))
  const rootPar = new Map(roots.map(r => [r.id, r.id]))
  const rfind = (id: string): string => {
    const p = rootPar.get(id)!
    if (p === id) return id
    const r = rfind(p); rootPar.set(id, r); return r
  }
  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i], b = roots[j]
      if (rx(a) < rx(b) + nw(b) && rx(b) < rx(a) + nw(a)) {
        const ra = rfind(a.id), rb = rfind(b.id)
        if (ra !== rb) rootPar.set(ra, rb)
      }
    }
  }
  const groups = new Map<string, GraphNode[]>()
  for (const r of roots) {
    const g = rfind(r.id)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(r)
  }
  const hLines: number[] = []
  for (const group of groups.values()) {
    group.sort((a, b) => ry(a) - ry(b))
    for (let i = 1; i < group.length; i++) {
      const prevRange = clusterYRange.get(group[i - 1].id)!
      const curRange = clusterYRange.get(group[i].id)!
      hLines.push((prevRange.max + curRange.min) / 2)
    }
  }

  // ── 세로선: hop depth별 X 범위 경계 (main topic 기준 좌/우 방향을 나눠서 계산) ──
  const depthSideXRange = new Map<string, { min: number; max: number }>()
  for (const n of nodes) {
    if (!rootIsMain(n.id)) continue
    const d = depthOf.get(n.id)!
    const rootNode = nodeById.get(rootOf.get(n.id)!)!
    const side = d === 0 ? 0 : (rx(n) >= rx(rootNode) ? 1 : -1)
    const key = `${d}:${side}`
    const left = rx(n), right = rx(n) + nw(n)
    const cur = depthSideXRange.get(key)
    if (!cur) depthSideXRange.set(key, { min: left, max: right })
    else { cur.min = Math.min(cur.min, left); cur.max = Math.max(cur.max, right) }
  }
  const vLines: number[] = []
  const mainRange = depthSideXRange.get('0:0')
  if (mainRange) {
    for (const side of [1, -1]) {
      let prev = mainRange
      let d = 1
      while (depthSideXRange.has(`${d}:${side}`)) {
        const cur = depthSideXRange.get(`${d}:${side}`)!
        if (side === 1 && cur.min > prev.max) vLines.push((prev.max + cur.min) / 2)
        else if (side === -1 && prev.min > cur.max) vLines.push((cur.max + prev.min) / 2)
        prev = cur
        d++
      }
    }
  }

  return { hLines, vLines }
}

// 모든 툴바 컨트롤(버튼/드롭다운/입력)이 같은 높이를 공유해서 한 줄에서 삐뚤빼뚤
// 정렬되지 않는 문제를 방지 — 사용자 피드백: "버튼을 동일한 높이를 가지게".
const TOOLBAR_CTRL_H = 28

const toolbarBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0 10px',
  height: TOOLBAR_CTRL_H,
  boxSizing: 'border-box',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
  transition: 'filter 0.1s, transform 0.1s',
}

const toolbarSelectStyle: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  height: TOOLBAR_CTRL_H,
  boxSizing: 'border-box',
  fontSize: 11,
  fontWeight: 500,
  padding: '0 6px',
  cursor: 'pointer',
  outline: 'none',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
}

const toolbarDividerStyle: React.CSSProperties = { width: 1, height: 18, background: '#d1d5db', margin: '0 4px' }

interface SelectionBox {
  x1: number; y1: number; x2: number; y2: number
}

const FONT_PRESETS = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]

// 검색어 인라인 하이라이트: 노드 템플릿 색의 반전색(보색) 계산
function invertRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: 255 - parseInt(full.slice(0, 2), 16),
    g: 255 - parseInt(full.slice(2, 4), 16),
    b: 255 - parseInt(full.slice(4, 6), 16),
  }
}
const hitKeySafe = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_')

export function Canvas({
  openSearchSignal,
  fitViewSignal,
  focusCanvasSignal,
  viewport, cursor, nativeWheelHandler,
  onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu,
  onSetViewport, graph, onUpdateNodePosition, onUpdateNode, onAddNode, onAddChildNode, onDeleteNodes,
  onSetFontSize, onBumpFontSize, onSetFontSizeExact,
  onSetNodeWidth, onSetNodeHeight,
  onPushHistory, onUndo, onRedo, canUndo, canRedo,
  onToggleContent, onToggleOriginal,
  onAddEdge, onDeleteEdge,
  onAddToggle, onUpdateToggle, onDeleteToggle, onExpandToggle, onDeleteOriginal,
  onAddOriginal, onAddLink, onDeleteLink, onOpenLink, onSearchInPdf, onSetNodeTemplate,
  onCollapseAll, onExpandAll, onExpandNodes, onCollapseNodes, onExpandByLabel, onExportHtml, onReload, onOpenHelp,
  imageUris, onSaveImage,
  onAddCanvasImage, onAddFilenameToNode, onSaveCanvasImage, onUpdateCanvasImage, onRemoveCanvasImage, onMoveCanvasImageToNode,
  lastAddedCanvasImageId,
}: CanvasProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({})
  const [showGrid, setShowGrid] = useState(false)
  const [fontDropOpen, setFontDropOpen] = useState(false)
  const fontInputRef = useRef<HTMLInputElement>(null)
  // 툴바가 overflow-x:auto라 absolute 드롭다운이 클리핑됨 → fixed 좌표로 띄움
  const fontDropPosRef = useRef({ left: 0, top: 0 })
  const [selectedIds, _setSelectedIds] = useState<Set<string>>(new Set())
  const selectedIdsRef = useRef<Set<string>>(new Set())
  const hoveredNodeIdRef = useRef<string | null>(null)
  // ref를 항상 최신으로 유지하는 래퍼 — useEffect 동기화 의존 제거
  const setSelectedIds = useCallback((val: React.SetStateAction<Set<string>>) => {
    _setSelectedIds(prev => {
      const next = typeof val === 'function' ? (val as (p: Set<string>) => Set<string>)(prev) : val
      selectedIdsRef.current = next
      return next
    })
  }, [])

  const [selectedCanvasImgIds, _setSelectedCanvasImgIds] = useState<Set<string>>(new Set())
  const selectedCanvasImgIdsRef = useRef<Set<string>>(new Set())
  const setSelectedCanvasImgIds = useCallback((val: Set<string>) => {
    selectedCanvasImgIdsRef.current = val
    _setSelectedCanvasImgIds(val)
  }, [])
  const canvasClipboardRef = useRef<{ filename: string; width: number; height: number } | null>(null)
  const pasteBlockedRef = useRef(false)
  const mousePosRef = useRef({ x: 0, y: 0 })

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  // Collapse/Expand 라벨 필터 — '' = None (기존 동작), 아니면 해당 template 노드만 대상
  const [expandFilterLabel, setExpandFilterLabel] = useState<string>('')
  const selBoxRef = useRef<SelectionBox | null>(null)
  const panStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const [wireDrawing, setWireDrawing] = useState<{ srcId: string; srcPort: Port; curX: number; curY: number } | null>(null)
  const [wireHoverTarget, setWireHoverTarget] = useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  // 드래그로 형제 순서를 바꾸는 것이 사실상 불가능했던 버그 수정 — 드래그 중에는 부드러운
  // 추적을 위해 커서 이동량을 "지금 화면에 렌더된 위치"(renderPosition, 레이아웃 알고리즘이
  // 계산한 값)에 누적해서 raw position에 그대로 써왔는데, 정작 형제 순서/그룹핑은 그
  // raw position을 서로 비교해서 정해진다. raw position은 (표로 넓어짐/hop 정렬 등으로)
  // 실제 렌더 위치와 크게 어긋나 있는 게 보통이라, "화면에서 형제 두 개 사이에 놓았다"는
  // raw 값으로 번역하면 다른 형제들의 raw 범위를 완전히 벗어나 버리는 경우가 흔했음 —
  // 그 결과가 사용자가 보던 "밑으로 내리면 항상 맨 밑으로/순서를 못 바꾼다"는 증상.
  // 드롭 시점에만, 같은 부모의 같은 side 형제들을 "지금 렌더된 Y"로 정렬해 이 노드가
  // 실제로 어디 사이에 놓였는지 찾고, 그 두 형제의 raw Y 사이 값으로 다시 맞춰쓴다.
  // updateNodePosition을 써서 nodeNaturalY도 같이 갱신 — 안 그러면(autoSaveNodePosition)
  // position.y는 바로잡히지만 HTML export가 형제 정렬에 쓰는 nodeNaturalY는 드래그 중에
  // 이미 오염된 값(위와 같은 render/raw 혼용 버그) 그대로 남아서, 에디터에서는 순서가
  // 맞는데 export한 HTML에서는 다시 틀어져 보이는 불일치가 생긴다.
  const handleNodeDragEnd = useCallback((id: string) => {
    const g = graphRef.current
    const node = g.nodes.find(n => n.id === id)
    const parentId = node ? parentIdOf(g, id) : null
    if (node && parentId) {
      const findRootId = (fromId: string): string => {
        let cur = fromId
        const visited = new Set<string>()
        while (!visited.has(cur)) {
          visited.add(cur)
          const n = g.nodes.find(x => x.id === cur)
          if (!n) return cur
          if (n.template === 'main_topic') return cur
          const p = parentIdOf(g, cur)
          if (!p) return cur
          cur = p
        }
        return cur
      }
      const root = g.nodes.find(n => n.id === findRootId(id))
      const sideOfNode = (n: GraphNode): 1 | -1 =>
        root && n.position.x >= root.position.x ? 1 : -1
      const draggedSide = sideOfNode(node)
      const sameSideSiblings = childIdsOf(g, parentId)
        .filter(sid => sid !== id)
        .map(sid => g.nodes.find(n => n.id === sid))
        .filter((s): s is GraphNode => !!s && sideOfNode(s) === draggedSide)

      if (sameSideSiblings.length > 0) {
        const draggedRenderY = renderPositionsRef.current[id]?.y ?? node.position.y
        const ordered = sameSideSiblings
          .map(s => ({ node: s, renderY: renderPositionsRef.current[s.id]?.y ?? s.position.y }))
          .sort((a, b) => a.renderY - b.renderY)
        const belowIdx = ordered.findIndex(s => s.renderY > draggedRenderY)
        let newY: number
        if (belowIdx === -1) newY = ordered[ordered.length - 1].node.position.y + 1
        else if (belowIdx === 0) newY = ordered[0].node.position.y - 1
        else newY = (ordered[belowIdx - 1].node.position.y + ordered[belowIdx].node.position.y) / 2
        // X는 렌더 좌표가 raw에 잘못 섞여 들어간 것만 바로잡는다(같은 side 형제의 raw X를
        // 그대로 빌려씀) — 형제가 없어 side를 새로 만드는 경우(side 전환)는 건드리지 않음.
        onUpdateNodePosition(id, sameSideSiblings[0].position.x, newY)
      }
    }
    setDraggingNodeId(null)
  }, [onUpdateNodePosition])
  const [selectedEdgeId, _setSelectedEdgeId] = useState<string | null>(null)
  const selectedEdgeIdRef = useRef<string | null>(null)
  const setSelectedEdgeId = useCallback((id: string | null) => {
    selectedEdgeIdRef.current = id
    _setSelectedEdgeId(id)
  }, [])
  const lastToolbarInteractionRef = useRef<number>(0)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // 세대 하이라이트의 루트(pin): tag 클릭 시에만 갱신 — 일반 클릭/fold·unfold는
  // 하이라이트를 건드리지 않음(불필요한 재계산 방지). Esc로만 해제
  const [genRootIds, setGenRootIds] = useState<Set<string>>(new Set())
  const handlePinHighlight = useCallback((id: string) => {
    setGenRootIds(new Set([id]))
  }, [])

  // 좁은 화면에서 툴바 가로 슬라이드: Shift+휠(또는 가로휠)로 좌우 스크롤
  useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = e.shiftKey ? (e.deltaY || e.deltaX) : e.deltaX
      if (delta) { e.preventDefault(); el.scrollLeft += delta }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSelectedId, setSearchSelectedId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchSelectedIdRef = useRef<string | null>(null)
  searchSelectedIdRef.current = searchSelectedId
  const searchOpenRef = useRef(false)
  searchOpenRef.current = searchOpen

  // Extension sends openSearch message (via nodegraph.search command bound to Ctrl+F)
  useEffect(() => {
    if (openSearchSignal === 0) return
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [openSearchSignal])

  // 박스 선택에 필요한 최신 상태를 ref로 유지 (전역 mouseup 핸들러에서 stale closure 없이 읽기 위함)
  // renderPositions/nodeSizes는 useMemo/useState 이후에 선언되므로 초기값은 빈 객체 사용
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const graphNodesRef = useRef(graph.nodes)
  graphNodesRef.current = graph.nodes
  const graphRef = useRef(graph)
  graphRef.current = graph
  const canvasImagesRef = useRef(graph.canvasImages)
  canvasImagesRef.current = graph.canvasImages
  const renderPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const nodeSizesRef = useRef<Record<string, { width: number; height: number }>>({})

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    el.addEventListener('wheel', nativeWheelHandler, { passive: false })
    const onMidDown = (e: MouseEvent) => { if (e.button === 1) e.preventDefault() }
    el.addEventListener('mousedown', onMidDown)
    return () => {
      el.removeEventListener('wheel', nativeWheelHandler)
      el.removeEventListener('mousedown', onMidDown)
    }
  }, [nativeWheelHandler])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // selectedIds ref는 setSelectedIds 래퍼에서 직접 동기화 (useEffect 불필요)

  // 키보드 핸들러: Escape → 선택 해제 / Ctrl+C·X → canvas image 클립보드
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT') {
        // Escape while editing a node field → blur + deselect
        if (e.key === 'Escape') {
          const inNode = !!(active as HTMLElement).closest('[data-node-id]')
          if (inNode) {
            e.preventDefault()
            ;(active as HTMLElement).blur()
            setSelectedIds(new Set())
            setSelectedCanvasImgIds(new Set())
            setGenRootIds(new Set())
            return
          }
          // For search input and toolbar inputs, fall through to their own handlers
          return
        }
        // capture phase에서 실행 — canvas clipboard가 있으면 시스템 paste 방지
        // 실제 삽입 처리는 NodeCard의 onKeyDown(bubble phase)에서 수행
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && canvasClipboardRef.current) {
          e.preventDefault()
        }
        return
      }

      if (e.key === 'Escape') {
        if (searchOpenRef.current) { handleCloseSearch(); return }
        setSelectedIds(new Set())
        setSelectedCanvasImgIds(new Set())
        setGenRootIds(new Set())
        if (canvasClipboardRef.current !== null) pasteBlockedRef.current = true
        canvasClipboardRef.current = null
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 0)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasClipboardRef.current !== null) pasteBlockedRef.current = true
        canvasClipboardRef.current = null
        const delImgIds = selectedCanvasImgIdsRef.current
        if (delImgIds.size > 0) {
          for (const imgId of delImgIds) onRemoveCanvasImage(imgId)
          setSelectedCanvasImgIds(new Set())
          e.preventDefault()
        } else if (selectedEdgeIdRef.current) {
          onDeleteEdge(selectedEdgeIdRef.current)
          setSelectedEdgeId(null)
          e.preventDefault()
        } else if (selectedIdsRef.current.size > 0) {
          onDeleteNodes([...selectedIdsRef.current])
          setSelectedIds(new Set())
          e.preventDefault()
        }
        return
      }

      const imgId = selectedCanvasImgIdsRef.current.size === 1
        ? [...selectedCanvasImgIdsRef.current][0]
        : null
      if ((e.ctrlKey || e.metaKey)) {
        if (imgId) {
          const img = canvasImagesRef.current?.find(ci => ci.id === imgId)
          if (e.key === 'c' && img) {
            canvasClipboardRef.current = { filename: img.filename, width: img.width, height: img.height }
            pasteBlockedRef.current = false
            e.preventDefault()
            return
          } else if (e.key === 'x' && img) {
            canvasClipboardRef.current = { filename: img.filename, width: img.width, height: img.height }
            pasteBlockedRef.current = false
            onRemoveCanvasImage(imgId)
            setSelectedCanvasImgIds(new Set())
            e.preventDefault()
            return
          }
        }
        if (e.key === 'v') {
          // 일반 div는 paste event가 발생하지 않으므로 keydown에서 직접 처리
          e.preventDefault()
          // 노드 타겟: 선택된 단일 노드 > 마우스 아래 노드 > 호버 노드
          const getTargetNodeId = () => {
            if (selectedIdsRef.current.size === 1) return [...selectedIdsRef.current][0]
            const el = document.elementFromPoint(mousePosRef.current.x, mousePosRef.current.y)
            const nodeEl = el?.closest('[data-node-id]') as HTMLElement | null
            if (nodeEl?.dataset.nodeId) return nodeEl.dataset.nodeId
            return hoveredNodeIdRef.current
          }
          const targetNodeId = getTargetNodeId()

          // 1. 내부 canvas clipboard → 노드에 넣거나 캔버스에 클론
          if (canvasClipboardRef.current) {
            const clip = canvasClipboardRef.current
            if (targetNodeId) {
              // 노드가 선택/호버 중 → 파일명 직접 노드 이미지로 추가
              onAddFilenameToNode(targetNodeId, clip.filename, clip.width, clip.height)
            } else {
              // 배경 → 마우스 커서 위치에 클론 배치
              const vp = viewportRef.current
              const cx = (mousePosRef.current.x - vp.x) / vp.zoom
              const cy = (mousePosRef.current.y - vp.y) / vp.zoom
              onAddCanvasImage({
                id: `cimg_${Date.now()}`,
                filename: clip.filename,
                position: { x: cx - clip.width / 2, y: cy - clip.height / 2 },
                width: clip.width,
                height: clip.height,
              })
            }
            return
          }

          // 2. 시스템 clipboard — Delete/Esc로 무효화된 상태면 차단
          if (pasteBlockedRef.current) {
            pasteBlockedRef.current = false
            return
          }
          ;(async () => {
            const nodeId = targetNodeId

            const handleBlob = (blob: Blob, mimeType: string) => {
              const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                if (nodeId) {
                  onSaveImage(nodeId, base64, ext)  // [[IMG:filename]] 을 content 끝에 추가
                } else {
                  const vp = viewportRef.current
                  const cx = (mousePosRef.current.x - vp.x) / vp.zoom
                  const cy = (mousePosRef.current.y - vp.y) / vp.zoom
                  onSaveCanvasImage(base64, ext, cx, cy)
                }
              }
              reader.readAsDataURL(blob)
            }

            try {
              const cbItems = await navigator.clipboard.read()
              for (const cbItem of cbItems) {
                const imageType = cbItem.types.find(t => t.startsWith('image/'))
                if (imageType) {
                  const blob = await cbItem.getType(imageType)
                  handleBlob(blob, imageType)
                  return
                }
              }
            } catch (err) {
            }
          })()
        }
      }
    }
    // capture:true → NodeCard의 stopPropagation(bubble)보다 먼저 실행되어 textarea도 가로챌 수 있음
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  // deps에서 graph.canvasImages 제거 — canvasImagesRef로 항상 최신값 참조
  }, [onRemoveCanvasImage, onAddCanvasImage, onSaveImage, onSaveCanvasImage])

  // 노드 선택 시 캔버스 div에 포커스 → paste 이벤트를 div에서 수신
  useEffect(() => {
    if (selectedIds.size >= 1) {
      const active = document.activeElement
      if (active?.tagName !== 'TEXTAREA' && active?.tagName !== 'INPUT') {
        divRef.current?.focus({ preventScroll: true })
      }
    }
  }, [selectedIds])

  // 다른 탭(예: Help로 연 README 마크다운 프리뷰 — 이 역시 webview라서 우리 웹뷰와
  // 포커스를 주고받는 방식이 일반 텍스트 에디터 사이 전환과 다름)으로 갔다가 다시
  // 이 탭을 클릭해서 돌아왔을 때, VSCode가 탭은 활성화해도 iframe 안쪽 DOM 포커스는
  // 자동으로 넘겨주지 않는 경우가 있어 Escape 등 키보드 단축키가 씹히는 문제가 있었음
  // (사용자 리포트: 빨간 생성 하이라이트를 pin한 채로 Help→README 확인→탭 복귀→Esc를
  // 눌러도 하이라이트가 안 풀림). 처음엔 웹뷰의 `visibilitychange`로 감지하려 했는데
  // 실제로 재현이 안 됨을 확인 — 그건 OS 레벨 창 가시성(예: VSCode 전체를 최소화)만
  // 반영하고, "이 웹뷰 패널이 VSCode 안에서 활성 탭이 되었는가"는 반영하지 않기
  // 때문. 대신 그 정확한 시점을 알려주는 진짜 API인 확장 쪽의
  // `webviewPanel.onDidChangeViewState`(NodeGraphEditorProvider.ts)에서 패널이
  // active가 될 때 `{type:'focusCanvas'}` 메시지를 보내주도록 하고, 여기서는 그
  // 신호(App.tsx가 카운터로 변환한 `focusCanvasSignal`)를 받아서 캔버스에 focus.
  useEffect(() => {
    if (focusCanvasSignal === 0) return
    const active = document.activeElement
    if (active?.tagName !== 'TEXTAREA' && active?.tagName !== 'INPUT') {
      divRef.current?.focus({ preventScroll: true })
    }
  }, [focusCanvasSignal])

  const handleNodeHoverStart = useCallback((id: string) => { hoveredNodeIdRef.current = id }, [])
  const handleNodeHoverEnd = useCallback((id: string) => { if (hoveredNodeIdRef.current === id) hoveredNodeIdRef.current = null }, [])

  const handleCanvasPaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const ids = selectedIdsRef.current
    const nodeId = ids.size === 1 ? [...ids][0] : hoveredNodeIdRef.current

    // 내부 클립보드 우선: 노드를 타겟하지 않을 때 canvas image 클론
    if (!nodeId && canvasClipboardRef.current) {
      const clip = canvasClipboardRef.current
      const el = divRef.current
      if (el) {
        const { width: W, height: H } = el.getBoundingClientRect()
        const vp = viewportRef.current
        const cx = (W / 2 - vp.x) / vp.zoom
        const cy = (H / 2 - vp.y) / vp.zoom
        onAddCanvasImage({
          id: `cimg_${Date.now()}`,
          filename: clip.filename,
          position: { x: cx - clip.width / 2, y: cy - clip.height / 2 },
          width: clip.width,
          height: clip.height,
        })
        e.preventDefault()
        return
      }
    }

    const handleBlob = (blob: Blob, mimeType: string) => {
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        if (nodeId) {
          onSaveImage(nodeId, base64, ext)
        } else {
          // 배경에 붙여넣기 → canvas image 생성
          const el = divRef.current
          if (!el) return
          const { width: W, height: H } = el.getBoundingClientRect()
          const vp = viewportRef.current
          const cx = (W / 2 - vp.x) / vp.zoom
          const cy = (H / 2 - vp.y) / vp.zoom
          onSaveCanvasImage(base64, ext, cx, cy)
        }
      }
      reader.readAsDataURL(blob)
    }

    // 1차: ClipboardEvent.clipboardData
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageItem = items.find(it => it.type.startsWith('image/'))
    if (imageItem) {
      const blob = imageItem.getAsFile()
      if (blob) { handleBlob(blob, imageItem.type); return }
    }

    // 2차: navigator.clipboard API
    try {
      const cbItems = await navigator.clipboard.read()
      for (const cbItem of cbItems) {
        const imageType = cbItem.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await cbItem.getType(imageType)
          handleBlob(blob, imageType)
          return
        }
      }
    } catch { /* 권한 없음 */ }
  }, [onSaveImage, onSaveCanvasImage, onAddCanvasImage])

  // 새로 생성된 canvas image 자동 선택
  useEffect(() => {
    if (lastAddedCanvasImageId) {
      setSelectedCanvasImgIds(new Set([lastAddedCanvasImageId]))
      divRef.current?.focus({ preventScroll: true })
    }
  }, [lastAddedCanvasImageId])

  // 삭제된 노드 선택 해제
  useEffect(() => {
    setSelectedIds(prev => {
      const nodeIds = new Set(graph.nodes.map(n => n.id))
      const next = new Set([...prev].filter(id => nodeIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [graph.nodes])

  // 첫 템플릿 기본값 — main_topic은 항상 백본 루트로 취급되는 특수 템플릿이라(자식으로
  // 추가되면 hop 트리 정렬에서 아예 빠져버림) 툴바를 열자마자 실수로 main_topic이 선택된
  // 채 "+ Add Node"를 누르는 사고를 줄이기 위해 그 다음 템플릿을 기본값으로 삼는다.
  useEffect(() => {
    const keys = Object.keys(graph.nodeTemplates)
    if (keys.length > 0 && !keys.includes(selectedTemplate)) {
      setSelectedTemplate(keys.find(k => k !== 'main_topic') ?? keys[0])
    }
  }, [graph.nodeTemplates, selectedTemplate])


  const handleNodeResize = useCallback((id: string, width: number, height: number) => {
    setNodeSizes(prev => {
      const cur = prev[id]
      if (cur && cur.width === width && cur.height === height) return prev
      return { ...prev, [id]: { width, height } }
    })
  }, [])

  const renderPositions = useMemo(
    () => computeRenderPositions(graph.nodes, nodeSizes, graph.nodeTemplates, graph.edges, draggingNodeId),
    [graph.nodes, nodeSizes, graph.nodeTemplates, graph.edges, draggingNodeId]
  )
  renderPositionsRef.current = renderPositions
  nodeSizesRef.current = nodeSizes

  const gridLines = useMemo(
    () => showGrid
      ? computeGridLines(graph.nodes, graph.edges, graph.nodeTemplates, renderPositions, nodeSizes)
      : { hLines: [], vLines: [] },
    [showGrid, graph.nodes, graph.edges, graph.nodeTemplates, renderPositions, nodeSizes]
  )

  // Search: matching nodes for dropdown — ordered by main-topic BFS (사용자 요청): 백본
  // 순서대로 main topic을 돌면서, 그 main topic에 속한 hop-1 전부 → hop-2 전부 → ...
  // 다 훑은 뒤에야 다음 main topic으로 넘어감. 이전엔 graph.nodes 배열 순서(대략 작성
  // 순서)라 hop 구조와 무관하게 뒤섞여 보였음. 트리 구조는 레이아웃과 동일하게
  // buildHopTree로 계산해서 두 로직이 어긋나지 않게 함.
  const searchMatchNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return [] as Array<{ id: string; title: string }>
    const { depthOf, rootOf } = buildHopTree(graph.nodes, graph.edges, graph.nodeTemplates)
    const roots = graph.nodes
      .filter(n => depthOf.get(n.id) === 0)
      .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    const rootIndex = new Map(roots.map((r, i) => [r.id, i]))

    return graph.nodes
      .filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.content ?? '').toLowerCase().includes(q) ||
        (n.original?.text ?? '').toLowerCase().includes(q) ||
        (n.original?.title ?? '').toLowerCase().includes(q) ||
        (n.toggleItems ?? []).some(t =>
          t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
        )
      )
      .sort((a, b) => {
        const ra = rootIndex.get(rootOf.get(a.id) ?? a.id) ?? 0
        const rb = rootIndex.get(rootOf.get(b.id) ?? b.id) ?? 0
        if (ra !== rb) return ra - rb
        const da = depthOf.get(a.id) ?? 0, db = depthOf.get(b.id) ?? 0
        if (da !== db) return da - db
        // 같은 main topic, 같은 hop 레벨이면 원래 저장된 Y 순서로 안정적으로 정렬
        return a.position.y - b.position.y || a.position.x - b.position.x
      })
      .map(n => ({ id: n.id, title: n.title }))
  }, [searchQuery, graph.nodes, graph.edges, graph.nodeTemplates])

  const showSearchDropdown = searchOpen && searchQuery.trim() !== '' && searchSelectedId === null

  // 검색어 인라인 하이라이트 — CSS Custom Highlight API (DOM 비변형 → React와 충돌 없음).
  // 매치 노드의 텍스트에서 검색어 부분만 Range로 수집해 템플릿별 ::highlight 스타일 적용
  useEffect(() => {
    const cssAny = CSS as any
    const HighlightCtor = (window as any).Highlight
    if (!cssAny.highlights || !HighlightCtor) return
    for (const key of Object.keys(graph.nodeTemplates)) {
      cssAny.highlights.delete(`ng-hit-${hitKeySafe(key)}`)
    }
    const q = searchQuery.trim().toLowerCase()
    if (!searchOpen || !q) return
    const byTmpl = new Map<string, any>()
    for (const m of searchMatchNodes) {
      const node = graph.nodes.find(n => n.id === m.id)
      const el = document.querySelector(`[data-node-id="${CSS.escape(m.id)}"]`)
      if (!node || !el) continue
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let tn: globalThis.Node | null
      while ((tn = walker.nextNode())) {
        const parent = tn.parentElement
        if (!parent || parent.closest('.katex')) continue
        const lower = (tn.textContent ?? '').toLowerCase()
        let idx = lower.indexOf(q)
        while (idx !== -1) {
          const r = new Range()
          r.setStart(tn, idx)
          r.setEnd(tn, idx + q.length)
          const key = hitKeySafe(node.template)
          if (!byTmpl.has(key)) byTmpl.set(key, new HighlightCtor())
          byTmpl.get(key).add(r)
          idx = lower.indexOf(q, idx + q.length)
        }
      }
    }
    byTmpl.forEach((hl, key) => cssAny.highlights.set(`ng-hit-${key}`, hl))
  // nodeSizes/renderPositions: expand/collapse 등 재렌더 후 Range 재수집을 위해 포함
  }, [searchOpen, searchQuery, searchMatchNodes, graph.nodes, graph.nodeTemplates, nodeSizes, renderPositions])

  // 고정된 루트 노드의 한 세대(부모+자식) 하이라이트 — 연결 wire부터 이웃 노드까지 빨간색.
  // genRootIds 기반이라 배경 클릭으로 선택이 풀려도 유지되고 Esc로만 해제됨
  const genHighlight = useMemo(() => {
    const nodeIds = new Set<string>()
    const edgeIds = new Set<string>()
    if (genRootIds.size === 0) return { nodeIds, edgeIds }
    for (const e of graph.edges) {
      const s = genRootIds.has(e.source), t = genRootIds.has(e.target)
      if (s || t) edgeIds.add(e.id)
      if (s && !t) nodeIds.add(e.target)
      if (t && !s) nodeIds.add(e.source)
    }
    for (const n of graph.nodes) {
      if (genRootIds.has(n.id)) {
        for (const c of n.children) if (!genRootIds.has(c)) nodeIds.add(c)
      } else if (n.children.some(c => genRootIds.has(c))) {
        nodeIds.add(n.id)
      }
    }
    // 루트 자신도 포함 — 선택 해제 후에도 어느 노드 기준의 하이라이트인지 보이도록
    // (선택 중에는 NodeCard에서 selected 스타일이 우선)
    const exists = new Set(graph.nodes.map(n => n.id))
    genRootIds.forEach(id => { if (exists.has(id)) nodeIds.add(id) })
    return { nodeIds, edgeIds }
  }, [genRootIds, graph.edges, graph.nodes])

  const flyToNode = useCallback((nodeId: string) => {
    const node = graph.nodes.find(n => n.id === nodeId)
    if (!node || !divRef.current) return
    const pos = renderPositionsRef.current[nodeId] ?? node.position
    const { clientWidth, clientHeight } = divRef.current
    const nodeW = nodeSizesRef.current[nodeId]?.width ?? (node.nodeWidth ?? 432)
    const nodeH = nodeSizesRef.current[nodeId]?.height ?? 36
    const vp = viewportRef.current
    onSetViewport({
      ...vp,
      x: clientWidth / 2 - (pos.x + nodeW / 2) * vp.zoom,
      y: clientHeight / 2 - (pos.y + nodeH / 2) * vp.zoom,
    })
  }, [graph.nodes, onSetViewport])

  const handlePreviewSearchNode = useCallback((id: string) => {
    flyToNode(id)
  }, [flyToNode])

  const handleSelectSearchNode = useCallback((id: string) => {
    setSearchSelectedId(id)
    const q = searchQuery.trim().toLowerCase()
    // Enter 확정: 선택된 노드만 expand, 나머지 매치 노드는 collapse
    for (const match of searchMatchNodes) {
      const node = graph.nodes.find(n => n.id === match.id)
      if (!node) continue
      if (match.id === id) {
        if (!node.contentExpanded) onToggleContent(node.id)
        // 매치가 toggle 제목/내용 안에 있을 수 있으므로, 접혀 있으면 펼쳐서 실제로 보이게 함
        for (const t of node.toggleItems ?? []) {
          if (!t.expanded && q && (t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q))) {
            onExpandToggle(node.id, t.id)
          }
        }
        // 매치가 original 제목/텍스트 안에 있을 수 있으므로, 접혀 있으면 펼쳐서 보이게 함
        if (!node.originalExpanded && q && node.original &&
          ((node.original.title ?? '').toLowerCase().includes(q) || node.original.text.toLowerCase().includes(q))) {
          onToggleOriginal(node.id)
        }
      } else {
        if (node.contentExpanded) onToggleContent(node.id)
      }
    }
    requestAnimationFrame(() => flyToNode(id))
  }, [flyToNode, searchMatchNodes, graph.nodes, onToggleContent, onExpandToggle, onToggleOriginal, searchQuery])

  const handleSearchQueryChange = useCallback((q: string) => {
    setSearchQuery(q)
    setSearchSelectedId(null)
  }, [])

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchSelectedId(null)
  }, [])

  const handleToggleContent = useCallback((id: string) => {
    onToggleContent(id)
    const pinnedId = searchSelectedIdRef.current
    if (pinnedId) {
      requestAnimationFrame(() => flyToNode(pinnedId))
    }
    // 검색 드롭다운이 열려있으면 toggle 후 검색 input 포커스 복원 (화살표 키 유지)
    if (searchOpenRef.current && !searchSelectedIdRef.current) {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [onToggleContent, flyToNode])

  // 노드 선택 (shift/ctrl: 추가선택, 이미 다중선택 중인 노드 클릭 시 유지)
  const handleNodeSelect = useCallback((id: string, additive: boolean) => {
    setSelectedCanvasImgIds(new Set())
    setSelectedEdgeId(null)
    setSelectedIds(prev => {
      if (additive) {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }
      if (prev.has(id) && prev.size > 1) return prev  // 멀티드래그 허용
      return new Set([id])
    })
  }, [setSelectedCanvasImgIds])

  // 포트 드래그로 엣지 생성
  const handlePortDragStart = useCallback((nodeId: string, port: Port, clientX: number, clientY: number) => {
    // clientX/Y는 브라우저 창 기준 절대좌표라, 캔버스 컨테이너의 화면상 오프셋(툴바 높이 등)을
    // 빼줘야 정확한 canvas 좌표가 나옴 — 노드 드래그(useDrag)는 델타 기반이라 이 보정이 필요 없지만
    // 여기는 절대좌표 변환이라 반드시 필요함 (없으면 프리뷰 와이어와 드롭 타겟 판정이 어긋남)
    const toCanvas = (cx: number, cy: number) => {
      const rect = divRef.current?.getBoundingClientRect()
      return {
        x: (cx - (rect?.left ?? 0) - viewport.x) / viewport.zoom,
        y: (cy - (rect?.top ?? 0) - viewport.y) / viewport.zoom,
      }
    }
    const startPos = toCanvas(clientX, clientY)
    setWireDrawing({ srcId: nodeId, srcPort: port, curX: startPos.x, curY: startPos.y })
    const findHoverTarget = (cx: number, cy: number) => {
      const { x, y } = toCanvas(cx, cy)
      return graph.nodes.find(n => {
        if (n.id === nodeId) return false
        const pos = renderPositions[n.id] ?? n.position
        const sz = nodeSizes[n.id] ?? { width: 432, height: 36 }
        return x >= pos.x && x <= pos.x + sz.width && y >= pos.y && y <= pos.y + sz.height
      })
    }
    const onMove = (ev: MouseEvent) => {
      const p = toCanvas(ev.clientX, ev.clientY)
      setWireDrawing(prev => prev ? { ...prev, curX: p.x, curY: p.y } : null)
      setWireHoverTarget(findHoverTarget(ev.clientX, ev.clientY)?.id ?? null)
    }
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setWireHoverTarget(null)
      const target = findHoverTarget(ev.clientX, ev.clientY)
      if (target) onAddEdge(nodeId, target.id)
      setWireDrawing(null)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [viewport, graph.nodes, renderPositions, nodeSizes, onAddEdge])

  // 캔버스 mousedown: 오른쪽=박스선택(전역 리스너), 왼쪽=뷰포트 pan
  // 전역 document 리스너를 사용하므로 canvas 밖에서 mouseup이 발생해도 선택이 정상 완료됨
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      e.preventDefault()
      const startX = e.clientX, startY = e.clientY
      const box = { x1: startX, y1: startY, x2: startX, y2: startY }
      selBoxRef.current = box
      setSelectionBox({ ...box })

      const onGlobalMove = (ev: MouseEvent) => {
        const updated = { x1: startX, y1: startY, x2: ev.clientX, y2: ev.clientY }
        selBoxRef.current = updated
        setSelectionBox({ ...updated })
      }

      const onGlobalUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', onGlobalMove)
        document.removeEventListener('mouseup', onGlobalUp)

        const sb = selBoxRef.current
        selBoxRef.current = null
        setSelectionBox(null)

        if (!sb || ev.button !== 2) return

        const minX = Math.min(sb.x1, sb.x2), maxX = Math.max(sb.x1, sb.x2)
        const minY = Math.min(sb.y1, sb.y2), maxY = Math.max(sb.y1, sb.y2)

        if (maxX - minX > 5 || maxY - minY > 5) {
          // 박스 드래그 — ref에서 최신 상태 읽기 (stale closure 없음)
          const vp = viewportRef.current
          const cx1 = (minX - vp.x) / vp.zoom
          const cy1 = (minY - vp.y) / vp.zoom
          const cx2 = (maxX - vp.x) / vp.zoom
          const cy2 = (maxY - vp.y) / vp.zoom
          const hit = new Set<string>()
          for (const node of graphNodesRef.current) {
            const pos = renderPositionsRef.current[node.id] ?? node.position
            const sz = nodeSizesRef.current[node.id] ?? { width: 432, height: HEADER_H }
            if (pos.x < cx2 && pos.x + sz.width > cx1 && pos.y < cy2 && pos.y + sz.height > cy1) {
              hit.add(node.id)
            }
          }
          const hitImgs = new Set<string>()
          for (const img of canvasImagesRef.current ?? []) {
            if (img.position.x < cx2 && img.position.x + img.width > cx1 &&
                img.position.y < cy2 && img.position.y + img.height > cy1) {
              hitImgs.add(img.id)
            }
          }
          if (hit.size > 0 || hitImgs.size > 0) {
            setSelectedIds(hit)
            setSelectedCanvasImgIds(hitImgs)
          } else {
            setSelectedIds(new Set())
            setSelectedCanvasImgIds(new Set())
          }
        } else {
          // 단순 클릭 → 선택 해제만 (클론 배치는 Ctrl+V로만)
          setSelectedIds(new Set())
          setSelectedCanvasImgIds(new Set())
          setSelectedEdgeId(null)
        }
      }

      document.addEventListener('mousemove', onGlobalMove)
      document.addEventListener('mouseup', onGlobalUp)
    } else if (e.button === 0) {
      panStartPosRef.current = { x: e.clientX, y: e.clientY }
      onMouseDown(e)
    } else if (e.button === 1) {
      e.preventDefault()
    }
  }, [onMouseDown])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 박스 선택은 전역 리스너가 처리하므로, pan만 담당
    if (!selBoxRef.current) {
      onMouseMove(e)
    }
  }, [onMouseMove])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 박스 선택의 right-click mouseup은 전역 리스너가 처리함
    // 여기서는 left-click pan 종료 + 클릭 시 선택 해제 처리
    if (e.button === 0) {
      const start = panStartPosRef.current
      panStartPosRef.current = null
      if (start) {
        const dx = Math.abs(e.clientX - start.x)
        const dy = Math.abs(e.clientY - start.y)
        if (dx < 5 && dy < 5) {
          setSelectedIds(new Set())
          setSelectedCanvasImgIds(new Set())
          setSelectedEdgeId(null)
          if (searchOpenRef.current) {
            setSearchOpen(false)
            setSearchQuery('')
            setSearchSelectedId(null)
          }
        }
      }
      onMouseUp(e)
    }
  }, [onMouseUp, setSelectedCanvasImgIds])

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // selBoxRef는 전역 mouseup이 처리하므로 여기서 지우지 않음
    // pan 상태만 정리
    onMouseLeave(e)
  }, [onMouseLeave])

  // 툴바: 노드 추가 — 노드 하나가 선택되어 있으면 그 노드의 자식으로 추가해서
  // hop 배치(computeHopPosition)에 바로 편입되게 한다. 선택이 없거나 여러 개면
  // (붙일 부모가 애매하므로) 예전처럼 화면 중앙 근처의 빈 공간에 독립 노드로 놓는다
  // — 사용자 리포트: "새로운 노드를 추가했을 때 grid 선이 추가되고 자동으로 정렬되는
  // 기능이 없어", 정렬은 새 로직을 만들지 않고 기존 hop 배치 방식 하나만 재사용.
  const handleAddNode = useCallback(() => {
    if (selectedIds.size === 1) {
      onAddChildNode([...selectedIds][0], selectedTemplate)
      return
    }
    const el = divRef.current
    if (!el) return
    const { width: W, height: H } = el.getBoundingClientRect()
    const cx = (W / 2 - viewport.x) / viewport.zoom
    const cy = (H / 2 - viewport.y) / viewport.zoom
    const NW = 432, NH = HEADER_H, MARGIN = 40

    const isFree = (x: number, y: number) => {
      for (const n of graph.nodes) {
        const pos = renderPositionsRef.current[n.id] ?? n.position
        const sz = nodeSizesRef.current[n.id] ?? { width: n.nodeWidth ?? 432, height: HEADER_H }
        if (x < pos.x + sz.width + MARGIN && pos.x < x + NW + MARGIN &&
            y < pos.y + sz.height + MARGIN && pos.y < y + NH + MARGIN) return false
      }
      return true
    }

    // 중앙에서 시작해 위/아래로 번갈아 검색, 없으면 오른쪽 열로 이동
    const baseX = cx - NW / 2
    const baseY = cy - NH / 2
    for (let colStep = 0; colStep < 6; colStep++) {
      const tx = baseX + colStep * (NW + MARGIN)
      for (let i = 0; i < 41; i++) {
        const dy = Math.ceil(i / 2) * 70 * (i % 2 === 1 ? 1 : -1)
        const ty = baseY + dy
        if (isFree(tx, ty)) {
          onAddNode(tx, ty, selectedTemplate)
          return
        }
      }
    }
    // 빈 공간을 못 찾으면 그냥 화면 중앙에 (기존 동작)
    onAddNode(baseX, baseY, selectedTemplate)
  }, [viewport, graph.nodes, onAddNode, onAddChildNode, selectedIds, selectedTemplate])

  // 툴바: 선택된 노드 모두 삭제
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    onDeleteNodes([...selectedIds])
    setSelectedIds(new Set())
  }, [selectedIds, onDeleteNodes])

  // Fit View
  const handleFitView = useCallback(() => {
    const el = divRef.current
    if (!el || graph.nodes.length === 0) return
    const { width: W, height: H } = el.getBoundingClientRect()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const node of graph.nodes) {
      const pos = renderPositions[node.id] ?? node.position
      const sz = nodeSizes[node.id] ?? { width: 432, height: HEADER_H }
      minX = Math.min(minX, pos.x); minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + sz.width); maxY = Math.max(maxY, pos.y + sz.height)
    }
    const pad = 60
    const zoom = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY), 1.5)
    onSetViewport({ zoom, x: (W - (maxX - minX) * zoom) / 2 - minX * zoom, y: (H - (maxY - minY) * zoom) / 2 - minY * zoom })
  }, [graph.nodes, nodeSizes, renderPositions, onSetViewport])

  // 팔레트 커맨드(NodeGraph: Fit to View) → extension 메시지 → 여기서 실행
  useEffect(() => {
    if (fitViewSignal === 0) return
    handleFitView()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitViewSignal])

  // 전체 Collapse 후 자동 Fit View — onClick 시점에 requestAnimationFrame(handleFitView)를
  // 바로 넘기면, 그 시점의 handleFitView 클로저가 collapse로 인한 nodeSizes 갱신 *이전*
  // 값을 캡처해버려서(콜백 실행은 나중이라도 참조는 클릭 시점 것) 옛날(더 큰) 크기 기준으로
  // fit되어 화면을 다 못 채우는 버그가 있었음(사용자가 실제로 발견 — 수동 Fit View와 결과가
  // 다름). nodeSizes가 실제로 갱신된 뒤 실행되는 effect로 옮겼는데, 노드가 많으면
  // 각 NodeCard의 ResizeObserver/useLayoutEffect가 여러 번에 걸쳐 nodeSizes를 부분적으로만
  // 갱신하며 지나가서(전부 한 번에 batching 안 될 수 있음) 첫 변화에 바로 반응하면 여전히
  // 일부만 줄어든 중간 상태로 fit 계산이 됨 — nodeSizes 변화가 멎을 때까지(짧게 debounce)
  // 기다렸다가 마지막에 한 번만 fit하도록 수정.
  const pendingAutoFitRef = useRef(false)
  useEffect(() => {
    if (!pendingAutoFitRef.current) return
    const t = setTimeout(() => {
      pendingAutoFitRef.current = false
      handleFitView()
    }, 150)
    return () => clearTimeout(t)
  }, [nodeSizes, handleFitView])

  // canvas image를 노드 위에 드롭 → node로 이동 (table cell 감지 포함)
  const handleCanvasImageDrop = useCallback((imgId: string, clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(clientX, clientY)
    const el = elements.find(e => !e.closest('.canvas-image-item')) ?? null
    if (!el) return
    const nodeEl = el.closest('[data-node-id]') as HTMLElement | null
    if (!nodeEl) return
    const nodeId = nodeEl.dataset.nodeId!
    const tdEl = el.closest('td, th') as HTMLTableCellElement | null
    if (tdEl) {
      const table = tdEl.closest('table') as HTMLTableElement
      const allTables = Array.from(nodeEl.querySelectorAll('table'))
      const tableIdx = Math.max(0, allTables.indexOf(table))
      const rowEl = tdEl.closest('tr') as HTMLTableRowElement
      const rowIdx = rowEl.rowIndex
      const colIdx = tdEl.cellIndex
      onMoveCanvasImageToNode(imgId, nodeId, { tableIdx, rowIdx, colIdx })
    } else {
      onMoveCanvasImageToNode(imgId, nodeId)
    }
  }, [onMoveCanvasImageToNode])

  const selCount = selectedIds.size

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 검색어 인라인 하이라이트 스타일 — 템플릿 색의 반전색 + 밑줄 */}
      <style>{Object.entries(graph.nodeTemplates).map(([key, t]) => {
        const inv = invertRgb(t.color)
        const c = inv ? `rgb(${inv.r},${inv.g},${inv.b})` : '#ff3b30'
        const bg = inv ? `rgba(${inv.r},${inv.g},${inv.b},0.18)` : 'rgba(255,59,48,0.18)'
        return `::highlight(ng-hit-${hitKeySafe(key)}){color:${c};background-color:${bg};text-decoration:underline}`
      }).join('\n')}</style>

      {/* 툴바 버튼 hover/active — 버튼 자체 배경색과 무관하게 filter로 통일 적용 */}
      <style>{`
        /* !important: buttons set background/color/border via inline style (React), which
           otherwise always beats a stylesheet :hover rule regardless of selector specificity */
        .ng-toolbar button:not(:disabled):hover { background: #2563eb !important; color: #ffffff !important; border-color: #1d4ed8 !important; }
        .ng-toolbar button:not(:disabled):active { background: #1d4ed8 !important; border-color: #1e40af !important; transform: translateY(0.5px); }
        .ng-toolbar select:hover { border-color: #93c5fd; }
        .ng-toolbar select:focus { border-color: #2563eb; }
      `}</style>

      {/* 상단 툴바 — mouseDown을 캔버스로 전파하지 않음 (폰트 컨트롤 클릭 시 선택 해제 방지).
          사용자 피드백: 한 줄에 컨트롤이 너무 많이 몰려 보여서, edit 계열(undo/redo,
          노드 생성/삭제, 선택 노드 편집)을 위쪽 줄로, view/그래프 탐색 계열(fold/expand,
          fit view, grid, export, reload, help)을 아래쪽 줄로 분리 — 대신 툴바 전체
          높이를 두 줄만큼 더 키움. 슬라이드(가로 스크롤)는 두 줄을 감싸는 바깥
          컨테이너(toolbarRef) 기준으로 그대로 유지. */}
      <div
        ref={toolbarRef}
        className="ng-toolbar"
        onMouseDown={(e) => { e.stopPropagation(); lastToolbarInteractionRef.current = Date.now() }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '8px 12px',
          background: '#f0f2f5',
          borderBottom: '1px solid #d1d5db',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
          flexShrink: 0,
          zIndex: 200,
          overflowX: 'auto',
        }}>
        {/* Row 1 — editing: undo/redo, node creation, deletion, per-selection controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button
          style={{ ...toolbarBtnStyle, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }}
          onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="9 14 4 9 9 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Undo
        </button>
        <button
          style={{ ...toolbarBtnStyle, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }}
          onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
        >
          Redo
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="15 14 20 9 15 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20v-7a4 4 0 0 1 4-4h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={toolbarDividerStyle} />

        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          style={toolbarSelectStyle}
        >
          {Object.entries(graph.nodeTemplates).map(([key, tmpl]) => (
            <option key={key} value={key}>{tmpl.label} ({tmpl.shape})</option>
          ))}
        </select>

        <button style={toolbarBtnStyle} onClick={handleAddNode}>+ Add Node</button>

        <div style={toolbarDividerStyle} />

        <button
          style={{
            ...toolbarBtnStyle,
            opacity: selCount > 0 ? 1 : 0.4,
            cursor: selCount > 0 ? 'pointer' : 'default',
          }}
          onClick={handleDeleteSelected}
          disabled={selCount === 0}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M14 11v6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          Delete{selCount > 1 ? ` (${selCount})` : ''}
        </button>

        {selCount > 0 && (
          <>
            <div style={toolbarDividerStyle} />
            <span style={{ fontSize: 10, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {selCount === 1 ? graph.nodes.find(n => selectedIds.has(n.id))?.title : `${selCount}개 선택됨`}
            </span>
            {selCount === 1 && (() => {
              const selNode = graph.nodes.find(n => selectedIds.has(n.id))
              if (!selNode) return null
              return (
                <select
                  value={selNode.template}
                  onChange={(e) => onSetNodeTemplate(selNode.id, e.target.value)}
                  style={{ ...toolbarSelectStyle, borderRadius: 3 }}
                  title="노드 타입 변경"
                >
                  {Object.entries(graph.nodeTemplates).map(([key, t]) => (
                    <option key={key} value={key}>{t.label}</option>
                  ))}
                </select>
              )
            })()}

            {/* 폰트 사이즈 콤보박스: Word 스타일 (텍스트 입력 + ▼ 드롭다운) */}
            {(() => {
              const selFonts = [...selectedIds].map(id => graph.nodes.find(n => n.id === id)?.fontSize ?? 14)
              const minFont = selFonts.length ? Math.min(...selFonts) : 14

              if (fontInputRef.current && document.activeElement !== fontInputRef.current) {
                fontInputRef.current.value = String(minFont)
              }

              const applyFont = (raw: string) => {
                const ids = [...selectedIdsRef.current]
                if (!ids.length) return
                const v = parseInt(raw, 10)
                if (isNaN(v) || v < 6 || v > 200) return
                const lf = ids.map(id => graph.nodes.find(n => n.id === id)?.fontSize ?? 14)
                const lMin = Math.min(...lf), lMax = Math.max(...lf)
                if (ids.length > 1 && lMax !== lMin) onBumpFontSize(ids, v - lMin)
                else onSetFontSizeExact(ids, v)
              }

              return (
                <div style={{ position: 'relative', display: 'inline-flex', height: TOOLBAR_CTRL_H }}>
                  <input
                    ref={fontInputRef}
                    type="text"
                    defaultValue={String(minFont)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v) && v >= 6 && v <= 200) applyFont(e.target.value)
                      else e.target.value = String(minFont)
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') { applyFont((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur() }
                      if (e.key === 'Escape') { (e.target as HTMLInputElement).value = String(minFont); (e.target as HTMLInputElement).blur() }
                    }}
                    style={{
                      width: 34, height: TOOLBAR_CTRL_H, boxSizing: 'border-box', padding: '1px 4px', fontSize: 11, textAlign: 'center',
                      background: '#fff', color: '#374151', outline: 'none',
                      border: '1px solid #d1d5db', borderRight: 'none', borderRadius: '3px 0 0 3px',
                    }}
                    title="폰트 크기 (직접 입력 후 Enter)"
                  />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault(); e.stopPropagation()
                      const wrap = (e.currentTarget as HTMLElement).parentElement
                      if (wrap) {
                        const r = wrap.getBoundingClientRect()
                        fontDropPosRef.current = { left: r.left, top: r.bottom }
                      }
                      setFontDropOpen(o => !o)
                    }}
                    style={{
                      width: 16, height: TOOLBAR_CTRL_H, boxSizing: 'border-box', padding: 0, fontSize: 9, cursor: 'pointer', lineHeight: 1,
                      background: '#f0f0f0', color: '#333',
                      border: '1px solid #d1d5db', borderRadius: '0 3px 3px 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▾</button>
                  {fontDropOpen && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'fixed', top: fontDropPosRef.current.top, left: fontDropPosRef.current.left, zIndex: 9999,
                        width: 52, maxHeight: 200, overflowY: 'auto',
                        background: '#fff',
                        border: '1px solid #d1d5db', borderRadius: 3,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {FONT_PRESETS.map(s => (
                        <div
                          key={s}
                          onClick={() => {
                            applyFont(String(s))
                            if (fontInputRef.current) fontInputRef.current.value = String(s)
                            setFontDropOpen(false)
                          }}
                          style={{
                            padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                            background: s === minFont ? '#374151' : 'transparent',
                            color: s === minFont ? '#fff' : '#1a1a1a',
                          }}
                          onMouseEnter={(e) => { if (s !== minFont) (e.currentTarget as HTMLElement).style.background = '#e8e8e8' }}
                          onMouseLeave={(e) => { if (s !== minFont) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

          </>
        )}
        </div>

        {/* Row 2 — view / graph navigation: fold/expand, fit view, grid, export, reload, help */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <select
          value={expandFilterLabel}
          onChange={(e) => setExpandFilterLabel(e.target.value)}
          title="Filter Collapse/Expand to one node type"
          style={toolbarSelectStyle}
        >
          <option value="">None</option>
          {Object.entries(graph.nodeTemplates).map(([key, tmpl]) => (
            <option key={key} value={key}>{tmpl.label}</option>
          ))}
        </select>
        <button
          style={toolbarBtnStyle}
          onClick={() => {
            // 전체 collapse(선택 없이, 또는 필터가 걸려 있어도 결국 onCollapseAll)일 때만
            // 자동으로 Fit View — 선택 서브트리만 접을 땐 사용자가 보던 영역을 유지해야
            // 하므로 대상에서 제외. nodeSizes가 실제로 갱신된 뒤 실행되도록 플래그만 세움
            // (위 useEffect 참고 — 클릭 시점에 바로 스케줄하면 스케일 클로저 문제 있음).
            if (expandFilterLabel) { onCollapseAll(); pendingAutoFitRef.current = true; return }
            const ids = [...selectedIdsRef.current]
            if (ids.length > 0) { onCollapseNodes(ids); return }
            onCollapseAll()
            pendingAutoFitRef.current = true
          }}
          title={expandFilterLabel ? 'Collapse all nodes' : selCount > 0 ? 'Collapse selected nodes' : 'Collapse all nodes'}
        >📁 Collapse</button>
        <button
          style={toolbarBtnStyle}
          onClick={() => {
            if (expandFilterLabel) { onExpandByLabel(expandFilterLabel); return }
            const ids = [...selectedIdsRef.current]
            if (ids.length > 0) onExpandNodes(ids)
            else onExpandAll()
          }}
          title={expandFilterLabel ? `Expand only ${graph.nodeTemplates[expandFilterLabel]?.label ?? expandFilterLabel} nodes` : selCount > 0 ? 'Expand selected nodes' : 'Expand all nodes'}
        >📂 Expand</button>
        <button style={toolbarBtnStyle} onClick={handleFitView} title="Fit all nodes into view">Fit View</button>
        <button
          style={{ ...toolbarBtnStyle, background: showGrid ? '#2563eb' : toolbarBtnStyle.background, color: showGrid ? '#ffffff' : toolbarBtnStyle.color }}
          onClick={() => setShowGrid(v => !v)}
          title="Toggle debug grid — vertical lines mark hop-level boundaries, horizontal lines mark main-topic cluster boundaries"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
          </svg>
          Grid
        </button>

        <div style={toolbarDividerStyle} />
        <button
          style={toolbarBtnStyle}
          onClick={onExportHtml}
          title="Export as HTML"
        >Export HTML</button>

        {/* 고정 폭 간격 — flex:1 스페이서는 창 축소 시 먼저 수축해 버튼 위치가 움직이고
            overflow(슬라이드)도 늦게 발생하므로 사용하지 않음 */}
        <div style={{ width: 24 }} />
        <button
          style={toolbarBtnStyle}
          onClick={onReload}
          title="Reload from disk (re-reads the JSON file — use after an external agent edits it)"
        >Reload</button>
        <button
          style={toolbarBtnStyle}
          onClick={onOpenHelp}
          title="Help — open the Features section of the extension's README"
        >Help</button>
        </div>
      </div>

      {/* 캔버스 */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div
          ref={divRef}
          tabIndex={0}
          style={{
            width: '100%', height: '100%',
            overflow: 'hidden', position: 'relative',
            background: THEME.canvasBg,
            cursor: selectionBox ? 'crosshair' : cursor,
            userSelect: 'none',
            outline: 'none',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          onContextMenu={onContextMenu}
          onPaste={handleCanvasPaste}
        >
          <div style={{
            position: 'absolute',
            // 이 wrapper는 position:absolute인데 width/height를 안 주면(과거 코드) 자기
            // 자식(NodeCard들)도 전부 absolute라 in-flow 콘텐츠가 없어서 shrink-to-fit이
            // 0x0으로 잡힌다. 그러면 NodeCard의 width:auto(shrink-to-fit) 계산에 쓰이는
            // "available width = containingBlockWidth - left"가, hop 트리에서 root보다
            // 왼쪽(음수 left)에 있는 노드에 한해 "0 - (음수 left)" = 노드가 원점에서 왼쪽으로
            // 떨어진 거리와 정확히 같은 양수로 나와버렸음 — 표처럼 실제 필요 너비가 그 값보다
            // 작은 콘텐츠가 그 값을 그대로 자기 너비로 삼아 카드가 수천 px로 부풀고 부모/형제
            // 노드와 겹치는 버그가 있었음(사용자가 실제 그래프의 hop-2 왼쪽 노드+표 조합에서
            // 발견 — 오른쪽 노드나 표 없는 노드에서는 재현 안 됨, 우연히 자릿수가 맞아떨어진
            // 경우라 발견하기 까다로웠음). left/top은 그대로 두고(자식의 left:renderPosition.x가
            // 가리키는 화면 위치가 바뀌면 안 되므로) width/height만 넉넉하게 고정값으로 줘서
            // 이 계산이 항상 크게 나오도록 한다 — 노드 좌표가 이 범위(±100000px) 안에만
            // 있으면 충분.
            width: 200000,
            height: 200000,
            transformOrigin: '0 0',
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          }}>
            <CanvasImageLayer
              canvasImages={graph.canvasImages ?? []}
              imageUris={imageUris}
              viewport={viewport}
              selectedIds={selectedCanvasImgIds}
              onSelect={(id) => {
                setSelectedCanvasImgIds(new Set([id]))
                setSelectedIds(new Set())
                divRef.current?.focus({ preventScroll: true })
              }}
              onUpdatePosition={(id, x, y) => onUpdateCanvasImage(id, { position: { x, y } })}
              onUpdateSize={(id, w, h) => onUpdateCanvasImage(id, { width: w, height: h })}
              onDrop={handleCanvasImageDrop}
            />
            {graph.nodes.map((node) => {
              const isMultiSelected = selectedIds.has(node.id) && selectedIds.size > 1
              const extraDragNodes = isMultiSelected
                ? [...selectedIds]
                    .filter(id => id !== node.id)
                    .map(id => {
                      const n = graph.nodes.find(x => x.id === id)
                      return n ? { id, x: n.position.x, y: n.position.y } : null
                    })
                    .filter(Boolean) as Array<{ id: string; x: number; y: number }>
                : null
              return (
                <NodeCard
                  key={node.id}
                  node={node}
                  template={graph.nodeTemplates[node.template]}
                  nodeTemplates={graph.nodeTemplates}
                  viewportZoom={viewport.zoom}
                  renderPosition={renderPositions[node.id] ?? node.position}
                  selected={selectedIds.has(node.id)}
                  isMultiSelected={isMultiSelected}
                  extraDragNodes={extraDragNodes}
                  onSelect={handleNodeSelect}
                  onHoverStart={handleNodeHoverStart}
                  onHoverEnd={handleNodeHoverEnd}
                  onUpdatePosition={onUpdateNodePosition}
                  onUpdateNode={onUpdateNode}
                  onSetNodeWidth={onSetNodeWidth}
                  onSetNodeHeight={onSetNodeHeight}
                  onSetFontSize={onSetFontSize}
                  onPushHistory={onPushHistory}
                  onToggleContent={handleToggleContent}
                  onToggleOriginal={onToggleOriginal}
                  onResize={handleNodeResize}
                  onPortDragStart={handlePortDragStart}
                  onAddToggle={onAddToggle}
                  onUpdateToggle={onUpdateToggle}
                  onDeleteToggle={onDeleteToggle}
                  onExpandToggle={onExpandToggle}
                  onDeleteOriginal={onDeleteOriginal}
                  onAddOriginal={onAddOriginal}
                  onAddLink={onAddLink}
                  onDeleteLink={onDeleteLink}
                  onOpenLink={onOpenLink}
                  onSearchInPdf={onSearchInPdf}
                  onSetNodeTemplate={onSetNodeTemplate}
                  imageUris={imageUris}
                  onSaveImage={onSaveImage}
                  canvasClipboardRef={canvasClipboardRef}
                  onAddFilenameToNode={onAddFilenameToNode}
                  isSearchMatch={searchSelectedId === null && searchMatchNodes.some(m => m.id === node.id)}
                  isActiveSearchMatch={node.id === searchSelectedId}
                  isGenHighlight={genHighlight.nodeIds.has(node.id)}
                  onPinHighlight={handlePinHighlight}
                  onNodeDragActivate={setDraggingNodeId}
                  onNodeDragDeactivate={handleNodeDragEnd}
                />
              )
            })}
            {showGrid && (() => {
              // wire와 동일한 줌 보정: 확대 시 기본 두께, 축소 시 화면상 두께 유지되게 키움
              const gzc = viewport.zoom < 1 ? 1 / viewport.zoom : 1
              return (
                <svg
                  style={{ position: 'absolute', left: -10000, top: -10000, width: 20000, height: 20000, pointerEvents: 'none', overflow: 'visible' }}
                  viewBox="-10000 -10000 20000 20000"
                >
                  {gridLines.vLines.map((x, i) => (
                    <line key={`gv${i}`} x1={x} y1={-10000} x2={x} y2={10000} stroke="#22c55e" strokeWidth={1.5 * gzc} strokeDasharray={`${6 * gzc} ${4 * gzc}`} opacity={0.55} />
                  ))}
                  {gridLines.hLines.map((y, i) => (
                    <line key={`gh${i}`} x1={-10000} y1={y} x2={10000} y2={y} stroke="#f97316" strokeWidth={1.5 * gzc} strokeDasharray={`${6 * gzc} ${4 * gzc}`} opacity={0.55} />
                  ))}
                </svg>
              )
            })()}
            <WireLayer
              nodes={graph.nodes}
              edges={graph.edges}
              nodeSizes={nodeSizes}
              renderPositions={renderPositions}
              wirePreview={wireDrawing}
              wireHoverTargetId={wireHoverTarget}
              selectedEdgeId={selectedEdgeId}
              highlightEdgeIds={genHighlight.edgeIds}
              fastRoute={draggingNodeId !== null}
              zoom={viewport.zoom}
              onSelectEdge={setSelectedEdgeId}
            />
          </div>

          {/* 검색 오버레이 */}
          {searchOpen && (
            <SearchBar
              query={searchQuery}
              onQueryChange={handleSearchQueryChange}
              matches={searchMatchNodes}
              showDropdown={showSearchDropdown}
              selectedId={searchSelectedId}
              onSelectNode={handleSelectSearchNode}
              onPreviewNode={handlePreviewSearchNode}
              onClose={handleCloseSearch}
              onReopen={() => setSearchSelectedId(null)}
              inputRef={searchInputRef}
            />
          )}

          {/* 박스 선택 오버레이 (스크린 좌표) */}
          {selectionBox && (
            <div style={{
              position: 'absolute',
              left: Math.min(selectionBox.x1, selectionBox.x2),
              top: Math.min(selectionBox.y1, selectionBox.y2),
              width: Math.abs(selectionBox.x2 - selectionBox.x1),
              height: Math.abs(selectionBox.y2 - selectionBox.y1),
              border: '1px solid rgba(100,160,255,0.8)',
              background: 'rgba(100,160,255,0.08)',
              pointerEvents: 'none',
              zIndex: 150,
            }} />
          )}
        </div>

      </div>
    </div>
  )
}
