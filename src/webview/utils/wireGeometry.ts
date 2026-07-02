export type Port = 'top' | 'right' | 'bottom' | 'left'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function getNearestPorts(source: Rect, target: Rect): { sourcePort: Port; targetPort: Port } {
  const sCx = source.x + source.width / 2
  const sCy = source.y + source.height / 2
  const tCx = target.x + target.width / 2
  const tCy = target.y + target.height / 2
  const dx = tCx - sCx
  const dy = tCy - sCy

  const normDx = dx / ((source.width + target.width) / 2 + 1)
  const normDy = dy / ((source.height + target.height) / 2 + 1)

  if (Math.abs(normDx) > Math.abs(normDy)) {
    return dx > 0
      ? { sourcePort: 'right', targetPort: 'left' }
      : { sourcePort: 'left', targetPort: 'right' }
  } else {
    return dy > 0
      ? { sourcePort: 'bottom', targetPort: 'top' }
      : { sourcePort: 'top', targetPort: 'bottom' }
  }
}

export function getPortPosition(rect: Rect, port: Port): { x: number; y: number } {
  switch (port) {
    case 'top':    return { x: rect.x + rect.width / 2, y: rect.y }
    case 'bottom': return { x: rect.x + rect.width / 2, y: rect.y + rect.height }
    case 'left':   return { x: rect.x, y: rect.y + rect.height / 2 }
    case 'right':  return { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
  }
}

// 수평 포트 간 L자형 직선 경로 (코너만 살짝 라운드)
function getLShapedPath(
  src: { x: number; y: number },
  tgt: { x: number; y: number }
): string {
  const yDiff = tgt.y - src.y
  const r = 8  // 코너 라운드 반지름

  if (Math.abs(yDiff) < 2) {
    return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`
  }

  const yDir = yDiff > 0 ? 1 : -1
  const vtX = (src.x + tgt.x) / 2

  // src → vtX 방향
  const srcHDir = vtX > src.x ? 1 : -1
  // vtX → tgt 방향
  const tgtHDir = tgt.x > vtX ? 1 : -1

  return [
    `M ${src.x} ${src.y}`,
    `L ${vtX - srcHDir * r} ${src.y}`,
    `Q ${vtX} ${src.y} ${vtX} ${src.y + yDir * r}`,
    `L ${vtX} ${tgt.y - yDir * r}`,
    `Q ${vtX} ${tgt.y} ${vtX + tgtHDir * r} ${tgt.y}`,
    `L ${tgt.x} ${tgt.y}`,
  ].join(' ')
}

// 수직 포트 간 직선 경로
function getStraightPath(
  src: { x: number; y: number },
  tgt: { x: number; y: number }
): string {
  return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`
}

export function getSmartPath(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourcePort: Port,
  targetPort: Port
): string {
  const dx = Math.abs(targetPos.x - sourcePos.x)

  // 수평 포트 + 충분한 x 거리 → L자형 직선
  if (
    dx > 80 &&
    (sourcePort === 'left' || sourcePort === 'right') &&
    (targetPort === 'left' || targetPort === 'right')
  ) {
    return getLShapedPath(sourcePos, targetPos)
  }

  // 그 외(백본 수직 연결 등) → 직선
  return getStraightPath(sourcePos, targetPos)
}
