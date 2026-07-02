import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'
import ReactDOM from 'react-dom'
import { GraphNode, NodeTemplate, NodeLink } from '../types/graph'
import { useDrag } from '../hooks/useDrag'
import { Port } from '../utils/wireGeometry'
import { MathText } from './MathText'

interface NodeCardProps {
  node: GraphNode
  template: NodeTemplate
  nodeTemplates: Record<string, NodeTemplate>
  viewportZoom: number
  renderPosition: { x: number; y: number }
  onUpdatePosition: (id: string, x: number, y: number) => void
  onUpdateNode: (id: string, field: string, value: string) => void
  onSetNodeWidth: (id: string, width: number) => void
  onSetFontSize: (id: string, size: number) => void
  onPushHistory: () => void
  selected: boolean
  isMultiSelected: boolean
  extraDragNodes: Array<{ id: string; x: number; y: number }> | null
  onSelect: (id: string, additive: boolean) => void
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
  onSaveImage: (nodeId: string, base64: string, ext: string) => void
  onDeleteImage: (nodeId: string, filename: string) => void
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
  onUpdatePosition, onUpdateNode, onSetNodeWidth, onSetFontSize, onPushHistory,
  selected, isMultiSelected, extraDragNodes, onSelect, onToggleContent, onToggleOriginal, onResize,
  onPortDragStart, onAddToggle, onUpdateToggle, onDeleteToggle, onExpandToggle, onDeleteOriginal,
  onAddOriginal, onAddLink, onDeleteLink, onOpenLink, onSetNodeTemplate,
  imageUris, onSaveImage, onDeleteImage,
}: NodeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [editValue, setEditValue] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [editingToggle, setEditingToggle] = useState<{ id: string; field: 'title' | 'content'; initVal: string } | null>(null)
  const [hoveredImgIdx, setHoveredImgIdx] = useState<number | null>(null)
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

  const { onMouseDown: onDragStart } = useDrag({
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

  // Escape 키로 라이트박스 닫기
  useEffect(() => {
    if (!lightboxSrc) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxSrc])

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
  const borderRadius = template?.shape === 'rounded' ? 12 : 2
  const fs = node.fontSize ?? 14

  const handleResizeStart = useCallback((e: React.MouseEvent, axis: 'x' | 'both') => {
    e.stopPropagation()
    e.preventDefault()
    onPushHistory()
    const startX = e.clientX
    const startWidth = node.nodeWidth ?? (cardRef.current?.offsetWidth ?? 240)
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / viewportZoom
      onSetNodeWidth(node.id, startWidth + dx)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [node.id, node.nodeWidth, viewportZoom, onSetNodeWidth, onPushHistory])

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

  return (
    <>
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: renderPosition.x,
          top: renderPosition.y,
          minWidth: 240,
          width: node.nodeWidth ?? undefined,
          background: `color-mix(in srgb, ${color} 15%, var(--vscode-editor-background, #1e1e1e))`,
          border: selected
            ? `2px solid ${color}`
            : `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
          borderRadius,
          fontFamily: 'var(--vscode-font-family)',
          fontSize: 'var(--vscode-font-size)',
          color: 'var(--vscode-editor-foreground)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          zIndex: 1,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(node.id) }}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {(isHovered || selected) && (['top', 'right', 'bottom', 'left'] as const).map(port => {
          const portStyle: CSSProperties = port === 'top' ? { top: -5, left: '50%', transform: 'translateX(-50%)' }
            : port === 'bottom' ? { bottom: -5, left: '50%', transform: 'translateX(-50%)' }
            : port === 'left' ? { left: -5, top: '50%', transform: 'translateY(-50%)' }
            : { right: -5, top: '50%', transform: 'translateY(-50%)' }
          return (
            <div key={port} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onPortDragStart(node.id, port, e.clientX, e.clientY) }}
              style={{ position: 'absolute', ...portStyle, width: 10, height: 10, borderRadius: '50%',
                background: color, border: '2px solid var(--vscode-editor-background)', cursor: 'crosshair', zIndex: 10, boxSizing: 'border-box' as const }} />
          )
        })}

        {/* Header */}
        <div
          onMouseDown={(e) => {
            onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey)
            if (editingField === 'title') return
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px',
            cursor: editingField === 'title' ? 'default' : 'move',
            borderBottom: node.contentExpanded
              ? `1px solid color-mix(in srgb, ${color} 20%, transparent)`
              : 'none',
            borderRadius: `${borderRadius}px ${borderRadius}px ${node.contentExpanded ? 0 : borderRadius}px ${node.contentExpanded ? 0 : borderRadius}px`,
          }}
        >
          <span style={{
            padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
            background: `color-mix(in srgb, ${color} 20%, transparent)`,
            color, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
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
              onDoubleClick={(e) => startEdit('title', node.title, e)}
              title="Double-click to edit"
              style={{ flex: 1, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'text' }}
            >
              {node.title}
            </span>
          )}

          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} title="이미지 첨부 (파일 선택)" style={btnStyle}>📎</button>
            <button onClick={() => onToggleContent(node.id)} title={node.contentExpanded ? '접기' : '펼치기'} style={btnStyle}>
              {node.contentExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Content body */}
        {node.contentExpanded && (
          <div style={{ padding: '8px 10px' }}>
            {editingField === 'content' ? (
              <textarea
                ref={setEditRef as React.RefCallback<HTMLTextAreaElement>}
                value={editValue}
                onChange={handleTextareaChange}
                onBlur={commitEdit}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') cancelEdit() }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ ...baseEditStyle, fontSize: fs, lineHeight: 1.6, resize: 'none', overflow: 'hidden', minHeight: 20, display: 'block' }}
              />
            ) : (
              <div
                onClick={(e) => startEdit('content', node.content, e)}
                style={{ fontSize: fs, lineHeight: 1.6, wordBreak: 'break-word', cursor: 'text', minHeight: 20 }}
              >
                {node.content
                  ? <MathText text={node.content} style={{ fontSize: fs, lineHeight: 1.6 }} />
                  : <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Click to add content…</span>}
              </div>
            )}

            {/* Images */}
            {node.images.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {node.images.map((img, i) => {
                  const uri = imageUris[img.filename]
                  const hovered = hoveredImgIdx === i
                  return (
                    <div key={i}
                      style={{ position: 'relative', display: 'inline-block', cursor: uri ? 'zoom-in' : 'default' }}
                      onMouseEnter={() => setHoveredImgIdx(i)}
                      onMouseLeave={() => setHoveredImgIdx(null)}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {uri ? (
                        <img
                          src={uri}
                          alt={img.caption || img.filename}
                          onClick={() => setLightboxSrc(uri)}
                          style={{ display: 'block', maxWidth: '100%', borderRadius: 3, border: '1px solid rgba(128,128,128,0.2)' }}
                        />
                      ) : (
                        <div style={{ fontSize: 10, opacity: 0.5, padding: '4px 6px', background: 'rgba(128,128,128,0.1)', borderRadius: 3 }}>
                          {img.filename}
                        </div>
                      )}
                      {hovered && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteImage(node.id, img.filename) }}
                          style={{ ...btnStyle, position: 'absolute', top: 4, right: 4,
                            background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10,
                            width: 18, height: 18, opacity: 1, borderRadius: 3 }}
                          title="이미지 삭제"
                        >✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

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

        {/* 우측 엣지 리사이즈 핸들 */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'x')}
          style={{
            position: 'absolute', top: 0, right: -4, width: 8, height: '100%',
            cursor: 'ew-resize', zIndex: 20,
          }}
        />

        {/* 우하단 코너 리사이즈 핸들 */}
        <div
          onMouseDown={(e) => handleResizeStart(e, 'both')}
          title="드래그하여 너비 조절"
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12,
            cursor: 'nwse-resize', zIndex: 21,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: '2px',
            opacity: isHovered || selected ? 0.5 : 0.15,
          }}
        >
          <svg width="6" height="6" viewBox="0 0 6 6" style={{ display: 'block' }}>
            <path d="M0 6 L6 0 M3 6 L6 3 M6 6 L6 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
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
