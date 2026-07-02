import { useCallback, useRef } from 'react'

interface UseDragOptions {
  nodeId: string
  position: { x: number; y: number }
  viewportZoom: number
  onUpdatePosition: (id: string, x: number, y: number) => void
}

export function useDrag({ nodeId, position, viewportZoom, onUpdatePosition }: UseDragOptions) {
  const dragState = useRef<{
    startMouseX: number
    startMouseY: number
    startNodeX: number
    startNodeY: number
  } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    e.preventDefault()
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: position.x,
      startNodeY: position.y,
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      const dx = (ev.clientX - dragState.current.startMouseX) / viewportZoom
      const dy = (ev.clientY - dragState.current.startMouseY) / viewportZoom
      onUpdatePosition(nodeId, dragState.current.startNodeX + dx, dragState.current.startNodeY + dy)
    }

    const onUp = () => {
      dragState.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [nodeId, position.x, position.y, viewportZoom, onUpdatePosition])

  return { onMouseDown }
}
