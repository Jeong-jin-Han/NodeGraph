import { useState, useCallback, useRef } from 'react'

const DRAG_THRESHOLD = 5 // screen pixels before drag activates

interface UseDragOptions {
  nodeId: string
  position: { x: number; y: number }
  viewportZoom: number
  onUpdatePosition: (id: string, x: number, y: number) => void
  onDragActivate?: (nodeId: string) => void
  onDragDeactivate?: (nodeId: string) => void
}

export function useDrag({ nodeId, position, viewportZoom, onUpdatePosition, onDragActivate, onDragDeactivate }: UseDragOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef<{
    startMouseX: number
    startMouseY: number
    startNodeX: number
    startNodeY: number
    active: boolean
  } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    e.preventDefault()
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: position.x,
      startNodeY: position.y,
      active: false,
    }

    const onMove = (ev: MouseEvent) => {
      const ds = dragState.current
      if (!ds) return
      const rawDx = ev.clientX - ds.startMouseX
      const rawDy = ev.clientY - ds.startMouseY
      if (!ds.active) {
        if (Math.abs(rawDx) < DRAG_THRESHOLD && Math.abs(rawDy) < DRAG_THRESHOLD) return
        ds.active = true
        setIsDragging(true)
        onDragActivate?.(nodeId)
      }
      const dx = rawDx / viewportZoom
      const dy = rawDy / viewportZoom
      onUpdatePosition(nodeId, ds.startNodeX + dx, ds.startNodeY + dy)
    }

    const onUp = () => {
      if (dragState.current?.active) {
        setIsDragging(false)
        onDragDeactivate?.(nodeId)
      }
      dragState.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [nodeId, position.x, position.y, viewportZoom, onUpdatePosition, onDragActivate, onDragDeactivate])

  return { onMouseDown, isDragging }
}
