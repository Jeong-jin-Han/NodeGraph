import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, CSSProperties } from 'react'
import ReactDOM from 'react-dom'
import { GraphNode, NodeTemplate, NodeLink } from '../types/graph'
import { useDrag } from '../hooks/useDrag'
import { Port } from '../utils/wireGeometry'
import { MathText } from './MathText'
import { parseTableBlocks, hasTable, TableBlock } from '../utils/tableParser'

interface NodeCardProps {
  node: GraphNode
  template: NodeTemplate
  nodeTemplates: Record<string, NodeTemplate>
  viewportZoom: number
  renderPosition: { x: number; y: number }
  onUpdatePosition: (id: string, x: number, y: number) => void
  onUpdateNode: (id: string, field: string, value: string) => void
  onSetNodeWidth: (id: string, width: number) => void
  onSetNodeHeight: (id: string, height: number) => void
  onSetFontSize: (id: string, size: number) => void
  onPushHistory: () => void
  selected: boolean
  isMultiSelected: boolean
  extraDragNodes: Array<{ id: string; x: number; y: number }> | null
  onSelect: (id: string, additive: boolean) => void
  onHoverStart: (id: string) => void
  onHoverEnd: (id: string) => void
  onToggleContent: (id: string) => void
  onToggleOriginal: (id: string) => void
  onResize: (id: string, width: number, height: number) => void
  onPortDragStart: (nodeId: string, port: Port, clientX: number, clientY: number) => void
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
  imageUris: Record<string, string>
  onSaveImage: (nodeId: string, base64: string, ext: string, position?: number) => void
  canvasClipboardRef?: React.RefObject<{ filename: string; width: number; height: number } | null>
  onAddFilenameToNode?: (nodeId: string, filename: string) => void
  isSearchMatch?: boolean
  isActiveSearchMatch?: boolean
}

type EditingField = 'title' | 'content' | 'originalText' | 'originalLoc' | 'originalTitle' | null

const btnStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--vscode-editor-foreground)',
  cursor: 'pointer',
  fontSize: 11,
  padding: '2px 4px',
  borderRadius: 2,
  opacity: 0.6,
  lineHeight: 1,
  width: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

export function NodeCard({
  node, template, nodeTemplates, viewportZoom, renderPosition,
  onUpdatePosition, onUpdateNode, onSetNodeWidth, onSetNodeHeight, onSetFontSize, onPushHistory,
  selected, isMultiSelected, extraDragNodes, onSelect, onHoverStart, onHoverEnd, onToggleContent, onToggleOriginal, onResize,
  onPortDragStart, onAddToggle, onUpdateToggle, onDeleteToggle, onExpandToggle, onDeleteOriginal,
  onAddOriginal, onAddLink, onDeleteLink, onOpenLink, onSetNodeTemplate,
  imageUris, onSaveImage,
  canvasClipboardRef, onAddFilenameToNode,
  isSearchMatch, isActiveSearchMatch,
}: NodeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const tableBodyRef = useRef<HTMLDivElement>(null)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [editValue, setEditValue] = useState('')
  const [editingSegmentIdx, setEditingSegmentIdx] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [editingToggle, setEditingToggle] = useState<{ id: string; field: 'title' | 'content'; initVal: string } | null>(null)
  const [hoveredToggleId, setHoveredToggleId] = useState<string | null>(null)
  const [hoveredOriginal, setHoveredOriginal] = useState(false)
  const [hoveredLinkIdx, setHoveredLinkIdx] = useState<number | null>(null)
  const [addingLink, setAddingLink] = useState(false)
  const [linkForm, setLinkForm] = useState<{ type: NodeLink['type']; target: string; label: string }>({ type: 'url', target: '', label: '' })
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      onSaveImage(node.id, base64, ext)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [node.id, onSaveImage])

  const { onMouseDown: onDragStart, isDragging } = useDrag({
    nodeId: node.id,
    position: node.position,
    viewportZoom,
    onUpdatePosition,
  })

  useEffect(() => {
    if (!cardRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        onResize(node.id, width, height)
      }
    })
    ro.observe(cardRef.current)
    return () => ro.disconnect()
  }, [node.id, onResize])

  // contentExpanded 토글 시 브라우저 paint 전에 동기적으로 높이 업데이트
  // ResizeObserver는 paint 이후 발화하므로 첫 프레임에 wrong position 발생 → 이걸 방지
  useLayoutEffect(() => {
    if (!cardRef.current) return
    const el = cardRef.current
    onResize(node.id, el.offsetWidth, el.offsetHeight)
  }, [node.contentExpanded, node.id, onResize])

  // Escape 키로 라이트박스 닫기
  useEffect(() => {
    if (!lightboxSrc) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxSrc])

// 표 렌더 후 노드 너비 자동 확장
  useEffect(() => {
    if (!node.contentExpanded) return
    if (!tableBodyRef.current) return
    const tbl = tableBodyRef.current.querySelector('table')
    if (!tbl) return
    const needed = tbl.scrollWidth + 24  // 12px padding each side
    const current = node.nodeWidth ?? 0
    if (needed > current) onSetNodeWidth(node.id, needed)
  }, [node.content, node.contentExpanded, node.nodeWidth, node.id, onSetNodeWidth])

  const setEditRef = useCallback((el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!el) return
    if (el instanceof HTMLTextAreaElement) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
    setTimeout(() => {
      el.focus()
      if (el instanceof HTMLTextAreaElement) {
        el.setSelectionRange(el.value.length, el.value.length)
      } else {
        el.select()
      }
    }, 0)
  }, [])

  const startEdit = (field: EditingField, value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingField(field)
    setEditValue(value)
  }


  const commitEdit = useCallback(() => {
    if (!editingField) return
    onUpdateNode(node.id, editingField, editValue)
    setEditingField(null)
  }, [editingField, editValue, node.id, onUpdateNode])

  const cancelEdit = useCallback(() => setEditingField(null), [])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const color = template?.color ?? '#888888'
  const borderRadius = template?.shape === 'rounded' ? 22 : 2
  const fs = node.fontSize ?? 14

  const handleResizeStart = useCallback((e: React.MouseEvent, axis: 'x' | 'y' | 'both') => {
    e.stopPropagation()
    e.preventDefault()
    onPushHistory()
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = node.nodeWidth ?? (cardRef.current?.offsetWidth ?? 240)
    const startHeight = node.nodeHeight ?? (cardRef.current?.offsetHeight ?? 120)
    const onMove = (ev: MouseEvent) => {
      if (axis !== 'y') {
        const dx = (ev.clientX - startX) / viewportZoom
        onSetNodeWidth(node.id, startWidth + dx)
      }
      if (axis !== 'x') {
        const dy = (ev.clientY - startY) / viewportZoom
        onSetNodeHeight(node.id, Math.max(60, startHeight + dy))
      }
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [node.id, node.nodeWidth, node.nodeHeight, viewportZoom, onSetNodeWidth, onSetNodeHeight, onPushHistory])

  const baseEditStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--vscode-editor-foreground)',
    fontFamily: 'inherit',
    padding: 0,
    margin: 0,
    boxSizing: 'border-box',
    width: '100%',
  }

  // content 안의 [[IMG:...:WxH]] 토큰에서 필요한 최소 너비 자동 계산
  const autoMinWidth = useMemo(() => {
    const content = node.content ?? ''
    const IMG_SIZE_RE = /\[\[IMG:[^:\]]+:(\d+)x\d+\]\]/g
    let maxW = 0
    let m: RegExpExecArray | null
    while ((m = IMG_SIZE_RE.exec(content)) !== null) maxW = Math.max(maxW, Number(m[1]))
    if (maxW === 0) return 240
    // 표 모드: 이미지 열 외에 다른 열 여유분 추가
    return hasTable(content) ? maxW + 280 : maxW + 32
  }, [node.content])

  return (
    <>
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: renderPosition.x,
          top: renderPosition.y,
          minWidth: Math.max(node.nodeWidth ?? 0, 240, autoMinWidth),
          minHeight: node.nodeHeight ?? undefined,
          background: `color-mix(in srgb, ${color} 15%, var(--vscode-editor-background, #1e1e1e))`,
          border: selected
            ? `2px solid ${color}`
            : isActiveSearchMatch
              ? '2px solid #f59e0b'
              : isSearchMatch
                ? '2px solid #fcd34d'
                : `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
          borderRadius,
          fontFamily: 'var(--vscode-font-family)',
          fontSize: 'var(--vscode-font-size)',
          color: 'var(--vscode-editor-foreground)',
          boxShadow: isActiveSearchMatch
            ? '0 0 0 3px rgba(245,158,11,0.35), 0 2px 8px rgba(0,0,0,0.25)'
            : isDragging ? '0 6px 20px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'box-shadow 0.1s',
          zIndex: isDragging ? 10 : 1,
        }}
        data-node-id={node.id}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(node.id, false) }}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseEnter={() => { setIsHovered(true); onHoverStart(node.id) }}
        onMouseLeave={() => { setIsHovered(false); onHoverEnd(node.id) }}
      >
        {(isHovered && !selected) && (['top', 'right', 'bottom', 'left'] as const).map(port => {
          const portStyle: CSSProperties = port === 'top' ? { top: -5, left: '50%', transform: 'translateX(-50%)' }
            : port === 'bottom' ? { bottom: -5, left: '50%', transform: 'translateX(-50%)' }
            : port === 'left' ? { left: -5, top: '50%', transform: 'translateY(-50%)' }
            : { right: -5, top: '50%', transform: 'translateY(-50%)' }
          return (
            <div key={port} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onPortDragStart(node.id, port, e.clientX, e.clientY) }}
              style={{ position: 'absolute', ...portStyle, width: 10, height: 10, borderRadius: '50%',
                background: color, border: '2px solid var(--vscode-editor-background)', cursor: 'crosshair', zIndex: 25, boxSizing: 'border-box' as const }} />
          )
        })}

        {/* Header */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation()
            onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px',
            cursor: 'default',
            borderBottom: node.contentExpanded
              ? `1px solid color-mix(in srgb, ${color} 20%, transparent)`
              : 'none',
            borderRadius: `${borderRadius}px ${borderRadius}px ${node.contentExpanded ? 0 : borderRadius}px ${node.contentExpanded ? 0 : borderRadius}px`,
          }}
        >
          <span
            onMouseDown={(e) => {
              onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey)
              if (isMultiSelected && extraDragNodes && extraDragNodes.length > 0) {
                e.stopPropagation()
                e.preventDefault()
                const snapshot = [{ id: node.id, x: node.position.x, y: node.position.y }, ...extraDragNodes]
                const startX = e.clientX
                const startY = e.clientY
                const onMove = (ev: MouseEvent) => {
                  const dx = (ev.clientX - startX) / viewportZoom
                  const dy = (ev.clientY - startY) / viewportZoom
                  for (const n of snapshot) onUpdatePosition(n.id, n.x + dx, n.y + dy)
                }
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove)
                  document.removeEventListener('mouseup', onUp)
                }
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
              } else {
                onDragStart(e)
              }
            }}
            style={{
              padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
              background: `color-mix(in srgb, ${color} 20%, transparent)`,
              color, flexShrink: 0, whiteSpace: 'nowrap',
              cursor: 'move', userSelect: 'none',
            }}
          >
            {template?.label ?? node.template}
          </span>

          {editingField === 'title' ? (
            <div style={{ flex: 'none', position: 'relative', minWidth: 80 }}>
              <span aria-hidden style={{
                display: 'block', visibility: 'hidden',
                fontSize: fs, fontWeight: 500, whiteSpace: 'pre', lineHeight: 'normal', minWidth: 80,
              }}>
                {editValue || ' '}
              </span>
              <input
                ref={setEditRef as React.RefCallback<HTMLInputElement>}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') commitEdit()
                  if (e.key === 'Escape') cancelEdit()
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ ...baseEditStyle, position: 'absolute', inset: 0, width: '100%', height: '100%', fontSize: fs, fontWeight: 500 }}
              />
            </div>
          ) : (
            <span
              onClick={(e) => { e.stopPropagation(); onToggleContent(node.id) }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); startEdit('title', node.title, e) }}
              title="Click to fold/unfold · Right-click to edit"
              style={{ flex: 1, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
            >
              {node.title}
            </span>
          )}

          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} title="이미지 첨부 (파일 선택)" style={btnStyle}>📎</button>
          </div>
        </div>

        {/* Content body */}
        {node.contentExpanded && (
          <div style={{ padding: '8px 10px' }}>
            {(() => {
              // --- 셀 내 콘텐츠 렌더러 (LaTeX + [[IMG:filename:WxH]] 토큰 지원) ---
              const renderCellContent = (cellText: string): React.ReactNode => {
                const IMG_RE = /\[\[IMG:([^:\]]+)(?::(\d+)x(\d+))?\]\]/g
                const parts: React.ReactNode[] = []
                let lastIdx = 0
                let match: RegExpExecArray | null
                let key = 0
                IMG_RE.lastIndex = 0
                while ((match = IMG_RE.exec(cellText)) !== null) {
                  if (match.index > lastIdx) {
                    parts.push(<MathText key={key++} text={cellText.slice(lastIdx, match.index)} />)
                  }
                  const filename = match[1]
                  const imgW = match[2] ? Number(match[2]) : undefined
                  const imgH = match[3] ? Number(match[3]) : undefined
                  const uri = imageUris[filename]
                  parts.push(uri
                    ? <img key={key++} src={uri} alt={filename}
                        onClick={() => setLightboxSrc(uri)}
                        style={{ display: 'block', maxWidth: imgW ? undefined : '100%', marginTop: 2, cursor: 'zoom-in',
                          ...(imgW ? { width: imgW } : {}), ...(imgH ? { height: imgH } : {}) }} />
                    : <span key={key++} style={{ opacity: 0.5, fontSize: 10 }}>[IMG:{filename}]</span>
                  )
                  lastIdx = match.index + match[0].length
                }
                if (lastIdx < cellText.length) parts.push(<MathText key={key++} text={cellText.slice(lastIdx)} />)
                return parts.length === 0 ? null : parts.length === 1 ? parts[0] : <>{parts}</>
              }

              // --- 테이블 블록 렌더러 ---
              const renderTableBlock = (block: TableBlock, blockIdx: number) => {
                const thSt: CSSProperties = { padding: '5px 10px', border: '1px solid #ddd', background: '#f8f9fa', fontWeight: 600, textAlign: 'left', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'normal', cursor: 'text' }
                const tdSt: CSSProperties = { padding: '5px 10px', border: '1px solid #ddd', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'normal', cursor: 'text' }
                return (
                  <div key={`tbl-wrap-${blockIdx}`} style={{ overflowX: 'auto', margin: '6px 0' }}>
                    <table
                      onClick={(e) => startEdit('content', node.content, e)}
                      style={{ borderCollapse: 'collapse', background: '#ffffff', fontSize: 'inherit', tableLayout: 'auto' }}
                    >
                      <thead>
                        <tr>{block.headers.map((h, ci) => <th key={ci} style={thSt}>{renderCellContent(h)}</th>)}</tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, ri) => (
                          <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={tdSt}>{renderCellContent(cell)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }

              // --- TABLE MODE ---
              const hasTbl = hasTable(node.content ?? '')
              if (hasTbl) {
                if (editingField === 'content') {
                  return (
                    <textarea
                      ref={setEditRef as React.RefCallback<HTMLTextAreaElement>}
                      value={editValue}
                      onChange={handleTextareaChange}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && canvasClipboardRef?.current) {
                          e.preventDefault()
                          const { filename, width: cw, height: ch } = canvasClipboardRef.current
                          const ta = e.target as HTMLTextAreaElement
                          const pos = ta.selectionStart ?? 0
                          const token = `[[IMG:${filename}:${Math.round(cw)}x${Math.round(ch)}]]`
                          const newVal = editValue.slice(0, pos) + token + editValue.slice(pos)
                          setEditValue(newVal)
                          setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + token.length }, 0)
                          return
                        }
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPaste={(e) => {
                        const items = Array.from(e.clipboardData?.items ?? [])
                        const imageItem = items.find(it => it.type.startsWith('image/'))
                        if (!imageItem) return
                        e.preventDefault()
                        e.stopPropagation()
                        const blob = imageItem.getAsFile()
                        if (!blob) return
                        const pos = (e.target as HTMLTextAreaElement).selectionStart
                        const ext = imageItem.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
                        commitEdit()
                        const reader = new FileReader()
                        reader.onload = () => {
                          const base64 = (reader.result as string).split(',')[1]
                          onSaveImage(node.id, base64, ext, pos)
                        }
                        reader.readAsDataURL(blob)
                      }}
                      style={{ ...baseEditStyle, fontSize: fs, lineHeight: 1.6, resize: 'none', overflow: 'hidden', minHeight: 20, display: 'block' }}
                    />
                  )
                }
                const blocks = parseTableBlocks(node.content ?? '')
                return (
                  <div ref={tableBodyRef} style={{ fontSize: fs, lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {blocks.map((block, bi) => {
                      if (block.type === 'table') return renderTableBlock(block, bi)
                      return (
                        <div key={bi} onClick={(e) => startEdit('content', node.content, e)}
                          style={{ cursor: 'text', minHeight: bi === blocks.length - 1 ? 20 : undefined }}
                        >
                          {block.text
                            ? renderCellContent(block.text)
                            : bi === blocks.length - 1 ? <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Click to add content…</span> : null
                          }
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // PLAIN MODE — single textarea / view
              if (editingField === 'content') {
                return (
                  <textarea
                    ref={setEditRef as React.RefCallback<HTMLTextAreaElement>}
                    value={editValue}
                    onChange={handleTextareaChange}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && canvasClipboardRef?.current) {
                        e.preventDefault()
                        const { filename, width: cw, height: ch } = canvasClipboardRef.current
                        const ta = e.target as HTMLTextAreaElement
                        const pos = ta.selectionStart ?? 0
                        const token = `[[IMG:${filename}:${Math.round(cw)}x${Math.round(ch)}]]`
                        const newVal = editValue.slice(0, pos) + token + editValue.slice(pos)
                        setEditValue(newVal)
                        setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + token.length }, 0)
                        return
                      }
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPaste={(e) => {
                      const items = Array.from(e.clipboardData?.items ?? [])
                      const imageItem = items.find(it => it.type.startsWith('image/'))
                      if (!imageItem) return
                      e.preventDefault()
                      e.stopPropagation()
                      const blob = imageItem.getAsFile()
                      if (!blob) return
                      const pos = (e.target as HTMLTextAreaElement).selectionStart
                      const ext = imageItem.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
                      commitEdit()
                      const reader = new FileReader()
                      reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1]
                        onSaveImage(node.id, base64, ext, pos)
                      }
                      reader.readAsDataURL(blob)
                    }}
                    style={{ ...baseEditStyle, fontSize: fs, lineHeight: 1.6, resize: 'none', overflow: 'hidden', minHeight: 20, display: 'block' }}
                  />
                )
              }
              return (
                <div
                  onClick={(e) => startEdit('content', node.content, e)}
                  style={{ fontSize: fs, lineHeight: 1.6, wordBreak: 'break-word', cursor: 'text', minHeight: 20 }}
                >
                  {node.content
                    ? renderCellContent(node.content)
                    : <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Click to add content…</span>
                  }
                </div>
              )
            })()}

            {/* Original */}
            {node.original && (
              <div style={{ marginTop: 8 }}
                onMouseEnter={() => setHoveredOriginal(true)}
                onMouseLeave={() => setHoveredOriginal(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    onClick={() => onToggleOriginal(node.id)}
                    style={{ cursor: 'pointer', fontSize: 9, opacity: 0.6, userSelect: 'none', flexShrink: 0, width: 10, textAlign: 'center' }}
                  >
                    {node.originalExpanded ? '▼' : '▶'}
                  </span>
                  {editingField === 'originalTitle' ? (
                    <input
                      ref={(el) => { if (el) setTimeout(() => { el.focus(); el.select() }, 0) }}
                      defaultValue={editValue}
                      onBlur={(e) => { onUpdateNode(node.id, 'originalTitle', e.target.value || 'Original'); setEditingField(null) }}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') { onUpdateNode(node.id, 'originalTitle', e.currentTarget.value || 'Original'); setEditingField(null) }
                        if (e.key === 'Escape') setEditingField(null)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ ...baseEditStyle, fontSize: fs, opacity: 0.7, fontWeight: 500 }}
                    />
                  ) : (
                    <span
                      onClick={(e) => startEdit('originalTitle', node.original?.title ?? 'Original', e)}
                      style={{ fontSize: fs, opacity: 0.7, cursor: 'text', fontWeight: 500 }}
                    >
                      {node.original?.title ?? 'Original'}
                    </span>
                  )}
                  {hoveredOriginal && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteOriginal(node.id) }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ ...btnStyle, fontSize: 10, opacity: 0.5 }}
                      title="Original 삭제"
                    >✕</button>
                  )}
                </div>

                {node.originalExpanded && (
                  <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(128,128,128,0.08)', borderRadius: 3 }}>
                    {editingField === 'originalLoc' ? (
                      <input
                        ref={setEditRef as React.RefCallback<HTMLInputElement>}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ ...baseEditStyle, fontSize: 10, opacity: 0.55, marginBottom: 4 }}
                      />
                    ) : (
                      <div onClick={(e) => startEdit('originalLoc', node.original!.location, e)}
                        style={{ opacity: 0.55, fontSize: 10, marginBottom: 4, cursor: 'text' }}>
                        {node.original.location || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>§ location…</span>}
                      </div>
                    )}

                    {editingField === 'originalText' ? (
                      <textarea
                        ref={setEditRef as React.RefCallback<HTMLTextAreaElement>}
                        value={editValue}
                        onChange={handleTextareaChange}
                        onBlur={commitEdit}
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') cancelEdit() }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ ...baseEditStyle, fontSize: Math.max(8, fs - 1), lineHeight: 1.55, fontStyle: 'italic', resize: 'none', overflow: 'hidden', minHeight: 20, display: 'block' }}
                      />
                    ) : (
                      <div onClick={(e) => startEdit('originalText', node.original!.text, e)}
                        style={{ fontSize: Math.max(8, fs - 1), lineHeight: 1.55, fontStyle: 'italic', wordBreak: 'break-word', cursor: 'text' }}>
                        {node.original.text
                          ? <MathText text={node.original.text} style={{ fontSize: Math.max(8, fs - 1), fontStyle: 'italic' }} />
                          : <span style={{ opacity: 0.35 }}>Click to add original text…</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Toggle items */}
            {(node.toggleItems ?? []).map(toggle => (
              <div key={toggle.id} style={{ marginTop: 4 }}>
                {/* Toggle header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => setHoveredToggleId(toggle.id)}
                  onMouseLeave={() => setHoveredToggleId(null)}
                >
                  <span
                    onClick={(e) => { e.stopPropagation(); onExpandToggle(node.id, toggle.id) }}
                    style={{ cursor: 'pointer', fontSize: 9, opacity: 0.6, userSelect: 'none', flexShrink: 0, width: 10, textAlign: 'center' }}
                  >
                    {toggle.expanded ? '▼' : '▶'}
                  </span>

                  {editingToggle?.id === toggle.id && editingToggle.field === 'title' ? (
                    <input
                      ref={(el) => { if (el) setTimeout(() => { el.focus(); el.select() }, 0) }}
                      defaultValue={editingToggle.initVal}
                      placeholder="Toggle 제목…"
                      onBlur={(e) => { onUpdateToggle(node.id, toggle.id, 'title', e.target.value); setEditingToggle(null) }}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') setEditingToggle(null)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ ...baseEditStyle, flex: 1, fontSize: fs, minWidth: 40 }}
                    />
                  ) : (
                    <span
                      onClick={(e) => { e.stopPropagation(); setEditingToggle({ id: toggle.id, field: 'title', initVal: toggle.title }) }}
                      style={{ flex: 1, fontSize: fs, cursor: 'text', opacity: toggle.title ? 1 : 0.35,
                        fontStyle: toggle.title ? 'normal' : 'italic', minWidth: 40, lineHeight: 1.5 }}
                    >
                      {toggle.title || 'Toggle 제목…'}
                    </span>
                  )}

                  {hoveredToggleId === toggle.id && !(editingToggle?.id === toggle.id) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteToggle(node.id, toggle.id) }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ ...btnStyle, fontSize: 10, opacity: 0.5, flexShrink: 0 }}
                      title="Toggle 삭제"
                    >✕</button>
                  )}
                </div>

                {toggle.expanded && (
                  <div style={{ marginTop: 4, padding: '5px 8px', background: 'rgba(128,128,128,0.08)', borderRadius: 3 }} onMouseDown={(e) => e.stopPropagation()}>
                    {editingToggle?.id === toggle.id && editingToggle.field === 'content' ? (
                      <textarea
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto'
                            el.style.height = el.scrollHeight + 'px'
                            setTimeout(() => { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }, 0)
                          }
                        }}
                        defaultValue={editingToggle.initVal}
                        onChange={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                        onBlur={(e) => { onUpdateToggle(node.id, toggle.id, 'content', e.target.value); setEditingToggle(null) }}
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { onUpdateToggle(node.id, toggle.id, 'content', e.currentTarget.value); setEditingToggle(null) } }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ ...baseEditStyle, fontSize: fs, lineHeight: 1.6, resize: 'none', overflow: 'hidden', minHeight: 20, display: 'block' }}
                      />
                    ) : (
                      <div
                        onClick={(e) => { e.stopPropagation(); setEditingToggle({ id: toggle.id, field: 'content', initVal: toggle.content }) }}
                        style={{ fontSize: fs, lineHeight: 1.6, wordBreak: 'break-word', cursor: 'text', minHeight: 20 }}
                      >
                        {toggle.content
                          ? <MathText text={toggle.content} style={{ fontSize: fs, lineHeight: 1.6 }} />
                          : <span style={{ fontStyle: 'italic', opacity: 0.35 }}>내용 입력…</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Links */}
            {(node.links.length > 0 || addingLink) && (
              <div style={{ marginTop: 8 }} onMouseDown={(e) => e.stopPropagation()}>
                {node.links.map((link, i) => (
                  <div key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}
                    onMouseEnter={() => setHoveredLinkIdx(i)}
                    onMouseLeave={() => setHoveredLinkIdx(null)}
                  >
                    <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0 }}>
                      {link.type === 'url' ? '🔗' : link.type === 'pdf' ? '📄' : link.type === 'obsidian' ? '🟣' : '⬡'}
                    </span>
                    <span
                      onClick={() => onOpenLink(link)}
                      style={{ fontSize: Math.max(9, fs - 2), color: 'var(--vscode-textLink-foreground, #4fc1ff)', cursor: 'pointer',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={link.target}
                    >
                      {link.label || link.target}
                    </span>
                    {hoveredLinkIdx === i && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteLink(node.id, i) }}
                        style={{ ...btnStyle, fontSize: 9, opacity: 0.5, width: 16, height: 16 }}
                        title="링크 삭제"
                      >✕</button>
                    )}
                  </div>
                ))}
                {addingLink && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4,
                    padding: '6px 8px', background: 'rgba(128,128,128,0.08)', borderRadius: 3 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <select
                        value={linkForm.type}
                        onChange={(e) => setLinkForm(f => ({ ...f, type: e.target.value as NodeLink['type'] }))}
                        style={{ fontSize: 10, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)',
                          border: '1px solid var(--vscode-input-border)', borderRadius: 2, padding: '1px 2px' }}
                      >
                        <option value="url">URL</option>
                        <option value="pdf">PDF</option>
                        <option value="obsidian">Obsidian</option>
                        <option value="internal">Internal</option>
                      </select>
                      <input
                        autoFocus
                        placeholder="target (URL/경로/노드ID)"
                        value={linkForm.target}
                        onChange={(e) => setLinkForm(f => ({ ...f, target: e.target.value }))}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter' && linkForm.target.trim()) {
                            onAddLink(node.id, { ...linkForm, target: linkForm.target.trim() })
                            setLinkForm({ type: 'url', target: '', label: '' })
                            setAddingLink(false)
                          }
                          if (e.key === 'Escape') setAddingLink(false)
                        }}
                        style={{ flex: 1, fontSize: 10, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)',
                          border: '1px solid var(--vscode-input-border)', borderRadius: 2, padding: '1px 4px', outline: 'none' }}
                      />
                    </div>
                    <input
                      placeholder="표시 이름 (선택)"
                      value={linkForm.label}
                      onChange={(e) => setLinkForm(f => ({ ...f, label: e.target.value }))}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter' && linkForm.target.trim()) {
                          onAddLink(node.id, { ...linkForm, target: linkForm.target.trim() })
                          setLinkForm({ type: 'url', target: '', label: '' })
                          setAddingLink(false)
                        }
                        if (e.key === 'Escape') setAddingLink(false)
                      }}
                      style={{ fontSize: 10, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)', borderRadius: 2, padding: '1px 4px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => {
                          if (linkForm.target.trim()) {
                            onAddLink(node.id, { ...linkForm, target: linkForm.target.trim() })
                            setLinkForm({ type: 'url', target: '', label: '' })
                          }
                          setAddingLink(false)
                        }}
                        style={{ ...btnStyle, fontSize: 10, width: 'auto', height: 'auto', padding: '2px 8px' }}
                      >추가</button>
                      <button
                        onClick={() => setAddingLink(false)}
                        style={{ ...btnStyle, fontSize: 10, width: 'auto', height: 'auto', padding: '2px 8px', opacity: 0.5 }}
                      >취소</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom action buttons */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }} onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); onAddToggle(node.id) }}
                style={{ ...btnStyle, width: 'auto', height: 'auto', fontSize: 10, padding: '2px 8px', opacity: 0.45 }}
              >
                + Toggle
              </button>
              {!node.original && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddOriginal(node.id) }}
                  style={{ ...btnStyle, width: 'auto', height: 'auto', fontSize: 10, padding: '2px 8px', opacity: 0.45 }}
                >
                  + Original
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setAddingLink(v => !v) }}
                style={{ ...btnStyle, width: 'auto', height: 'auto', fontSize: 10, padding: '2px 8px', opacity: 0.45 }}
              >
                + Link
              </button>
            </div>
          </div>
        )}

        {selected && (
          <>
            {/* 우측 엣지 리사이즈 핸들 */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'x')}
              style={{
                position: 'absolute', top: 0, right: -4, width: 8, height: '100%',
                cursor: 'ew-resize', zIndex: 20,
              }}
            />

            {/* 하단 리사이즈 핸들 (코너 24px 제외) */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'y')}
              style={{
                position: 'absolute', bottom: -6, left: 0, right: 24,
                height: 12,
                cursor: 'ns-resize', zIndex: 20,
              }}
            />

            {/* 우하단 코너 리사이즈 핸들 */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'both')}
              style={{
                position: 'absolute', bottom: -6, right: -4,
                width: 28, height: 18,
                cursor: 'nwse-resize', zIndex: 21,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                paddingBottom: '2px', paddingRight: '4px', opacity: 0.5,
              }}
            >
              <svg width="7" height="7" viewBox="0 0 6 6" style={{ display: 'block' }}>
                <path d="M0 6 L6 0 M3 6 L6 3 M6 6 L6 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Lightbox — portal로 캔버스 transform 밖에 렌더링 */}
      {lightboxSrc && ReactDOM.createPortal(
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightboxSrc}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 4, boxShadow: '0 4px 32px rgba(0,0,0,0.6)', cursor: 'default' }}
          />
          <div style={{ position: 'absolute', top: 16, right: 20, color: '#fff', fontSize: 20, opacity: 0.7, cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setLightboxSrc(null)}>✕</div>
        </div>,
        document.body
      )}
    </>
  )
}
