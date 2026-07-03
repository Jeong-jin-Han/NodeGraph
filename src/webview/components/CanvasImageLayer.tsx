import React, { useRef, useState } from 'react'
import { CanvasImage, Viewport } from '../types/graph'

interface CanvasImageLayerProps {
  canvasImages: CanvasImage[]
  imageUris: Record<string, string>
  viewport: Viewport
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onUpdatePosition: (id: string, x: number, y: number) => void
  onUpdateSize: (id: string, width: number, height: number) => void
  onDrop: (imgId: string, clientX: number, clientY: number) => void
}

export function CanvasImageLayer({
  canvasImages, imageUris, viewport, selectedIds,
  onSelect, onUpdatePosition, onUpdateSize, onDrop,
}: CanvasImageLayerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport

  const handleMouseDown = (e: React.MouseEvent, img: CanvasImage) => {
    if (e.button !== 0) return
    e.stopPropagation()
    console.log('[CANVAS_IMG] mousedown, selecting', img.id)
    onSelect(img.id)

    const zoom = viewportRef.current.zoom
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startX = img.position.x
    const startY = img.position.y
    let moved = false

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startClientX) / zoom
      const dy = (ev.clientY - startClientY) / zoom
      if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        moved = true
        setDraggingId(img.id)
      }
      if (moved) onUpdatePosition(img.id, startX + dx, startY + dy)
    }

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setDraggingId(null)
      if (moved) onDrop(img.id, ev.clientX, ev.clientY)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleResizeMouseDown = (e: React.MouseEvent, img: CanvasImage) => {
    e.stopPropagation()
    e.preventDefault()

    const zoom = viewportRef.current.zoom
    const startClientX = e.clientX
    const startW = img.width
    const startH = img.height
    const aspect = startH > 0 && startW > 0 ? startH / startW : 0.75

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startClientX) / zoom
      const newW = Math.max(80, startW + dx)
      onUpdateSize(img.id, Math.round(newW), Math.round(newW * aspect))
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <>
      {canvasImages.map(img => {
        const uri = imageUris[img.filename]
        const isSelected = selectedIds.has(img.id)
        const isDragging = img.id === draggingId

        return (
          <div
            key={img.id}
            className="canvas-image-item"
            style={{
              position: 'absolute',
              left: img.position.x,
              top: img.position.y,
              width: img.width,
              height: img.height,
              boxSizing: 'border-box',
              border: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(100,130,200,0.4)',
              borderRadius: 3,
              cursor: 'move',
              zIndex: isDragging ? 100 : 0,
              userSelect: 'none',
              pointerEvents: isDragging ? 'none' : 'auto',
            }}
            onMouseDown={(e) => handleMouseDown(e, img)}
          >
            {uri
              ? <img
                  src={uri}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                  draggable={false}
                />
              : <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(100,130,200,0.08)', fontSize: 11, opacity: 0.6,
                  pointerEvents: 'none',
                }}>
                  {img.filename}
                </div>
            }
            {isSelected && (
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, img)}
                style={{
                  position: 'absolute',
                  right: -5,
                  bottom: -5,
                  width: 12,
                  height: 12,
                  background: '#3b82f6',
                  border: '2px solid white',
                  borderRadius: 2,
                  cursor: 'se-resize',
                  zIndex: 1,
                  boxSizing: 'border-box',
                  pointerEvents: 'auto',
                }}
              />
            )}
          </div>
        )
      })}
    </>
  )
}
