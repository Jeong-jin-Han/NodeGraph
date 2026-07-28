import { useState, useCallback, useRef } from 'react'
import { NodeGraph, GraphNode, NodeLink, CanvasImage } from '../types/graph'

function insertImgTokenInCell(content: string, tableIdx: number, rowIdx: number, colIdx: number, filename: string): string {
  const lines = content.split('\n')
  let tableCount = 0
  let i = 0

  while (i < lines.length) {
    const isStart =
      /^\s*\|/.test(lines[i]) &&
      lines[i].indexOf('|', 1) !== -1 &&
      i + 1 < lines.length &&
      /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1]) &&
      !/[a-zA-Z0-9]/.test(lines[i + 1])

    if (!isStart) { i++; continue }

    if (tableCount < tableIdx) {
      tableCount++
      while (i < lines.length && /^\s*\|/.test(lines[i])) i++
      continue
    }

    // rowIdx 0 = header, 1+ = data rows (skip separator at i+1)
    const targetLineIdx = rowIdx === 0 ? i : i + rowIdx + 1
    if (targetLineIdx < lines.length && /^\s*\|/.test(lines[targetLineIdx])) {
      const cells = lines[targetLineIdx]
        .replace(/^\s*\|/, '').replace(/\|\s*$/, '')
        .split('|').map(s => s.trim())
      while (cells.length <= colIdx) cells.push('')
      const token = `[[IMG:${filename}]]`
      cells[colIdx] = cells[colIdx] ? `${cells[colIdx]} ${token}` : token
      lines[targetLineIdx] = '| ' + cells.join(' | ') + ' |'
    }
    break
  }

  return lines.join('\n')
}

declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void
  getState: () => unknown
  setState: (state: unknown) => void
}

const vscode = acquireVsCodeApi()
const MAX_HISTORY = 50

// --- Hop-based initial position for a newly-connected child node -----------------------
// Triggered when a wire is drawn (addEdge). Saved positions are otherwise never rewritten
// (see computeRenderPositions in Canvas.tsx) — this only sets the *starting* position for a
// node the moment it becomes a child; the user can freely drag it afterward like any node.
//
// Rule (confirmed with the user):
// - A direct child of a main_topic (backbone) node is "hop 1". Hop-1 children fan out to
//   both sides of their parent — right first, left once the right side has HOP1_RIGHT_CAP
//   children — and stack around the parent's vertical center.
// - Anything deeper (hop 2+) is not re-split: it inherits whichever side its own direct
//   parent already sits on (relative to the nearest backbone ancestor) and keeps extending
//   the same direction, one HOP_X_OFFSET further out per level — which is also what keeps a
//   long hop-2+ chain from overlapping the hop-1 cluster near the backbone.
const HOP_X_OFFSET = 750
const HOP1_Y_SPACING = 150
const HOPN_Y_SPACING = 90
const HOP1_RIGHT_CAP = 4

// main_topic(백본) 여부는 template의 shape가 아니라 template 키 자체로 판별해야 함 —
// Method/Result/Claim도 "paper-derived fact"를 나타내려고 shape:'sharp'를 쓰지만
// 구조적으로는 main_topic의 평범한 hop 자식일 뿐, 별도 백본/루트가 아니다.
export function isMainTopicNode(g: NodeGraph, node: GraphNode): boolean {
  return node.template === 'main_topic'
}

function nextNodeId(g: NodeGraph): string {
  const nums = g.nodes.map(n => parseInt(n.id.replace('node_', ''), 10)).filter(n => !isNaN(n))
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `node_${String(nextNum).padStart(3, '0')}`
}

// 화살표는 main topic(백본) 사이의 순서 연결에만 쓰고, 그 외(부모→hop 자식) 연결은
// 전부 화살표 없는 평범한 직선으로 — 사용자 요청: "main topic 간에 대해서만 화살표를
// 사용하게 하고, 그 자식간에 대해서는 그냥 평범한 직선으로".
function edgeTypeFor(g: NodeGraph, sourceId: string, targetId: string): 'arrow' | 'line' {
  const src = g.nodes.find(n => n.id === sourceId)
  const tgt = g.nodes.find(n => n.id === targetId)
  return (src && tgt && isMainTopicNode(g, src) && isMainTopicNode(g, tgt)) ? 'arrow' : 'line'
}

export function childIdsOf(g: NodeGraph, nodeId: string): string[] {
  return [...new Set([
    ...(g.nodes.find(n => n.id === nodeId)?.children ?? []),
    ...g.edges.filter(e => e.source === nodeId).map(e => e.target),
  ])]
}

export function parentIdOf(g: NodeGraph, nodeId: string): string | null {
  const byChildren = g.nodes.find(n => n.children.includes(nodeId))
  if (byChildren) return byChildren.id
  const byEdge = g.edges.find(e => e.target === nodeId)
  return byEdge ? byEdge.source : null
}

// Walks up from `fromId` to the nearest main_topic ancestor, returning which side of that
// ancestor fromId's own branch sits on (1 = right, -1 = left). Null if there is no backbone
// ancestor (fromId is itself a root/main_topic, or the chain is broken).
export function findBackboneSide(g: NodeGraph, fromId: string): 1 | -1 | null {
  let branch = fromId
  let current = fromId
  const visited = new Set<string>()
  for (let i = 0; i < g.nodes.length + 1; i++) {
    if (visited.has(current)) return null
    visited.add(current)
    const node = g.nodes.find(n => n.id === current)
    if (!node) return null
    if (isMainTopicNode(g, node)) {
      if (current === fromId) return null // fromId is itself the backbone — caller decides the side
      const branchNode = g.nodes.find(n => n.id === branch)!
      return branchNode.position.x >= node.position.x ? 1 : -1
    }
    const parentId = parentIdOf(g, current)
    if (!parentId) return null
    branch = current
    current = parentId
  }
  return null
}

export function computeHopPosition(g: NodeGraph, parentId: string): { x: number; y: number } | null {
  const parent = g.nodes.find(n => n.id === parentId)
  if (!parent) return null
  const existingChildren = childIdsOf(g, parentId)

  if (isMainTopicNode(g, parent)) {
    let rightCount = 0, leftCount = 0
    for (const id of existingChildren) {
      const n = g.nodes.find(x => x.id === id)
      if (!n) continue
      if (n.position.x >= parent.position.x) rightCount++
      else leftCount++
    }
    const sign: 1 | -1 = rightCount < HOP1_RIGHT_CAP ? 1 : -1
    const sideCount = sign === 1 ? rightCount : leftCount
    // Fan out around the parent's vertical center: 0, +1, -1, +2, -2, ...
    const slot = Math.ceil(sideCount / 2) * (sideCount % 2 === 0 ? -1 : 1)
    return {
      x: parent.position.x + sign * HOP_X_OFFSET,
      y: parent.position.y + slot * HOP1_Y_SPACING,
    }
  }

  const sign = findBackboneSide(g, parentId) ?? 1
  return {
    x: parent.position.x + sign * HOP_X_OFFSET,
    y: parent.position.y + existingChildren.length * HOPN_Y_SPACING,
  }
}

export function useGraph() {
  const [graph, setGraphState] = useState<NodeGraph | null>(null)
  const [imageUris, setImageUris] = useState<Record<string, string>>({})
  const isDirtyRef = useRef(false)
  const historyRef = useRef<NodeGraph[]>([])
  const futureRef = useRef<NodeGraph[]>([])
  const pendingImagePositionRef = useRef<Map<string, { position?: number; toggleId?: string }>>(new Map())
  const pendingCanvasImageRef = useRef<{ x: number; y: number } | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [lastAddedCanvasImageId, setLastAddedCanvasImageId] = useState<string | null>(null)

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  // message 핸들러 — useEffect 밖으로 꺼내서 클린업 없이 등록
  const handlerRef = useRef<((e: MessageEvent) => void) | null>(null)
  if (!handlerRef.current) {
    handlerRef.current = (event: MessageEvent) => {
      const msg = event.data
      if (msg.type === 'load') {
        historyRef.current = []
        futureRef.current = []
        setGraphState(msg.data)
        setImageUris(msg.imageUris ?? {})
        setCanUndo(false)
        setCanRedo(false)
        isDirtyRef.current = false
      } else if (msg.type === 'externalChange') {
        if (isDirtyRef.current) {
          if (confirm('The file was changed externally. Reload?')) {
            historyRef.current = []
            futureRef.current = []
            setGraphState(msg.data)
            setImageUris(msg.imageUris ?? {})
            setCanUndo(false)
            setCanRedo(false)
            isDirtyRef.current = false
          }
        } else {
          setGraphState(msg.data)
          setImageUris(msg.imageUris ?? {})
        }
      } else if (msg.type === 'imageSaved') {
        setImageUris(prev => ({ ...prev, [msg.filename]: msg.webviewUri }))
        if (msg.nodeId === '__canvas__') {
          const pos = pendingCanvasImageRef.current ?? { x: 0, y: 0 }
          pendingCanvasImageRef.current = null
          const newId = `cimg_${Date.now()}`
          setLastAddedCanvasImageId(newId)
          setGraphState(prev => {
            if (!prev) return prev
            isDirtyRef.current = true
            const ci: CanvasImage = {
              id: newId,
              filename: msg.filename,
              position: pos,
              width: 400,
              height: 300,
            }
            return { ...prev, canvasImages: [...(prev.canvasImages ?? []), ci] }
          })
        } else {
          const pending = pendingImagePositionRef.current.get(msg.nodeId)
          pendingImagePositionRef.current.delete(msg.nodeId)
          const { position, toggleId } = pending ?? {}
          const token = `[[IMG:${msg.filename}]]`
          const insertToken = (text: string) => {
            if (position === undefined) return text + (text.trim() ? '\n' : '') + token
            const before = text.slice(0, position)
            const after = text.slice(position)
            // Pasting right after a markdown table row's closing `|` would otherwise splice
            // the token in as a dangling extra cell — drop it as its own paragraph instead.
            if (/\|\s*$/.test(before)) return `${before}\n\n${token}\n\n${after}`
            return before + token + after
          }
          setGraphState(prev => {
            if (!prev) return prev
            historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev]
            futureRef.current = []
            isDirtyRef.current = true
            return {
              ...prev,
              nodes: prev.nodes.map(n => {
                if (n.id !== msg.nodeId) return n
                if (toggleId) {
                  return {
                    ...n,
                    toggleItems: (n.toggleItems ?? []).map(t => t.id !== toggleId ? t : {
                      ...t,
                      content: insertToken(t.content ?? ''),
                    }),
                  }
                }
                return { ...n, contentExpanded: true, content: insertToken(n.content ?? '') }
              }),
            }
          })
        }
      }
    }
    window.addEventListener('message', handlerRef.current)
    vscode.postMessage({ type: 'ready' })
  }

  // 상태 변경 + 히스토리 저장 여부 선택
  const setGraph = useCallback((updater: (prev: NodeGraph) => NodeGraph, saveHistory = false) => {
    setGraphState(prev => {
      if (!prev) return prev
      if (saveHistory) {
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev]
        futureRef.current = []
      }
      isDirtyRef.current = true
      return updater(prev)
    })
    if (saveHistory) updateHistoryState()
  }, [updateHistoryState])

  // 드래그 시작 전에 현재 상태를 히스토리에 저장
  const pushHistory = useCallback(() => {
    setGraphState(current => {
      if (!current) return current
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), current]
      futureRef.current = []
      return current
    })
    updateHistoryState()
  }, [updateHistoryState])

  const undo = useCallback(() => {
    if (!historyRef.current.length) return
    const prev = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    setGraphState(current => {
      if (current) futureRef.current = [current, ...futureRef.current.slice(0, MAX_HISTORY - 1)]
      isDirtyRef.current = true
      return prev
    })
    updateHistoryState()
  }, [updateHistoryState])

  const redo = useCallback(() => {
    if (!futureRef.current.length) return
    const next = futureRef.current[0]
    futureRef.current = futureRef.current.slice(1)
    setGraphState(current => {
      if (current) historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), current]
      isDirtyRef.current = true
      return next
    })
    updateHistoryState()
  }, [updateHistoryState])

  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, position: { x, y }, nodeNaturalY: y } : n) }))
  }, [setGraph])

  // Auto-save pushed position without changing nodeNaturalY (prevents delta compounding)
  const autoSaveNodePosition = useCallback((id: string, x: number, y: number) => {
    setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, position: { x, y } } : n) }))
  }, [setGraph])

  const toggleContent = useCallback((id: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id === id ? { ...n, contentExpanded: !n.contentExpanded, originalExpanded: false } : n),
    }), true)
  }, [setGraph])

  const toggleOriginal = useCallback((id: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id === id ? { ...n, originalExpanded: !n.originalExpanded } : n),
    }), true)
  }, [setGraph])

  const updateNodeField = useCallback((id: string, field: string, value: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => {
        if (n.id !== id) return n
        switch (field) {
          case 'title':         return { ...n, title: value }
          case 'content':       return { ...n, content: value }
          case 'originalText':  return { ...n, original: { ...(n.original ?? { location: '' }), text: value } }
          case 'originalLoc':   return { ...n, original: { ...(n.original ?? { text: '' }), location: value } }
          case 'originalTitle': return { ...n, original: { ...(n.original ?? { text: '', location: '' }), title: value } }
          default: return n
        }
      }),
    }), true)
  }, [setGraph])

  const addNode = useCallback((x: number, y: number, templateKey?: string) => {
    setGraph(g => {
      const id = nextNodeId(g)
      const resolved = (templateKey && g.nodeTemplates[templateKey]) ? templateKey : Object.keys(g.nodeTemplates)[0] ?? 'memo'
      return {
        ...g,
        nodes: [...g.nodes, {
          id, template: resolved, title: 'New Node', content: '',
          contentExpanded: false, originalExpanded: false, childrenExpanded: false,
          position: { x, y }, children: [], links: [],
        }],
      }
    }, true)
  }, [setGraph])

  // 선택된 노드의 자식으로 새 노드를 추가 — 위치 계산은 addEdge가 기존 노드를 처음
  // 연결할 때 쓰는 computeHopPosition을 그대로 재사용해서, "새 노드를 추가해도 grid에
  // 맞춰 자동 정렬되지 않는다"는 문제를 별도 정렬 로직 없이 기존 hop 배치 방식 하나로만
  // 해결한다(사용자 요청: "정렬 방식은 이전에 내가 언급했던 방식만으로"). 노드 생성과
  // 엣지 생성을 하나의 setGraph 호출로 묶어 undo가 한 번에 되도록 함.
  const addChildNode = useCallback((parentId: string, templateKey?: string) => {
    setGraph(g => {
      const parent = g.nodes.find(n => n.id === parentId)
      if (!parent) return g
      const id = nextNodeId(g)
      const resolved = (templateKey && g.nodeTemplates[templateKey]) ? templateKey : Object.keys(g.nodeTemplates)[0] ?? 'memo'
      const pos = computeHopPosition(g, parentId) ?? { x: parent.position.x + HOP_X_OFFSET, y: parent.position.y }
      const newNode: GraphNode = {
        id, template: resolved, title: 'New Node', content: '',
        contentExpanded: false, originalExpanded: false, childrenExpanded: false,
        position: pos, children: [], links: [],
      }
      const edgeId = `edge_${Date.now()}`
      const edgeType = edgeTypeFor({ ...g, nodes: [...g.nodes, newNode] }, parentId, id)
      return {
        ...g,
        nodes: [...g.nodes, newNode],
        edges: [...g.edges, { id: edgeId, source: parentId, target: id, type: edgeType, label: '' }],
      }
    }, true)
  }, [setGraph])

  const deleteNodes = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setGraph(g => ({
      ...g,
      nodes: g.nodes.filter(n => !idSet.has(n.id)).map(n => ({ ...n, children: n.children.filter(c => !idSet.has(c)) })),
      edges: g.edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target)),
    }), true)
  }, [setGraph])

  const addEdge = useCallback((sourceId: string, targetId: string, type?: 'arrow' | 'line') => {
    setGraph(g => {
      if (g.edges.some(e => e.source === sourceId && e.target === targetId)) return g
      const id = `edge_${Date.now()}`
      const resolvedType = type ?? edgeTypeFor(g, sourceId, targetId)
      const edges = [...g.edges, { id, source: sourceId, target: targetId, type: resolvedType, label: '' }]
      // Reposition the target using hop-based placement, as if it's a fresh child of source —
      // only meaningful the first time a node gets a parent; leave it alone if it already has one.
      // Also skip if the target is itself a main_topic (backbone) node — connecting two backbone
      // nodes is a sequence link, not a hop-1 relationship, and must never move the target off
      // its own backbone position.
      const targetNode = g.nodes.find(n => n.id === targetId)
      const alreadyHasParent = parentIdOf(g, targetId) !== null
      const targetIsMainTopic = !!targetNode && isMainTopicNode(g, targetNode)
      const newPos = (alreadyHasParent || targetIsMainTopic) ? null : computeHopPosition(g, sourceId)
      const nodes = newPos
        ? g.nodes.map(n => n.id === targetId ? { ...n, position: newPos, nodeNaturalY: newPos.y } : n)
        : g.nodes
      return { ...g, edges, nodes }
    }, true)
  }, [setGraph])

  const deleteEdge = useCallback((id: string) => {
    setGraph(g => ({ ...g, edges: g.edges.filter(e => e.id !== id) }), true)
  }, [setGraph])

  const addToggle = useCallback((nodeId: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        toggleItems: [...(n.toggleItems ?? []), { id: `toggle_${Date.now()}`, title: '', content: '', expanded: true }],
      }),
    }), true)
  }, [setGraph])

  const updateToggle = useCallback((nodeId: string, toggleId: string, field: 'title' | 'content', value: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        toggleItems: (n.toggleItems ?? []).map(t => t.id !== toggleId ? t : { ...t, [field]: value }),
      }),
    }), true)
  }, [setGraph])

  const deleteOriginal = useCallback((nodeId: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : { ...n, original: undefined, originalExpanded: false }),
    }), true)
  }, [setGraph])

  const deleteToggle = useCallback((nodeId: string, toggleId: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        toggleItems: (n.toggleItems ?? []).filter(t => t.id !== toggleId),
      }),
    }), true)
  }, [setGraph])

  const expandToggle = useCallback((nodeId: string, toggleId: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        toggleItems: (n.toggleItems ?? []).map(t => t.id !== toggleId ? t : { ...t, expanded: !t.expanded }),
      }),
    }))  // 히스토리 저장 안 함 (UI 상태)
  }, [setGraph])

  const setNodeWidth = useCallback((id: string, width: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== id ? n : { ...n, nodeWidth: Math.max(160, Math.round(width)) }),
    }))
  }, [setGraph])

  const setNodeHeight = useCallback((id: string, height: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== id ? n : { ...n, nodeHeight: Math.max(60, Math.round(height)) }),
    }))
  }, [setGraph])

  // 드래그 중 폰트 사이즈 적용 (히스토리 저장 안 함, pushHistory를 드래그 시작 전에 호출)
  const setNodeFontSize = useCallback((id: string, size: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id === id ? { ...n, fontSize: Math.max(8, Math.min(72, size)) } : n),
    }))
  }, [setGraph])

  // 툴바 +/- or delta (히스토리 저장), 각 노드의 현재 크기에서 delta만큼 이동 (비율 유지)
  const bumpFontSize = useCallback((ids: string[], delta: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n =>
        ids.includes(n.id) ? { ...n, fontSize: Math.max(8, Math.min(72, (n.fontSize ?? 14) + delta)) } : n
      ),
    }), true)
  }, [setGraph])

  // 직접 입력 / 프리셋 선택으로 폰트 사이즈 지정 (히스토리 저장)
  const setFontSizeExact = useCallback((ids: string[], size: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n =>
        ids.includes(n.id) ? { ...n, fontSize: Math.max(8, Math.min(72, Math.round(size))) } : n
      ),
    }), true)
  }, [setGraph])


  const saveImage = useCallback((nodeId: string, base64: string, ext = 'png', position?: number, toggleId?: string) => {
    pendingImagePositionRef.current.set(nodeId, { position, toggleId })
    vscode.postMessage({ type: 'saveImage', nodeId, data: base64, ext })
  }, [])

  const addCanvasImage = useCallback((ci: CanvasImage) => {
    setGraph(g => ({ ...g, canvasImages: [...(g.canvasImages ?? []), ci] }), true)
  }, [setGraph])

  const addFilenameToNode = useCallback((nodeId: string, filename: string, width?: number, height?: number) => {
    setGraphState(prev => {
      if (!prev) return prev
      isDirtyRef.current = true
      const token = (width && height) ? `[[IMG:${filename}:${Math.round(width)}x${Math.round(height)}]]` : `[[IMG:${filename}]]`
      const updated: NodeGraph = {
        ...prev,
        nodes: prev.nodes.map(n => n.id !== nodeId ? n : {
          ...n,
          contentExpanded: true,
          // 이미 content에 동일 토큰이 있으면 중복 추가하지 않음
          content: (n.content ?? '').includes(token)
            ? n.content
            : (n.content ? `${n.content}\n${token}` : token),
        }),
      }
      vscode.postMessage({ type: 'save', data: updated })
      return updated
    })
  }, [])

  const saveCanvasImage = useCallback((base64: string, ext = 'png', x: number, y: number) => {
    pendingCanvasImageRef.current = { x, y }
    vscode.postMessage({ type: 'saveImage', nodeId: '__canvas__', data: base64, ext })
  }, [])

  const updateCanvasImage = useCallback((id: string, updates: Partial<CanvasImage>) => {
    setGraph(g => ({
      ...g,
      canvasImages: (g.canvasImages ?? []).map(ci => ci.id === id ? { ...ci, ...updates } : ci),
    }))
  }, [setGraph])

  const removeCanvasImage = useCallback((id: string) => {
    setGraph(g => ({ ...g, canvasImages: (g.canvasImages ?? []).filter(ci => ci.id !== id) }), true)
  }, [setGraph])

  const moveCanvasImageToNode = useCallback((imgId: string, nodeId: string, tableCell?: { tableIdx: number; rowIdx: number; colIdx: number }) => {
    setGraph(g => {
      const ci = (g.canvasImages ?? []).find(c => c.id === imgId)
      if (!ci) return g
      const targetNode = g.nodes.find(n => n.id === nodeId)
      if (!targetNode) return g
      const token = `[[IMG:${ci.filename}]]`
      const newContent = tableCell
        ? insertImgTokenInCell(targetNode.content, tableCell.tableIdx, tableCell.rowIdx, tableCell.colIdx, ci.filename)
        : (targetNode.content ? `${targetNode.content}\n${token}` : token)
      return {
        ...g,
        canvasImages: (g.canvasImages ?? []).filter(c => c.id !== imgId),
        nodes: g.nodes.map(n => n.id !== nodeId ? n : {
          ...n,
          content: newContent,
          contentExpanded: true,
        }),
      }
    }, true)
  }, [setGraph])


  // stopAtMain=true: main_topic 템플릿 자식은 건너뜀 (펼치기 전용)
  function getAllDescendants(g: NodeGraph, nodeId: string, visited = new Set<string>(), stopAtMain = false): string[] {
    if (visited.has(nodeId)) return []
    visited.add(nodeId)
    const node = g.nodes.find(n => n.id === nodeId)
    if (!node) return []
    const result: string[] = [nodeId]
    const childIds = new Set([
      ...node.children,
      ...g.edges.filter(e => e.source === nodeId).map(e => e.target),
    ])
    for (const childId of childIds) {
      if (stopAtMain) {
        const childNode = g.nodes.find(n => n.id === childId)
        if (childNode?.template === 'main_topic') continue  // main_topic 자식은 펼치기에서 제외
      }
      result.push(...getAllDescendants(g, childId, visited, stopAtMain))
    }
    return result
  }

  const collapseAll = useCallback(() => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => ({ ...n, contentExpanded: false, originalExpanded: false })),
    }), true)
  }, [setGraph])

  const expandAll = useCallback(() => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => ({ ...n, contentExpanded: true })),
    }), true)
  }, [setGraph])

  // 선택 노드 + 하위 노드 일괄 접기/펼치기 (펼치기 시 main_topic 자식 제외)
  // outgoing edges 뿐 아니라, 이 노드를 향하는 incoming edge의 non-main 소스도 포함
  const expandNodes = useCallback((ids: string[]) => {
    setGraph(g => {
      const isMain = (n: GraphNode) => n.template === 'main_topic'

      function getExpandDesc(nodeId: string, visited = new Set<string>()): string[] {
        if (visited.has(nodeId)) return []
        visited.add(nodeId)
        const node = g.nodes.find(n => n.id === nodeId)
        if (!node) return []
        const result: string[] = [nodeId]
        const childIds = new Set([
          ...node.children,
          ...g.edges.filter(e => e.source === nodeId).map(e => e.target),
          // non-main 노드가 이 노드를 향하는 incoming edge도 포함 (다중 부모 sub-node 지원)
          ...g.edges.filter(e => e.target === nodeId).map(e => e.source).filter(srcId => {
            const src = g.nodes.find(n => n.id === srcId)
            return src && !isMain(src)
          }),
        ])
        for (const childId of childIds) {
          const child = g.nodes.find(n => n.id === childId)
          if (child && isMain(child)) continue
          result.push(...getExpandDesc(childId, visited))
        }
        return result
      }

      const toExpand = new Set<string>()
      for (const id of ids) getExpandDesc(id).forEach(d => toExpand.add(d))
      return { ...g, nodes: g.nodes.map(n => toExpand.has(n.id) ? { ...n, contentExpanded: true } : n) }
    }, true)
  }, [setGraph])

  const collapseNodes = useCallback((ids: string[]) => {
    setGraph(g => {
      const toCollapse = new Set<string>()
      for (const id of ids) getAllDescendants(g, id).forEach(d => toCollapse.add(d))
      return { ...g, nodes: g.nodes.map(n => toCollapse.has(n.id) ? { ...n, contentExpanded: false, originalExpanded: false } : n) }
    }, true)
  }, [setGraph])

  // 라벨 필터: 선택된 template 노드만 펼치고 나머지는 강제로 접음 (부모/자식 관계 무시)
  const expandByLabel = useCallback((template: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.template === template
        ? { ...n, contentExpanded: true }
        : { ...n, contentExpanded: false, originalExpanded: false }),
    }), true)
  }, [setGraph])

  const setNodeTemplate = useCallback((id: string, template: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== id ? n : { ...n, template }),
    }), true)
  }, [setGraph])

  const addOriginal = useCallback((nodeId: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        original: { text: '', location: '' },
        originalExpanded: true,
        contentExpanded: true,
      }),
    }), true)
  }, [setGraph])

  const addLink = useCallback((nodeId: string, link: NodeLink) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : { ...n, links: [...n.links, link] }),
    }), true)
  }, [setGraph])

  const deleteLink = useCallback((nodeId: string, linkIdx: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        links: n.links.filter((_, i) => i !== linkIdx),
      }),
    }), true)
  }, [setGraph])

  const openLink = useCallback((link: NodeLink) => {
    vscode.postMessage({ type: 'openLink', link })
  }, [])

  const searchInPdf = useCallback((query: string, pageHint?: number) => {
    setGraphState(current => {
      if (current?.source?.pdf) {
        vscode.postMessage({ type: 'searchInPdf', pdfTarget: current.source.pdf, query, pageHint })
      }
      return current
    })
  }, [])

  const exportHtml = useCallback(() => {
    setGraphState(current => {
      if (current) vscode.postMessage({ type: 'exportHtml', data: current })
      return current
    })
  }, [])

  const saveGraph = useCallback(() => {
    setGraphState(current => {
      if (current) { vscode.postMessage({ type: 'save', data: current }); isDirtyRef.current = false }
      return current
    })
  }, [])

  const reload = useCallback(() => {
    vscode.postMessage({ type: 'reload' })
  }, [])

  const openHelp = useCallback(() => {
    vscode.postMessage({ type: 'openHelp' })
  }, [])

  return {
    graph, imageUris,
    updateNodePosition, autoSaveNodePosition, toggleContent, toggleOriginal,
    updateNodeField, addNode, addChildNode, deleteNodes, addEdge, deleteEdge,
    addToggle, updateToggle, deleteToggle, expandToggle, deleteOriginal,
    saveImage,
    setNodeWidth, setNodeHeight, setNodeFontSize, bumpFontSize, setFontSizeExact, pushHistory,
    collapseAll, expandAll, expandNodes, collapseNodes, expandByLabel, setNodeTemplate, addOriginal, addLink, deleteLink, openLink, searchInPdf, exportHtml,
    undo, redo, canUndo, canRedo,
    saveGraph, setGraph, reload, openHelp,
    addCanvasImage, addFilenameToNode, saveCanvasImage, updateCanvasImage, removeCanvasImage, moveCanvasImageToNode,
    lastAddedCanvasImageId,
  }
}
