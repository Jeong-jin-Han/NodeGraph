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

// ── 장애물 회피 라우팅 ────────────────────────────────────────────────────
// 선분이 (pad만큼 부풀린) 사각형과 교차하면 진입 t(0~1)를 반환, 아니면 null (Liang-Barsky)
function segIntersectsRect(
  x1: number, y1: number, x2: number, y2: number, r: Rect, pad: number
): number | null {
  const rx = r.x - pad, ry = r.y - pad
  const rw = r.width + pad * 2, rh = r.height + pad * 2
  const dx = x2 - x1, dy = y2 - y1
  let t0 = 0, t1 = 1
  const p = [-dx, dx, -dy, dy]
  const q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null
    } else {
      const t = q[i] / p[i]
      if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t }
      else { if (t < t0) return null; if (t < t1) t1 = t }
    }
  }
  return t0
}

const dlen = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(b.x - a.x, b.y - a.y)

// src→tgt 직선이 장애물(노드)을 관통하면 위/아래(또는 좌/우)로 우회하는
// 경유점을 삽입해 폴리라인 반환. 짧은 쪽 우회를 선택하며, 경유점 6개/반복 16회로 제한
export function routeAroundObstacles(
  src: { x: number; y: number },
  tgt: { x: number; y: number },
  obstacles: Rect[]
): Array<{ x: number; y: number }> {
  const PAD = 10, CLEAR = 34
  const pts: Array<{ x: number; y: number }> = [src, tgt]
  let guard = 0
  let i = 0
  while (i < pts.length - 1 && guard < 16 && pts.length < 8) {
    guard++
    const a = pts[i], b = pts[i + 1]
    let hit: Rect | null = null
    let hitT = Infinity
    for (const r of obstacles) {
      const t = segIntersectsRect(a.x, a.y, b.x, b.y, r, PAD)
      if (t !== null && t < hitT) { hitT = t; hit = r }
    }
    if (!hit) { i++; continue }
    const horiz = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
    let w: { x: number; y: number }
    if (horiz) {
      const top = { x: hit.x + hit.width / 2, y: hit.y - CLEAR }
      const bot = { x: hit.x + hit.width / 2, y: hit.y + hit.height + CLEAR }
      w = dlen(a, top) + dlen(top, b) <= dlen(a, bot) + dlen(bot, b) ? top : bot
    } else {
      const lft = { x: hit.x - CLEAR, y: hit.y + hit.height / 2 }
      const rgt = { x: hit.x + hit.width + CLEAR, y: hit.y + hit.height / 2 }
      w = dlen(a, lft) + dlen(lft, b) <= dlen(a, rgt) + dlen(rgt, b) ? lft : rgt
    }
    // 진전 없는 경유점(기존 점과 동일 위치)이면 포기하고 다음 세그먼트로
    if (pts.some(p => Math.abs(p.x - w.x) < 1 && Math.abs(p.y - w.y) < 1)) { i++; continue }
    pts.splice(i + 1, 0, w)
    // i 유지 → a→w 세그먼트를 다시 검사
  }
  return pts
}

// 장애물 회피 + 평행 엣지 분산(spread)이 적용된 SVG path.
// 우회가 필요 없으면 기존 bezier 모양 유지 (spread만큼 제어점을 법선 방향으로 이동)
export function getRoutedPath(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourcePort: Port,
  targetPort: Port,
  obstacles: Rect[],
  spread: number
): string {
  const pts = routeAroundObstacles(sourcePos, targetPos, obstacles)
  const dx = targetPos.x - sourcePos.x, dy = targetPos.y - sourcePos.y
  const dl = Math.hypot(dx, dy) || 1
  const nx = -dy / dl, ny = dx / dl

  if (pts.length === 2) {
    const sx = sourcePos.x, sy = sourcePos.y
    const tx = targetPos.x, ty = targetPos.y
    const bend = Math.min(dl * 0.45, 150)
    const [sdx, sdy] = PORT_DIR[sourcePort]
    const [tdx, tdy] = PORT_DIR[targetPort]
    const cx1 = sx + sdx * bend + nx * spread
    const cy1 = sy + sdy * bend + ny * spread
    const cx2 = tx + tdx * bend + nx * spread
    const cy2 = ty + tdy * bend + ny * spread
    return `M ${sx} ${sy} C ${cx1} ${cy1} ${cx2} ${cy2} ${tx} ${ty}`
  }

  // 경유점을 지나는 부드러운 곡선 (경유점 = Q 제어점, 다음 경유점과의 중점에서 연결)
  const inner = pts.slice(1, -1).map(p => ({ x: p.x + nx * spread, y: p.y + ny * spread }))
  const P = [pts[0], ...inner, pts[pts.length - 1]]
  let d = `M ${P[0].x} ${P[0].y}`
  for (let k = 1; k < P.length - 1; k++) {
    const end = k < P.length - 2
      ? { x: (P[k].x + P[k + 1].x) / 2, y: (P[k].y + P[k + 1].y) / 2 }
      : P[P.length - 1]
    d += ` Q ${P[k].x} ${P[k].y} ${end.x} ${end.y}`
  }
  return d
}
