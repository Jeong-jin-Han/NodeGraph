import React, { useState, useCallback, useMemo, useRef, useEffect, CSSProperties } from 'react'
import { NodeGraph, GraphNode, Viewport, NodeLink, CanvasImage } from '../types/graph'
import { NodeCard } from './NodeCard'
import { WireLayer } from './WireLayer'
import { CanvasImageLayer } from './CanvasImageLayer'
import { SearchBar } from './SearchBar'
import { Port } from '../utils/wireGeometry'

interface CanvasProps {
  openSearchSignal: number
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
  onAutoSaveNodePosition: (id: string, x: number, y: number) => void
  onUpdateNode: (id: string, field: string, value: string) => void
  onAddNode: (x: number, y: number, template?: string) => void
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
  onDeleteEdges: (ids: string[]) => void
  onAddToggle: (nodeId: string) => void
  onUpdateToggle: (nodeId: string, toggleId: string, field: 'title' | 'content', value: string) => void
  onDeleteToggle: (nodeId: string, toggleId: string) => void
  onExpandToggle: (nodeId: string, toggleId: string) => void
  onDeleteOriginal: (nodeId: string) => void
  onAddOriginal: (nodeId: string) => void
  onAddLink: (nodeId: string, link: NodeLink) => void
  onDeleteLink: (nodeId: string, idx: number) => void
  onOpenLink: (link: NodeLink) => void
  onSetNodeTemplate: (nodeId: string, template: string) => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onExpandNodes: (ids: string[]) => void
  onCollapseNodes: (ids: string[]) => void
  onExportHtml: () => void
  onReload: () => void
  imageUris: Record<string, string>
  onSaveImage: (nodeId: string, base64: string, ext?: string, position?: number) => void
  onAddCanvasImage: (ci: CanvasImage) => void
  onAddFilenameToNode: (nodeId: string, filename: string, width?: number, height?: number) => void
  onSaveCanvasImage: (base64: string, ext: string, x: number, y: number) => void
  onUpdateCanvasImage: (id: string, updates: Partial<CanvasImage>) => void
  onRemoveCanvasImage: (id: string) => void
  onMoveCanvasImageToNode: (imgId: string, nodeId: string, tableCell?: { tableIdx: number; rowIdx: number; colIdx: number }) => void
  lastAddedCanvasImageId: string | null
}

const HEADER_H = 36

function findRedundantEdges(edges: { id: string; source: string; target: string }[]): string[] {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  }
  const redundant: string[] = []
  for (const edge of edges) {
    const { source: u, target: v, id } = edge
    // BFS from u's neighbors (skip direct u→v hop), check if v is reachable
    const visited = new Set<string>([u])
    const queue: string[] = []
    for (const n of (adj.get(u) ?? [])) {
      if (n === v) continue
      if (!visited.has(n)) { visited.add(n); queue.push(n) }
    }
    let found = false
    while (queue.length > 0 && !found) {
      const curr = queue.shift()!
      if (curr === v) { found = true; break }
      for (const n of (adj.get(curr) ?? [])) {
        if (!visited.has(n)) { visited.add(n); queue.push(n) }
      }
    }
    if (found) redundant.push(id)
  }
  return redundant
}

function computeRenderPositions(
  nodes: GraphNode[],
  nodeSizes: Record<string, { width: number; height: number }>,
  nodeTemplates: Record<string, { shape: 'sharp' | 'rounded' }>,
  edges: { source: string; target: string; type?: string }[],
  draggingNodeId: string | null
): Record<string, { x: number; y: number }> {
  const isMainNode = (node: GraphNode) => (nodeTemplates[node.template]?.shape ?? 'sharp') === 'sharp'
  const nw = (n: GraphNode) => nodeSizes[n.id]?.width ?? (n.nodeWidth ?? 432)
  const nh = (n: GraphNode) => {
    const measured = nodeSizes[n.id]?.height
    if (measured !== undefined) return measured
    // nodeSizes 미측정 상태: 접힌 노드는 무조건 HEADER_H로 처리
    if (!n.contentExpanded) return HEADER_H
    return n.nodeHeight ?? HEADER_H
  }

  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const isConnected = (aId: string, bId: string): boolean => {
    const a = nodeById.get(aId)!, b = nodeById.get(bId)!
    if (a.children.includes(bId) || b.children.includes(aId)) return true
    return edges.some(e =>
      (e.source === aId && e.target === bId) || (e.source === bId && e.target === aId)
    )
  }

  // 모든 노드를 X 범위 겹침 기준으로 컬럼에 묶기 (union-find)
  // main/sub 구분 없이 동일 X 컬럼에 있으면 함께 처리 — 이전 버전의 핵심 버그 수정
  const par: Record<string, string> = {}
  nodes.forEach(n => { par[n.id] = n.id })
  const find = (id: string): string => {
    if (par[id] !== id) par[id] = find(par[id])
    return par[id]
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      if (a.position.x < b.position.x + nw(b) && b.position.x < a.position.x + nw(a)) {
        const ra = find(a.id), rb = find(b.id)
        if (ra !== rb) par[ra] = rb
      }
    }
  }
  const colMap = new Map<string, GraphNode[]>()
  for (const n of nodes) {
    const root = find(n.id)
    if (!colMap.has(root)) colMap.set(root, [])
    colMap.get(root)!.push(n)
  }

  // 컬럼을 X 오름차순(왼→오)으로 정렬해서 순서대로 처리
  const columns = [...colMap.values()].sort((a, b) =>
    Math.min(...a.map(n => n.position.x)) - Math.min(...b.map(n => n.position.x))
  )

  const renderY: Record<string, number> = {}

  // 이미 팩킹된(왼쪽) 컬럼의 연결 노드를 기준으로 effectiveOriginY 계산
  // - 연결 노드가 확장(height > HEADER_H)되어 이 노드의 originalY를 덮으면 → bottom 아래로 밀기
  // - 연결 노드가 접혀있고 Y만 이동했으면 → 이동 delta만큼 따라 내려가기
  // - 연결 노드가 없거나 영향 없으면 → originalY 유지
  const getEffectiveOriginY = (node: GraphNode): number => {
    let effY = node.position.y
    for (const other of nodes) {
      if (renderY[other.id] === undefined) continue  // 아직 처리되지 않은 컬럼은 무시
      if (!isConnected(node.id, other.id)) continue
      const otherRenderY = renderY[other.id]
      const otherH = nh(other)
      const otherBottom = otherRenderY + otherH
      const otherPush = Math.max(0, otherRenderY - other.position.y)
      if (otherH > HEADER_H && otherBottom > node.position.y) {
        // 확장된 노드가 이 노드의 originalY 위치를 덮음 → bottom 아래로 (펼침 여백 48px)
        effY = Math.max(effY, otherBottom + 48)
      } else {
        // 접힌 상태 or originalY 아래: Y 이동 delta만 전파
        effY = Math.max(effY, node.position.y + otherPush)
      }
    }
    return effY
  }

  // 컬럼별 그리디 패킹 (왼→오 순서)
  for (const col of columns) {
    // effectiveOriginY를 먼저 계산 (팩킹 중 renderY가 바뀌기 전에)
    const effYMap = new Map(col.map(n => [n.id, getEffectiveOriginY(n)]))

    // effectiveOriginY 기준 오름차순 정렬, 동률이면 originalY 기준
    col.sort((a, b) => {
      const ea = effYMap.get(a.id)!, eb = effYMap.get(b.id)!
      return ea !== eb ? ea - eb : a.position.y - b.position.y
    })

    // 위→아래 그리디 패킹 — gap 규칙은 실제 X범위가 겹치는(pairwise) 노드끼리만 적용
    // 컬럼은 transitive 체인으로 묶이므로, 체인으로만 연결된 먼 노드가
    // 빈 공간에 놓인 노드를 밀어내지 않도록 pairwise 충돌 검사 사용
    const xOverlap = (a: GraphNode, b: GraphNode) =>
      a.position.x < b.position.x + nw(b) && b.position.x < a.position.x + nw(a)
    const placed: Array<{ node: GraphNode; y: number; h: number }> = []
    for (const node of col) {
      const h = nh(node)
      if (node.id === draggingNodeId) {
        // 드래그 중인 노드는 알고리즘 제외 → 마우스 따라 자유롭게 이동
        renderY[node.id] = node.position.y
        placed.push({ node, y: node.position.y, h })
        continue
      }
      // 적응형 gap: 둘 다 접힌 상태면 촘촘하게(20/30), 한쪽이라도 펼쳐져 있으면
      // 48px로 넓혀 펼친 콘텐츠 주변 가독성 확보 (접힌 노드들은 공간 낭비 없음)
      const baseGap = isMainNode(node) ? 20 : 30
      let y = effYMap.get(node.id)!
      let moved = true
      while (moved) {
        moved = false
        for (const p of placed) {
          if (!xOverlap(node, p.node)) continue
          const gap = (h > HEADER_H || p.h > HEADER_H) ? 48 : baseGap
          // 세로 구간이 (gap 여유 포함) 겹치면 해당 노드 아래로 밀기
          if (y < p.y + p.h + gap && y + h + gap > p.y) {
            y = p.y + p.h + gap
            moved = true
          }
        }
      }
      renderY[node.id] = y
      placed.push({ node, y, h })
    }
  }

  // Pass 3: line 엣지 버스 그룹 Y 정규화
  const lineBySource = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.type !== 'line') continue
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue
    if (!lineBySource.has(edge.source)) lineBySource.set(edge.source, [])
    lineBySource.get(edge.source)!.push(edge.target)
  }
  for (const [, targetIds] of lineBySource) {
    if (targetIds.length < 2) continue
    const xGroups: string[][] = []
    for (const id of targetIds) {
      const nx = nodeById.get(id)!.position.x
      const nwid = nodeSizes[id]?.width ?? 432
      let placed = false
      for (const grp of xGroups) {
        const firstId = grp[0]
        const fx = nodeById.get(firstId)!.position.x
        const fw = nodeSizes[firstId]?.width ?? 432
        if (nx < fx + fw && fx < nx + nwid) { grp.push(id); placed = true; break }
      }
      if (!placed) xGroups.push([id])
    }
    for (const grp of xGroups) {
      if (grp.length < 2) continue
      const sorted = grp
        .map(id => ({ id, y: renderY[id] ?? nodeById.get(id)!.position.y, h: nodeSizes[id]?.height ?? HEADER_H }))
        .sort((a, b) => a.y - b.y)
      for (let i = 1; i < sorted.length; i++) {
        const minY = sorted[i - 1].y + sorted[i - 1].h + 30
        const newY = Math.max(sorted[i].y, minY)
        sorted[i].y = newY
        renderY[sorted[i].id] = newY
      }
    }
  }

  // Pass 4: 가로 간격 확보 — 노드 단위 X-패킹 (Y-패킹을 90° 회전한 그리디)
  // 세로로 겹치는 두 노드가 가로로 H_GAP 이내로 붙으면 오른쪽 노드를 밀어냄.
  // 노드가 펼쳐져 넓어지면(표 등) 옆 노드가 실시간으로 밀리고, 접으면 원위치 복귀.
  // 세로로 겹치지 않는 노드(위아래로 이미 분리된)는 절대 밀지 않음 → 공간 낭비 없음
  const H_GAP = 60
  const renderX: Record<string, number> = {}
  const byX = [...nodes].sort((a, b) => a.position.x - b.position.x)
  for (const node of byX) {
    if (node.id === draggingNodeId) {
      // 드래그 중인 노드는 마우스 위치 그대로 (밀리지 않음, 밀 수는 있음)
      renderX[node.id] = node.position.x
      continue
    }
    const ny = renderY[node.id] ?? node.position.y
    const nH = nh(node)
    const nW = nw(node)
    let x = node.position.x
    let moved = true
    while (moved) {
      moved = false
      for (const other of byX) {
        const ox = renderX[other.id]  // 이미 배치된(왼쪽부터 처리) 노드만 존재
        if (ox === undefined || other.id === node.id) continue
        const oy = renderY[other.id] ?? other.position.y
        // 세로로 겹치는 노드끼리만 가로 gap 강제
        if (!(ny < oy + nh(other) && oy < ny + nH)) continue
        // 가로 구간이 (H_GAP 여유 포함) 겹치면 해당 노드 오른쪽으로 밀기
        if (x < ox + nw(other) + H_GAP && ox < x + nW + H_GAP) {
          x = ox + nw(other) + H_GAP
          moved = true
        }
      }
    }
    renderX[node.id] = x
  }

  return Object.fromEntries(nodes.map(n => [n.id, {
    x: renderX[n.id] ?? n.position.x,
    y: renderY[n.id] ?? n.position.y,
  }]))
}

const toolbarBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 3,
  padding: '3px 9px',
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
}

interface SelectionBox {
  x1: number; y1: number; x2: number; y2: number
}

const FONT_PRESETS = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]

export function Canvas({
  openSearchSignal,
  viewport, cursor, nativeWheelHandler,
  onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu,
  onSetViewport, graph, onUpdateNodePosition, onAutoSaveNodePosition, onUpdateNode, onAddNode, onDeleteNodes,
  onSetFontSize, onBumpFontSize, onSetFontSizeExact,
  onSetNodeWidth, onSetNodeHeight,
  onPushHistory, onUndo, onRedo, canUndo, canRedo,
  onToggleContent, onToggleOriginal,
  onAddEdge, onDeleteEdge, onDeleteEdges,
  onAddToggle, onUpdateToggle, onDeleteToggle, onExpandToggle, onDeleteOriginal,
  onAddOriginal, onAddLink, onDeleteLink, onOpenLink, onSetNodeTemplate,
  onCollapseAll, onExpandAll, onExpandNodes, onCollapseNodes, onExportHtml, onReload,
  imageUris, onSaveImage,
  onAddCanvasImage, onAddFilenameToNode, onSaveCanvasImage, onUpdateCanvasImage, onRemoveCanvasImage, onMoveCanvasImageToNode,
  lastAddedCanvasImageId,
}: CanvasProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({})
  const [fontDropOpen, setFontDropOpen] = useState(false)
  const fontInputRef = useRef<HTMLInputElement>(null)
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
  const selBoxRef = useRef<SelectionBox | null>(null)
  const panStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const [wireDrawing, setWireDrawing] = useState<{ srcId: string; srcPort: Port; curX: number; curY: number } | null>(null)
  const [wireHoverTarget, setWireHoverTarget] = useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [selectedEdgeId, _setSelectedEdgeId] = useState<string | null>(null)
  const selectedEdgeIdRef = useRef<string | null>(null)
  const setSelectedEdgeId = useCallback((id: string | null) => {
    selectedEdgeIdRef.current = id
    _setSelectedEdgeId(id)
  }, [])
  const lastToolbarInteractionRef = useRef<number>(0)

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
      console.log('[KB]', e.key, 'ctrl:', e.ctrlKey, 'meta:', e.metaKey, 'active:', active?.tagName, active?.id)
      if (active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT') {
        // Escape while editing a node field → blur + deselect
        if (e.key === 'Escape') {
          const inNode = !!(active as HTMLElement).closest('[data-node-id]')
          if (inNode) {
            e.preventDefault()
            ;(active as HTMLElement).blur()
            setSelectedIds(new Set())
            setSelectedCanvasImgIds(new Set())
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
      console.log('[KB] imgId:', imgId, 'clipboard:', canvasClipboardRef.current, 'selectedNodes:', selectedIdsRef.current.size)
      if ((e.ctrlKey || e.metaKey)) {
        if (imgId) {
          const img = canvasImagesRef.current?.find(ci => ci.id === imgId)
          console.log('[KB] found img:', img)
          if (e.key === 'c' && img) {
            canvasClipboardRef.current = { filename: img.filename, width: img.width, height: img.height }
            pasteBlockedRef.current = false
            console.log('[KB] Ctrl+C: clipboard set to', canvasClipboardRef.current)
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
          console.log('[KB] Ctrl+V: clipboard=', canvasClipboardRef.current, 'targetNode=', targetNodeId)

          // 1. 내부 canvas clipboard → 노드에 넣거나 캔버스에 클론
          if (canvasClipboardRef.current) {
            const clip = canvasClipboardRef.current
            if (targetNodeId) {
              // 노드가 선택/호버 중 → 파일명 직접 노드 이미지로 추가
              console.log('[KB] Ctrl+V: adding canvas image to node', targetNodeId)
              onAddFilenameToNode(targetNodeId, clip.filename, clip.width, clip.height)
            } else {
              // 배경 → 마우스 커서 위치에 클론 배치
              const vp = viewportRef.current
              const cx = (mousePosRef.current.x - vp.x) / vp.zoom
              const cy = (mousePosRef.current.y - vp.y) / vp.zoom
              console.log('[KB] Ctrl+V: placing clone at cursor', cx, cy)
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
            console.log('[KB] Ctrl+V system paste: nodeId=', nodeId)

            const handleBlob = (blob: Blob, mimeType: string) => {
              const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                if (nodeId) {
                  onSaveImage(nodeId, base64, ext, undefined, true)  // [[IMG:filename]] 을 content 끝에 추가
                } else {
                  const vp = viewportRef.current
                  const cx = (mousePosRef.current.x - vp.x) / vp.zoom
                  const cy = (mousePosRef.current.y - vp.y) / vp.zoom
                  console.log('[KB] paste to canvas background at', cx, cy)
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
              console.log('[KB] clipboard에 이미지 없음')
            } catch (err) {
              console.warn('[KB] clipboard.read() 실패:', err)
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

  const handleNodeHoverStart = useCallback((id: string) => { hoveredNodeIdRef.current = id }, [])
  const handleNodeHoverEnd = useCallback((id: string) => { if (hoveredNodeIdRef.current === id) hoveredNodeIdRef.current = null }, [])

  const handleCanvasPaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const ids = selectedIdsRef.current
    const nodeId = ids.size === 1 ? [...ids][0] : hoveredNodeIdRef.current
    console.log('[PASTE] fired. nodeId=', nodeId, 'clipboard=', canvasClipboardRef.current)

    // 내부 클립보드 우선: 노드를 타겟하지 않을 때 canvas image 클론
    if (!nodeId && canvasClipboardRef.current) {
      const clip = canvasClipboardRef.current
      const el = divRef.current
      console.log('[PASTE] internal clipboard hit, el=', !!el)
      if (el) {
        const { width: W, height: H } = el.getBoundingClientRect()
        const vp = viewportRef.current
        const cx = (W / 2 - vp.x) / vp.zoom
        const cy = (H / 2 - vp.y) / vp.zoom
        console.log('[PASTE] placing clone at', cx, cy)
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

  // 첫 템플릿 기본값
  useEffect(() => {
    const keys = Object.keys(graph.nodeTemplates)
    if (keys.length > 0 && !keys.includes(selectedTemplate)) setSelectedTemplate(keys[0])
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

  // Search: matching nodes for dropdown
  const searchMatchNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return [] as Array<{ id: string; title: string }>
    return graph.nodes
      .filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.content ?? '').toLowerCase().includes(q) ||
        (n.original?.text ?? '').toLowerCase().includes(q)
      )
      .map(n => ({ id: n.id, title: n.title }))
  }, [searchQuery, graph.nodes])

  const showSearchDropdown = searchOpen && searchQuery.trim() !== '' && searchSelectedId === null

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
    // Enter 확정: 선택된 노드만 expand, 나머지 매치 노드는 collapse
    for (const match of searchMatchNodes) {
      const node = graph.nodes.find(n => n.id === match.id)
      if (!node) continue
      if (match.id === id) {
        if (!node.contentExpanded) onToggleContent(node.id)
      } else {
        if (node.contentExpanded) onToggleContent(node.id)
      }
    }
    requestAnimationFrame(() => flyToNode(id))
  }, [flyToNode, searchMatchNodes, graph.nodes, onToggleContent])

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
    const toCanvas = (cx: number, cy: number) => ({
      x: (cx - viewport.x) / viewport.zoom,
      y: (cy - viewport.y) / viewport.zoom,
    })
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

  // 툴바: 노드 추가 — 현재 화면 중앙 근처의 빈 공간을 찾아 배치 (렌더 위치 기준 충돌 검사)
  const handleAddNode = useCallback(() => {
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
  }, [viewport, graph.nodes, onAddNode, selectedTemplate])

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

      {/* 상단 툴바 — mouseDown을 캔버스로 전파하지 않음 (폰트 컨트롤 클릭 시 선택 해제 방지) */}
      <div
        onMouseDown={(e) => { e.stopPropagation(); lastToolbarInteractionRef.current = Date.now() }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: '#f0f2f5',
          borderBottom: '1px solid #d1d5db',
          flexShrink: 0,
          zIndex: 200,
        }}>
        {/* Undo / Redo */}
        <button
          style={{ ...toolbarBtnStyle, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }}
          onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
        >↩ Undo</button>
        <button
          style={{ ...toolbarBtnStyle, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }}
          onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
        >Redo ↪</button>

        <div style={{ width: 1, height: 18, background: '#d1d5db', margin: '0 4px' }} />

        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          style={{
            background: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 3,
            fontSize: 11,
            padding: '2px 4px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {Object.entries(graph.nodeTemplates).map(([key, tmpl]) => (
            <option key={key} value={key}>{tmpl.label} ({tmpl.shape})</option>
          ))}
        </select>

        <button style={toolbarBtnStyle} onClick={handleAddNode}>+ Add Node</button>

        <div style={{ width: 1, height: 18, background: '#d1d5db', margin: '0 4px' }} />

        <button
          style={{
            ...toolbarBtnStyle,
            background: selCount > 0 ? '#dc4a2e' : '#ffffff',
            color: selCount > 0 ? '#ffffff' : '#9ca3af',
            borderColor: selCount > 0 ? '#b73a20' : '#d1d5db',
            opacity: selCount > 0 ? 1 : 0.5,
            cursor: selCount > 0 ? 'pointer' : 'default',
          }}
          onClick={handleDeleteSelected}
          disabled={selCount === 0}
        >
          Delete{selCount > 1 ? ` (${selCount})` : ''}
        </button>

        {selCount > 0 && (
          <>
            <div style={{ width: 1, height: 18, background: '#d1d5db', margin: '0 4px' }} />
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
                  style={{
                    background: '#fff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: 3, fontSize: 11, padding: '2px 4px', cursor: 'pointer', outline: 'none',
                  }}
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
                <div style={{ position: 'relative', display: 'inline-flex' }}>
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
                      width: 34, padding: '1px 4px', fontSize: 11, textAlign: 'center',
                      background: '#fff', color: '#374151', outline: 'none',
                      border: '1px solid #d1d5db', borderRight: 'none', borderRadius: '3px 0 0 3px',
                    }}
                    title="폰트 크기 (직접 입력 후 Enter)"
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setFontDropOpen(o => !o) }}
                    style={{
                      width: 16, padding: 0, fontSize: 9, cursor: 'pointer', lineHeight: 1,
                      background: '#f0f0f0', color: '#333',
                      border: '1px solid #d1d5db', borderRadius: '0 3px 3px 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▾</button>
                  {fontDropOpen && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: '100%', left: 0, zIndex: 9999,
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

        <div style={{ width: 1, height: 18, background: '#d1d5db', margin: '0 4px' }} />
        <button
          style={toolbarBtnStyle}
          onClick={() => {
            const ids = [...selectedIdsRef.current]
            if (ids.length > 0) onCollapseNodes(ids)
            else onCollapseAll()
          }}
          title={selCount > 0 ? 'Collapse selected nodes' : 'Collapse all nodes'}
        >Collapse↑</button>
        <button
          style={toolbarBtnStyle}
          onClick={() => {
            const ids = [...selectedIdsRef.current]
            if (ids.length > 0) onExpandNodes(ids)
            else onExpandAll()
          }}
          title={selCount > 0 ? 'Expand selected nodes' : 'Expand all nodes'}
        >Expand↓</button>
        <button style={toolbarBtnStyle} onClick={handleFitView} title="Fit all nodes into view">Fit View</button>

        <div style={{ width: 1, height: 18, background: '#d1d5db', margin: '0 4px' }} />
        <button
          style={toolbarBtnStyle}
          onClick={() => {
            const redundant = findRedundantEdges(graph.edges)
            if (redundant.length > 0) onDeleteEdges(redundant)
          }}
          title="Remove redundant edges (transitive reduction): if A→B→C exists, remove A→C"
        >Reduce Edges</button>
        <button
          style={{ ...toolbarBtnStyle, background: '#15803d', color: '#ffffff', borderColor: '#166534' }}
          onClick={onExportHtml}
          title="Export as HTML"
        >Export HTML</button>

        <div style={{ flex: 1 }} />
        <button
          style={{ ...toolbarBtnStyle, fontFamily: 'monospace' }}
          onClick={onReload}
          title="Reload from disk (re-reads the JSON file — use after an external agent edits it)"
        >↺ Reload</button>
        <span style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap' }}>
          Left-drag: pan · Click: deselect · Scroll: zoom · Right-drag: select
        </span>
      </div>

      {/* 캔버스 */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div
          ref={divRef}
          tabIndex={0}
          style={{
            width: '100%', height: '100%',
            overflow: 'hidden', position: 'relative',
            background: 'var(--vscode-editor-background)',
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
                  onSetNodeTemplate={onSetNodeTemplate}
                  imageUris={imageUris}
                  onSaveImage={onSaveImage}
                  canvasClipboardRef={canvasClipboardRef}
                  onAddFilenameToNode={onAddFilenameToNode}
                  isSearchMatch={searchSelectedId === null && searchMatchNodes.some(m => m.id === node.id)}
                  isActiveSearchMatch={node.id === searchSelectedId}
                  onNodeDragActivate={setDraggingNodeId}
                  onNodeDragDeactivate={() => setDraggingNodeId(null)}
                />
              )
            })}
            <WireLayer
              nodes={graph.nodes}
              edges={graph.edges}
              nodeSizes={nodeSizes}
              renderPositions={renderPositions}
              wirePreview={wireDrawing}
              wireHoverTargetId={wireHoverTarget}
              selectedEdgeId={selectedEdgeId}
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
