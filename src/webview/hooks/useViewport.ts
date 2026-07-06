import { useState, useCallback, useRef } from 'react'
import { Viewport } from '../types/graph'

export function useViewport(initial: Viewport = { x: 0, y: 0, zoom: 1 }) {
  const [viewport, setViewportState] = useState<Viewport>(initial)
  const viewportRef = useRef<Viewport>(initial)
  const [cursor, setCursor] = useState<string>('default')

  const panState = useRef<{
    startX: number; startY: number; vpX: number; vpY: number
  } | null>(null)

  const setViewport = useCallback((vp: Viewport) => {
    viewportRef.current = vp
    setViewportState(vp)
  }, [])

  // Canvas.tsx에서 useEffect로 직접 등록할 네이티브 핸들러
  const nativeWheelHandler = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setViewportState((v) => {
      const newZoom = Math.max(0.05, Math.min(8, v.zoom * factor))
      const canvasMX = (e.clientX - v.x) / v.zoom
      const canvasMY = (e.clientY - v.y) / v.zoom
      const next = {
        zoom: newZoom,
        x: e.clientX - canvasMX * newZoom,
        y: e.clientY - canvasMY * newZoom,
      }
      viewportRef.current = next
      return next
    })
  }, [])

  // viewport 상태와 무관하게 ref에서 최신값 읽으므로 deps 불필요
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vp = viewportRef.current
    if (e.button === 0) {
      e.preventDefault()
      panState.current = {
        startX: e.clientX, startY: e.clientY,
        vpX: vp.x, vpY: vp.y,
      }
      setCursor('grabbing')
    }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (panState.current) {
      const dx = e.clientX - panState.current.startX
      const dy = e.clientY - panState.current.startY
      const next = { ...viewportRef.current, x: panState.current.vpX + dx, y: panState.current.vpY + dy }
      viewportRef.current = next
      setViewportState(next)
    }
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { panState.current = null; setCursor('default') }
  }, [])

  const onMouseLeave = useCallback(() => {
    panState.current = null
    setCursor('default')
  }, [])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  return {
    viewport, setViewport, cursor, nativeWheelHandler,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu,
  }
}
