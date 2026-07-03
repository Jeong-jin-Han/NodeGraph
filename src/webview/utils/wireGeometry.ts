export type Port = 'top' | 'right' | 'bottom' | 'left'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function getNearestPorts(source: Rect, target: Rect): { sourcePort: Port; targetPort: Port } {
  // HTML viewer의 getBestPorts와 동일: 모든 포트 쌍 중 픽셀 거리 최솟값 선택
  const sp: { name: Port; x: number; y: number }[] = [
    { name: 'right',  x: source.x + source.width,      y: source.y + source.height / 2 },
    { name: 'left',   x: source.x,                      y: source.y + source.height / 2 },
    { name: 'bottom', x: source.x + source.width / 2,   y: source.y + source.height },
    { name: 'top',    x: source.x + source.width / 2,   y: source.y },
  ]
  const tp: { name: Port; x: number; y: number }[] = [
    { name: 'left',   x: target.x,                      y: target.y + target.height / 2 },
    { name: 'right',  x: target.x + target.width,       y: target.y + target.height / 2 },
    { name: 'top',    x: target.x + target.width / 2,   y: target.y },
    { name: 'bottom', x: target.x + target.width / 2,   y: target.y + target.height },
  ]
  let best = { sourcePort: 'right' as Port, targetPort: 'left' as Port }
  let bestD = Infinity
  for (const s of sp) {
    for (const t of tp) {
      const d = (s.x - t.x) ** 2 + (s.y - t.y) ** 2
      if (d < bestD) { bestD = d; best = { sourcePort: s.name, targetPort: t.name } }
    }
  }
  return best
}

export function getPortPosition(rect: Rect, port: Port): { x: number; y: number } {
  switch (port) {
    case 'top':    return { x: rect.x + rect.width / 2, y: rect.y }
    case 'bottom': return { x: rect.x + rect.width / 2, y: rect.y + rect.height }
    case 'left':   return { x: rect.x, y: rect.y + rect.height / 2 }
    case 'right':  return { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
  }
}

const PORT_DIR: Record<Port, [number, number]> = {
  right:  [ 1,  0],
  left:   [-1,  0],
  bottom: [ 0,  1],
  top:    [ 0, -1],
}

export function getSmartPath(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourcePort: Port,
  targetPort: Port
): string {
  const sx = sourcePos.x, sy = sourcePos.y
  const tx = targetPos.x, ty = targetPos.y
  const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2)
  const bend = Math.min(dist * 0.45, 150)
  const [sdx, sdy] = PORT_DIR[sourcePort]
  const [tdx, tdy] = PORT_DIR[targetPort]
  const cx1 = sx + sdx * bend
  const cy1 = sy + sdy * bend
  const cx2 = tx + tdx * bend
  const cy2 = ty + tdy * bend
  return `M ${sx} ${sy} C ${cx1} ${cy1} ${cx2} ${cy2} ${tx} ${ty}`
}
