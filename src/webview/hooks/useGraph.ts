import { useState, useCallback, useRef } from 'react'
import { NodeGraph, NodeLink } from '../types/graph'

declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void
  getState: () => unknown
  setState: (state: unknown) => void
}

const vscode = acquireVsCodeApi()
const MAX_HISTORY = 50

export function useGraph() {
  const [graph, setGraphState] = useState<NodeGraph | null>(null)
  const [imageUris, setImageUris] = useState<Record<string, string>>({})
  const isDirtyRef = useRef(false)
  const historyRef = useRef<NodeGraph[]>([])
  const futureRef = useRef<NodeGraph[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

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
        setGraphState(prev => {
          if (!prev) return prev
          historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev]
          futureRef.current = []
          isDirtyRef.current = true
          return {
            ...prev,
            nodes: prev.nodes.map(n => n.id !== msg.nodeId ? n : {
              ...n,
              contentExpanded: true,
              images: [...n.images, { filename: msg.filename, caption: '', source: 'user' as const }],
            }),
          }
        })
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
      const nums = g.nodes.map(n => parseInt(n.id.replace('node_', ''), 10)).filter(n => !isNaN(n))
      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
      const id = `node_${String(nextNum).padStart(3, '0')}`
      const resolved = (templateKey && g.nodeTemplates[templateKey]) ? templateKey : Object.keys(g.nodeTemplates)[0] ?? 'memo'
      return {
        ...g,
        nodes: [...g.nodes, {
          id, template: resolved, title: 'New Node', content: '',
          contentExpanded: false, originalExpanded: false, childrenExpanded: false,
          position: { x, y }, children: [], images: [], links: [],
        }],
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

  const addEdge = useCallback((sourceId: string, targetId: string, type: 'arrow' | 'line' = 'arrow') => {
    setGraph(g => {
      if (g.edges.some(e => e.source === sourceId && e.target === targetId)) return g
      const id = `edge_${Date.now()}`
      return { ...g, edges: [...g.edges, { id, source: sourceId, target: targetId, type, label: '' }] }
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

  // 드래그 중 폰트 사이즈 적용 (히스토리 저장 안 함, pushHistory를 드래그 시작 전에 호출)
  const setNodeFontSize = useCallback((id: string, size: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id === id ? { ...n, fontSize: Math.max(8, Math.min(32, size)) } : n),
    }))
  }, [setGraph])

  // 툴바 +/- 버튼 (히스토리 저장)
  const bumpFontSize = useCallback((ids: string[], delta: number) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n =>
        ids.includes(n.id) ? { ...n, fontSize: Math.max(8, Math.min(32, (n.fontSize ?? 14) + delta)) } : n
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


  const saveImage = useCallback((nodeId: string, base64: string, ext = 'png') => {
    vscode.postMessage({ type: 'saveImage', nodeId, data: base64, ext })
  }, [])

  const deleteImage = useCallback((nodeId: string, filename: string) => {
    setGraph(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id !== nodeId ? n : {
        ...n,
        images: n.images.filter(img => img.filename !== filename),
      }),
    }), true)
  }, [setGraph])

  function getAllDescendants(g: NodeGraph, nodeId: string): string[] {
    const node = g.nodes.find(n => n.id === nodeId)
    if (!node) return []
    const result: string[] = [nodeId]
    for (const childId of node.children) {
      result.push(...getAllDescendants(g, childId))
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

  // 선택 노드 + 하위 노드 일괄 접기/펼치기
  const expandNodes = useCallback((ids: string[]) => {
    setGraph(g => {
      const toExpand = new Set<string>()
      for (const id of ids) getAllDescendants(g, id).forEach(d => toExpand.add(d))
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

  return {
    graph, imageUris,
    updateNodePosition, toggleContent, toggleOriginal,
    updateNodeField, addNode, deleteNodes, addEdge, deleteEdge,
    addToggle, updateToggle, deleteToggle, expandToggle, deleteOriginal,
    saveImage, deleteImage,
    setNodeWidth, setNodeFontSize, bumpFontSize, setFontSizeExact, pushHistory,
    collapseAll, expandAll, expandNodes, collapseNodes, setNodeTemplate, addOriginal, addLink, deleteLink, openLink, exportHtml,
    undo, redo, canUndo, canRedo,
    saveGraph, setGraph,
  }
}
