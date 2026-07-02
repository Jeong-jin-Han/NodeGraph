import React, { useState, useCallback, useMemo, useRef, useEffect, CSSProperties } from 'react'
import { NodeGraph, GraphNode, Viewport, NodeLink } from '../types/graph'
import { NodeCard } from './NodeCard'
import { WireLayer } from './WireLayer'
import { Port } from '../utils/wireGeometry'

interface CanvasProps {
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
  onDeleteNodes: (ids: string[]) => void
  onSetNodeWidth: (id: string, width: number) => void
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
  onSetNodeTemplate: (nodeId: string, template: string) => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onExpandNodes: (ids: string[]) => void
  onCollapseNodes: (ids: string[]) => void
  onExportHtml: () => void
  imageUris: Record<string, string>
  onSaveImage: (nodeId: string, base64: string, ext?: string) => void
  onDeleteImage: (nodeId: string, filename: string) => void
}

const HEADER_H = 36

function computeRenderPositions(
  nodes: GraphNode[],
  nodeSizes: Record<string, { width: number; height: number }>
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {}
  for (const node of nodes) {
    let yOffset = 0
    for (const other of nodes) {
      if (other.id === node.id) continue
      if (!other.contentExpanded) continue
      if (other.position.y >= node.position.y) continue
      const h = nodeSizes[other.id]?.height ?? HEADER_H
      yOffset += Math.max(0, h - HEADER_H)
    }
    result[node.id] = { x: node.position.x, y: node.position.y + yOffset }
  }
  return result
}

const toolbarBtnStyle: React.CSSProperties = {
  background: 'var(--vscode-button-background, #0e639c)',
  color: 'var(--vscode-button-foreground, #fff)',
  border: 'none',
  borderRadius: 3,
  padding: '3px 10px',
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

interface SelectionBox {
  x1: number; y1: number; x2: number; y2: number
}

const FONT_PRESETS = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]

export function Canvas({
  viewport, cursor, nativeWheelHandler,
  onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu,
  onSetViewport, graph, onUpdateNodePosition, onUpdateNode, onAddNode, onDeleteNodes,
  onSetFontSize, onBumpFontSize, onSetFontSizeExact,
  onSetNodeWidth,
  onPushHistory, onUndo, onRedo, canUndo, canRedo,
  onToggleContent, onToggleOriginal,
  onAddEdge, onDeleteEdge,
  onAddToggle, onUpdateToggle, onDeleteToggle, onExpandToggle, onDeleteOriginal,
  onAddOriginal, onAddLink, onDeleteLink, onOpenLink, onSetNodeTemplate,
  onCollapseAll, onExpandAll, onExpandNodes, onCollapseNodes, onExportHtml,
  imageUris, onSaveImage, onDeleteImage,
}: CanvasProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [fontInputVal, setFontInputVal] = useState<string>('14')
  const selBoxRef = useRef<SelectionBox | null>(null)
  const [wireDrawing, setWireDrawing] = useState<{ srcId: string; srcPort: Port; curX: number; curY: number } | null>(null)
  const selectedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    el.addEventListener('wheel', nativeWheelHandler, { passive: false })
    return () => el.removeEventListener('wheel', nativeWheelHandler)
  }, [nativeWheelHandler])

  // selectedIds ref 동기화
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])

  // 노드 선택 시 캔버스 div에 포커스 → paste 이벤트를 div에서 수신
  useEffect(() => {
    if (selectedIds.size >= 1) {
      const active = document.activeElement
      if (active?.tagName !== 'TEXTAREA' && active?.tagName !== 'INPUT') {
        divRef.current?.focus({ preventScroll: true })
      }
    }
  }, [selectedIds])

  const handleCanvasPaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const ids = selectedIdsRef.current
    if (ids.size !== 1) return
    const nodeId = [...ids][0]

    const sendImage = (blob: Blob, mimeType: string) => {
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        onSaveImage(nodeId, base64, ext)
      }
      reader.readAsDataURL(blob)
    }

    // 1차: ClipboardEvent.clipboardData
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageItem = items.find(it => it.type.startsWith('image/'))
    if (imageItem) {
      const blob = imageItem.getAsFile()
      if (blob) { sendImage(blob, imageItem.type); return }
    }

    // 2차: navigator.clipboard API
    try {
      const cbItems = await navigator.clipboard.read()
      for (const cbItem of cbItems) {
        const imageType = cbItem.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await cbItem.getType(imageType)
          sendImage(blob, imageType)
          return
        }
      }
    } catch { /* 권한 없음 */ }
  }, [onSaveImage])

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

  // 단일 선택 시 폰트 입력 필드 동기화
  useEffect(() => {
    if (selectedIds.size === 1) {
      const node = graph.nodes.find(n => selectedIds.has(n.id))
      setFontInputVal(String(node?.fontSize ?? 14))
    }
  }, [selectedIds, graph.nodes])

  const handleNodeResize = useCallback((id: string, width: number, height: number) => {
    setNodeSizes(prev => {
      const cur = prev[id]
      if (cur && cur.width === width && cur.height === height) return prev
      return { ...prev, [id]: { width, height } }
    })
  }, [])

  const renderPositions = useMemo(
    () => computeRenderPositions(graph.nodes, nodeSizes),
    [graph.nodes, nodeSizes]
  )

  // 노드 선택 (shift/ctrl: 추가선택, 이미 다중선택 중인 노드 클릭 시 유지)
  const handleNodeSelect = useCallback((id: string, additive: boolean) => {
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
  }, [])

  // 포트 드래그로 엣지 생성
  const handlePortDragStart = useCallback((nodeId: string, port: Port, clientX: number, clientY: number) => {
    const toCanvas = (cx: number, cy: number) => ({
      x: (cx - viewport.x) / viewport.zoom,
      y: (cy - viewport.y) / viewport.zoom,
    })
    const startPos = toCanvas(clientX, clientY)
    setWireDrawing({ srcId: nodeId, srcPort: port, curX: startPos.x, curY: startPos.y })
    const onMove = (ev: MouseEvent) => {
      const p = toCanvas(ev.clientX, ev.clientY)
      setWireDrawing(prev => prev ? { ...prev, curX: p.x, curY: p.y } : null)
    }
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const { x, y } = toCanvas(ev.clientX, ev.clientY)
      const target = graph.nodes.find(n => {
        if (n.id === nodeId) return false
        const pos = renderPositions[n.id] ?? n.position
        const sz = nodeSizes[n.id] ?? { width: 240, height: 36 }
        return x >= pos.x && x <= pos.x + sz.width && y >= pos.y && y <= pos.y + sz.height
      })
      if (target) onAddEdge(nodeId, target.id)
      setWireDrawing(null)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [viewport, graph.nodes, renderPositions, nodeSizes, onAddEdge])

  // 캔버스 mousedown: 왼쪽=박스선택, 중간/오른쪽=뷰포트
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      // 왼쪽 클릭: 박스 선택 시작
      setSelectedIds(new Set())
      const box = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY }
      selBoxRef.current = box
      setSelectionBox(box)
    } else if (e.button === 2) {
      // 우클릭: 패닝
      onMouseDown(e)
    }
  }, [onMouseDown])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (selBoxRef.current) {
      const updated = { ...selBoxRef.current, x2: e.clientX, y2: e.clientY }
      selBoxRef.current = updated
      setSelectionBox({ ...updated })
    } else {
      onMouseMove(e)
    }
  }, [onMouseMove])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (selBoxRef.current && e.button === 0) {
      const sb = selBoxRef.current
      const minX = Math.min(sb.x1, sb.x2), maxX = Math.max(sb.x1, sb.x2)
      const minY = Math.min(sb.y1, sb.y2), maxY = Math.max(sb.y1, sb.y2)
      // 실질적인 드래그가 있을 때만 선택 (5px 이상)
      if (maxX - minX > 5 || maxY - minY > 5) {
        // 스크린 → 캔버스 좌표 변환
        const cx1 = (minX - viewport.x) / viewport.zoom
        const cy1 = (minY - viewport.y) / viewport.zoom
        const cx2 = (maxX - viewport.x) / viewport.zoom
        const cy2 = (maxY - viewport.y) / viewport.zoom

        const hit = new Set<string>()
        for (const node of graph.nodes) {
          const pos = renderPositions[node.id] ?? node.position
          const sz = nodeSizes[node.id] ?? { width: 240, height: HEADER_H }
          if (pos.x < cx2 && pos.x + sz.width > cx1 && pos.y < cy2 && pos.y + sz.height > cy1) {
            hit.add(node.id)
          }
        }
        setSelectedIds(hit)
      }
      selBoxRef.current = null
      setSelectionBox(null)
    } else {
      onMouseUp(e)
      selBoxRef.current = null
      setSelectionBox(null)
    }
  }, [viewport, graph.nodes, renderPositions, nodeSizes, onMouseUp])

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    selBoxRef.current = null
    setSelectionBox(null)
    onMouseLeave(e)
  }, [onMouseLeave])

  // 툴바: 노드 추가
  const handleAddNode = useCallback(() => {
    const el = divRef.current
    if (!el) return
    const { width: W, height: H } = el.getBoundingClientRect()
    onAddNode((W / 2 - viewport.x) / viewport.zoom, (H / 2 - viewport.y) / viewport.zoom, selectedTemplate)
  }, [viewport, onAddNode, selectedTemplate])

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
      const sz = nodeSizes[node.id] ?? { width: 240, height: HEADER_H }
      minX = Math.min(minX, pos.x); minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + sz.width); maxY = Math.max(maxY, pos.y + sz.height)
    }
    const pad = 60
    const zoom = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY), 1.5)
    onSetViewport({ zoom, x: (W - (maxX - minX) * zoom) / 2 - minX * zoom, y: (H - (maxY - minY) * zoom) / 2 - minY * zoom })
  }, [graph.nodes, nodeSizes, renderPositions, onSetViewport])

  const selCount = selectedIds.size

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* 상단 툴바 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)',
        borderBottom: '1px solid var(--vscode-editorGroup-border, #3c3c3c)',
        flexShrink: 0,
        zIndex: 200,
      }}>
        {/* Undo / Redo */}
        <button
          style={{ ...toolbarBtnStyle, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }}
          onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
        >← Undo</button>
        <button
          style={{ ...toolbarBtnStyle, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }}
          onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
        >Redo →</button>

        <div style={{ width: 1, height: 16, background: 'var(--vscode-editorGroup-border, #444)', margin: '0 2px' }} />

        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          style={{
            background: 'var(--vscode-input-background, #3c3c3c)',
            color: 'var(--vscode-input-foreground, #ccc)',
            border: '1px solid var(--vscode-input-border, #555)',
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

        <div style={{ width: 1, height: 16, background: 'var(--vscode-editorGroup-border, #444)', margin: '0 2px' }} />

        <button
          style={{
            ...toolbarBtnStyle,
            background: selCount > 0 ? 'var(--vscode-statusBarItem-errorBackground, #c72e0f)' : undefined,
            opacity: selCount > 0 ? 1 : 0.4,
            cursor: selCount > 0 ? 'pointer' : 'default',
          }}
          onClick={handleDeleteSelected}
          disabled={selCount === 0}
        >
          Delete{selCount > 1 ? ` (${selCount})` : ''}
        </button>

        {selCount > 0 && (
          <>
            <span style={{ fontSize: 10, opacity: 0.5, color: 'var(--vscode-editor-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
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
                    background: 'var(--vscode-input-background, #3c3c3c)',
                    color: 'var(--vscode-input-foreground, #ccc)',
                    border: '1px solid var(--vscode-input-border, #555)',
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
            <div style={{ width: 1, height: 16, background: 'var(--vscode-editorGroup-border, #444)', margin: '0 2px' }} />

            {/* 폰트 사이즈: A- / 직접입력 / A+ / 프리셋 선택 */}
            <button style={toolbarBtnStyle} onClick={() => onBumpFontSize([...selectedIds], -1)} title="글자 작게 (A-)">A-</button>
            <input
              type="number"
              min={8} max={72}
              value={fontInputVal}
              onChange={(e) => {
                setFontInputVal(e.target.value)
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 8 && v <= 72) onSetFontSizeExact([...selectedIds], v)
              }}
              onBlur={() => {
                const v = parseInt(fontInputVal, 10)
                if (!isNaN(v)) {
                  const clamped = Math.max(8, Math.min(72, v))
                  onSetFontSizeExact([...selectedIds], clamped)
                  setFontInputVal(String(clamped))
                } else if (selectedIds.size === 1) {
                  const node = graph.nodes.find(n => selectedIds.has(n.id))
                  setFontInputVal(String(node?.fontSize ?? 14))
                }
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              style={{
                width: 38,
                background: 'var(--vscode-input-background, #3c3c3c)',
                color: 'var(--vscode-input-foreground, #ccc)',
                border: '1px solid var(--vscode-input-border, #555)',
                borderRadius: 3,
                fontSize: 11,
                padding: '2px 4px',
                textAlign: 'center',
                outline: 'none',
              }}
              title="폰트 크기 직접 입력"
            />
            <button style={toolbarBtnStyle} onClick={() => onBumpFontSize([...selectedIds], 1)} title="글자 크게 (A+)">A+</button>
            <select
              value={selCount === 1 ? (graph.nodes.find(n => selectedIds.has(n.id))?.fontSize ?? 12) : ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v)) {
                  onSetFontSizeExact([...selectedIds], v)
                  setFontInputVal(String(v))
                }
              }}
              style={{
                background: 'var(--vscode-input-background, #3c3c3c)',
                color: 'var(--vscode-input-foreground, #ccc)',
                border: '1px solid var(--vscode-input-border, #555)',
                borderRadius: 3,
                fontSize: 11,
                padding: '2px 2px',
                outline: 'none',
                cursor: 'pointer',
              }}
              title="폰트 크기 선택"
            >
              {selCount > 1 && <option value="">···</option>}
              {FONT_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

          </>
        )}

        <div style={{ width: 1, height: 16, background: 'var(--vscode-editorGroup-border, #444)', margin: '0 2px' }} />
        <button
          style={toolbarBtnStyle}
          onClick={() => selCount > 0 ? onCollapseNodes([...selectedIds]) : onCollapseAll()}
          title={selCount > 0 ? '선택 노드 + 하위 노드 접기' : '모든 노드 접기'}
        >접기↑</button>
        <button
          style={toolbarBtnStyle}
          onClick={() => selCount > 0 ? onExpandNodes([...selectedIds]) : onExpandAll()}
          title={selCount > 0 ? '선택 노드 + 하위 노드 펼치기' : '모든 노드 펼치기'}
        >펼치기↓</button>

        <div style={{ width: 1, height: 16, background: 'var(--vscode-editorGroup-border, #444)', margin: '0 2px' }} />
        <button style={{ ...toolbarBtnStyle, background: 'var(--vscode-statusBarItem-warningBackground, #7a5c00)' }} onClick={onExportHtml} title="HTML로 내보내기">HTML 내보내기</button>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, opacity: 0.3, color: 'var(--vscode-editor-foreground)' }}>
          우클릭: 이동 · 스크롤: 줌 · 드래그: 선택
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
                  onUpdatePosition={onUpdateNodePosition}
                  onUpdateNode={onUpdateNode}
                  onSetNodeWidth={onSetNodeWidth}
                  onSetFontSize={onSetFontSize}
                  onPushHistory={onPushHistory}
                  onToggleContent={onToggleContent}
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
                  onDeleteImage={onDeleteImage}
                />
              )
            })}
            <WireLayer
              nodes={graph.nodes}
              edges={graph.edges}
              nodeSizes={nodeSizes}
              renderPositions={renderPositions}
              wirePreview={wireDrawing}
              onDeleteEdge={onDeleteEdge}
            />
          </div>

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

        <button onClick={handleFitView} style={{
          position: 'absolute', bottom: 16, right: 16,
          background: 'var(--vscode-button-background, #0e639c)',
          color: 'var(--vscode-button-foreground, #fff)',
          border: 'none', borderRadius: 4,
          padding: '4px 10px', fontSize: 11, cursor: 'pointer',
          opacity: 0.85, zIndex: 100,
        }}>
          Fit View
        </button>
      </div>
    </div>
  )
}
