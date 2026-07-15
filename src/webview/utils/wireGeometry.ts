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

// 경유점 폴리라인 → 부드러운 SVG path (경유점 = Q 제어점, 다음 경유점과의 중점 연결)
export function pointsToPath(P: Array<{ x: number; y: number }>): string {
  if (P.length < 2) return ''
  if (P.length === 2) return `M ${P[0].x} ${P[0].y} L ${P[1].x} ${P[1].y}`
  let d = `M ${P[0].x} ${P[0].y}`
  for (let k = 1; k < P.length - 1; k++) {
    const end = k < P.length - 2
      ? { x: (P[k].x + P[k + 1].x) / 2, y: (P[k].y + P[k + 1].y) / 2 }
      : P[P.length - 1]
    d += ` Q ${P[k].x} ${P[k].y} ${end.x} ${end.y}`
  }
  return d
}

// 폴리라인의 중간 경유점들을 src→tgt 법선 방향으로 spread만큼 이동 (평행 엣지 분산)
export function spreadPoints(
  pts: Array<{ x: number; y: number }>,
  spread: number
): Array<{ x: number; y: number }> {
  if (!spread || pts.length < 3) return pts
  const s = pts[0], t = pts[pts.length - 1]
  const dl = dlen(s, t) || 1
  const nx = -(t.y - s.y) / dl, ny = (t.x - s.x) / dl
  return [s, ...pts.slice(1, -1).map(p => ({ x: p.x + nx * spread, y: p.y + ny * spread })), t]
}

// ── 그리드 A* 전역 라우팅 ─────────────────────────────────────────────────
// 셀 비용: 노드 내부 200(불가피하면 통과 가능), 노드 주변 1셀 밴드 8(거리 유지),
// 이미 확정된 선이 지나간 셀 +14(선끼리 분산 — 빈 공간이 있으면 그쪽으로 우회).
// 짧은 엣지부터 순서대로 라우팅하며 congestion 비용을 누적한다.
export interface RouteRequest {
  key: string
  src: { x: number; y: number }
  tgt: { x: number; y: number }
  srcId: string
  tgtId: string
}

export function routeEdgesOnGrid(
  reqs: RouteRequest[],
  rects: Array<{ id: string; rect: Rect }>
): Record<string, Array<{ x: number; y: number }> | null> {
  const out: Record<string, Array<{ x: number; y: number }> | null> = {}
  if (reqs.length === 0) return out
  const NEAR = 8, INSIDE = 200, USE = 14, TURN = 0.4

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const { rect } of rects) {
    minX = Math.min(minX, rect.x); minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width); maxY = Math.max(maxY, rect.y + rect.height)
  }
  for (const r of reqs) {
    minX = Math.min(minX, r.src.x, r.tgt.x); minY = Math.min(minY, r.src.y, r.tgt.y)
    maxX = Math.max(maxX, r.src.x, r.tgt.x); maxY = Math.max(maxY, r.src.y, r.tgt.y)
  }
  minX -= 80; minY -= 80; maxX += 80; maxY += 80
  let cell = 24
  while (((maxX - minX) / cell) * ((maxY - minY) / cell) > 150000) cell *= 2
  const gw = Math.max(2, Math.ceil((maxX - minX) / cell))
  const gh = Math.max(2, Math.ceil((maxY - minY) / cell))
  const N = gw * gh
  const cellX = (x: number) => Math.min(gw - 1, Math.max(0, Math.floor((x - minX) / cell)))
  const cellY = (y: number) => Math.min(gh - 1, Math.max(0, Math.floor((y - minY) / cell)))

  const baseCost = new Float64Array(N)
  for (const { rect } of rects) {
    const ox0 = cellX(rect.x - cell), ox1 = cellX(rect.x + rect.width + cell)
    const oy0 = cellY(rect.y - cell), oy1 = cellY(rect.y + rect.height + cell)
    const ix0 = cellX(rect.x), ix1 = cellX(rect.x + rect.width)
    const iy0 = cellY(rect.y), iy1 = cellY(rect.y + rect.height)
    for (let gy = oy0; gy <= oy1; gy++)
      for (let gx = ox0; gx <= ox1; gx++) {
        const inside = gx >= ix0 && gx <= ix1 && gy >= iy0 && gy <= iy1
        baseCost[gy * gw + gx] += inside ? INSIDE : NEAR
      }
  }
  const useCost = new Float64Array(N)
  const gScore = new Float64Array(N)
  const stampArr = new Int32Array(N)
  const fromArr = new Int32Array(N)
  const dirArr = new Int8Array(N)
  let stamp = 0

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  const STEP = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2]

  // 짧은 엣지부터 (동률이면 srcId/tgtId 사전순 — 에디터/HTML 결과 일치 보장)
  const order = [...reqs].sort((a, b) =>
    (dlen(a.src, a.tgt) - dlen(b.src, b.tgt)) ||
    (a.srcId < b.srcId ? -1 : a.srcId > b.srcId ? 1 : 0) ||
    (a.tgtId < b.tgtId ? -1 : a.tgtId > b.tgtId ? 1 : 0)
  )

  for (const req of order) {
    const sIdx = cellY(req.src.y) * gw + cellX(req.src.x)
    const tIdx = cellY(req.tgt.y) * gw + cellX(req.tgt.x)
    if (sIdx === tIdx) { out[req.key] = [req.src, req.tgt]; continue }
    stamp++

    const heapF: number[] = [], heapI: number[] = []
    const hpush = (f: number, idx: number) => {
      let i = heapF.length
      heapF.push(f); heapI.push(idx)
      while (i > 0) {
        const p = (i - 1) >> 1
        if (heapF[p] <= heapF[i]) break
        const tf = heapF[p]; heapF[p] = heapF[i]; heapF[i] = tf
        const ti = heapI[p]; heapI[p] = heapI[i]; heapI[i] = ti
        i = p
      }
    }
    const hpop = (): number => {
      const top = heapI[0]
      const lf = heapF.pop()!, li = heapI.pop()!
      if (heapF.length) {
        heapF[0] = lf; heapI[0] = li
        let i = 0
        for (;;) {
          const l = i * 2 + 1, r = l + 1
          let m = i
          if (l < heapF.length && heapF[l] < heapF[m]) m = l
          if (r < heapF.length && heapF[r] < heapF[m]) m = r
          if (m === i) break
          const tf = heapF[m]; heapF[m] = heapF[i]; heapF[i] = tf
          const ti = heapI[m]; heapI[m] = heapI[i]; heapI[i] = ti
          i = m
        }
      }
      return top
    }
    // h = 유클리드 거리 (admissible/consistent — 셀당 1회 확장 보장; 가중 h는 재확장 폭발로 역효과)
    const tgx = tIdx % gw, tgy = (tIdx / gw) | 0
    const hDist = (idx: number) => Math.hypot((idx % gw) - tgx, ((idx / gw) | 0) - tgy)

    gScore[sIdx] = 0; stampArr[sIdx] = stamp; fromArr[sIdx] = -1; dirArr[sIdx] = -1
    hpush(hDist(sIdx), sIdx)
    let found = false
    let iter = 0
    while (heapF.length && iter < 60000) {
      iter++
      const cur = hpop()
      if (cur === tIdx) { found = true; break }
      const cgx = cur % gw, cgy = (cur / gw) | 0
      const cg = gScore[cur], cd = dirArr[cur]
      for (let di = 0; di < 8; di++) {
        const ngx = cgx + DIRS[di][0], ngy = cgy + DIRS[di][1]
        if (ngx < 0 || ngy < 0 || ngx >= gw || ngy >= gh) continue
        const nIdx = ngy * gw + ngx
        const ng = cg + STEP[di] + baseCost[nIdx] + useCost[nIdx] + (cd !== -1 && cd !== di ? TURN : 0)
        if (stampArr[nIdx] === stamp && gScore[nIdx] <= ng) continue
        stampArr[nIdx] = stamp; gScore[nIdx] = ng; fromArr[nIdx] = cur; dirArr[nIdx] = di as number
        hpush(ng + hDist(nIdx), nIdx)
      }
    }
    if (!found) { out[req.key] = null; continue }

    // 경로 복원 (셀 중심) — 양 끝은 실제 포트 좌표로 대체
    const cellsRev: number[] = []
    for (let c = tIdx; c !== -1; c = fromArr[c]) cellsRev.push(c)
    cellsRev.reverse()
    const raw = cellsRev.map(c => ({
      x: minX + (c % gw) * cell + cell / 2,
      y: minY + ((c / gw) | 0) * cell + cell / 2,
    }))
    raw[0] = { x: req.src.x, y: req.src.y }
    raw[raw.length - 1] = { x: req.tgt.x, y: req.tgt.y }

    // string pulling: 자기 양끝 노드를 제외한 노드 내부를 지나지 않는 한 직선화
    const blockers: Rect[] = []
    for (const { id, rect } of rects) if (id !== req.srcId && id !== req.tgtId) blockers.push(rect)
    const clearSeg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      for (const r of blockers) if (segIntersectsRect(a.x, a.y, b.x, b.y, r, 6) !== null) return false
      return true
    }
    const pts = [raw[0]]
    let i = 0
    while (i < raw.length - 1) {
      let j = raw.length - 1
      while (j > i + 1 && !clearSeg(raw[i], raw[j])) j--
      pts.push(raw[j])
      i = j
    }
    out[req.key] = pts

    // 이후 엣지의 congestion 비용: 확정 경로가 지나는 셀에 가산
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1]
      const steps = Math.max(1, Math.ceil(dlen(a, b) / cell))
      for (let s = 0; s <= steps; s++) {
        const px = a.x + (b.x - a.x) * (s / steps)
        const py = a.y + (b.y - a.y) * (s / steps)
        useCost[cellY(py) * gw + cellX(px)] += USE
      }
    }
  }
  return out
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
