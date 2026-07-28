import React, { useMemo, useState, useEffect } from 'react'
import { GraphEdge, GraphNode } from '../types/graph'
import {
  getNearestPorts, getPortPosition, getRoutedPath,
  routeEdgesOnGrid, pointsToPath, spreadPoints, RouteRequest,
  Rect, Port,
} from '../utils/wireGeometry'

interface WireLayerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeSizes: Record<string, { width: number; height: number }>
  renderPositions: Record<string, { x: number; y: number }>
  wirePreview: { srcId: string; srcPort: Port; curX: number; curY: number } | null
  wireHoverTargetId: string | null
  selectedEdgeId: string | null
  highlightEdgeIds: Set<string>
  fastRoute: boolean
  zoom: number
  onSelectEdge: (id: string | null) => void
}

const CANVAS_SIZE = 20000
const CANVAS_OFFSET = -10000
const DEFAULT_W = 432
const DEFAULT_H = 36

interface NodeRect extends Rect {
  cx: number
  cy: number
}

function getRect(
  nodeId: string,
  renderPositions: Record<string, { x: number; y: number }>,
  nodeSizes: Record<string, { width: number; height: number }>,
  nodes: GraphNode[]
): NodeRect {
  const node = nodes.find((n) => n.id === nodeId)!
  const pos = renderPositions[nodeId] ?? node.position
  const size = nodeSizes[nodeId] ?? { width: DEFAULT_W, height: DEFAULT_H }
  return {
    x: pos.x, y: pos.y,
    width: size.width, height: size.height,
    cx: pos.x + size.width / 2,
    cy: pos.y + size.height / 2,
  }
}

export function WireLayer({ nodes, edges, nodeSizes, renderPositions, wirePreview, wireHoverTargetId, selectedEdgeId, highlightEdgeIds, fastRoute, zoom, onSelectEdge }: WireLayerProps) {
  // 화면상 선 두께가 항상 비슷하게 보이도록 보정: 확대(zoom>=1)할 땐 기본 두께 그대로,
  // 축소(zoom<1)할 땐 캔버스가 scale(zoom)으로 줄어드는 만큼 두께를 반대로 키워서
  // 화면 픽셀 기준 두께를 유지 — 안 그러면 축소했을 때 선/화살표가 너무 가늘어져 안 보임.
  // 화살표 marker는 markerUnits 기본값이 strokeWidth라서 path의 strokeWidth만 보정하면
  // 화살표 크기도 자동으로 같이 커진다(별도 처리 불필요).
  const zc = zoom < 1 ? 1 / zoom : 1
  // 지오메트리 모델 — 선택/하이라이트와 무관하게 노드·엣지 배치가 바뀔 때만 재계산
  const { nodeMap, allRects, spreadMap } = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // 라우팅 장애물: 모든 노드 rect (각 엣지에서 자기 양 끝 노드는 제외)
    const allRects = new Map<string, Rect>()
    for (const n of nodes) {
      const pos = renderPositions[n.id] ?? n.position
      const sz = nodeSizes[n.id] ?? { width: DEFAULT_W, height: DEFAULT_H }
      allRects.set(n.id, { x: pos.x, y: pos.y, width: sz.width, height: sz.height })
    }

    // main topic 백본(arrow) 엣지끼리 같은 source/target에 몰릴 때만 겹치지 않게 분산.
    // hop 자식(line) 엣지는 이제 라우팅 없는 고정 직선이라(아래 렌더 참고) spread가
    // 필요 없음 — 형제마다 target Y가 달라서 자연히 부채꼴로 갈라진다.
    const spreadMap = new Map<string, number>()
    const addSpread = (groups: Map<string, GraphEdge[]>, rectOf: (e: GraphEdge) => Rect) => {
      groups.forEach((group) => {
        if (group.length < 2) return
        const sorted = [...group].sort((a, b) => {
          const ra = rectOf(a), rb = rectOf(b)
          return (ra.y + ra.height / 2) - (rb.y + rb.height / 2)
        })
        sorted.forEach((e, idx) =>
          spreadMap.set(e.id, (spreadMap.get(e.id) ?? 0) + (idx - (sorted.length - 1) / 2) * 16))
      })
    }
    const bySrc = new Map<string, GraphEdge[]>()
    const byTgt = new Map<string, GraphEdge[]>()
    for (const e of edges) {
      if (e.type !== 'arrow') continue
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue
      if (!bySrc.has(e.source)) bySrc.set(e.source, [])
      bySrc.get(e.source)!.push(e)
      if (!byTgt.has(e.target)) byTgt.set(e.target, [])
      byTgt.get(e.target)!.push(e)
    }
    addSpread(bySrc, (e) => allRects.get(e.target)!)
    addSpread(byTgt, (e) => allRects.get(e.source)!)

    return { nodeMap, allRects, spreadMap }
  }, [nodes, edges, nodeSizes, renderPositions])

  // 그리드 A* 전역 라우팅 — 렌더 경로 밖에서 비동기로 실행. main topic 백본(arrow) 엣지만
  // 대상으로 한다 — hop 자식(line) 엣지는 라우팅 없는 고정 직선이라 대상에서 제외
  // (사용자 요청: "그 자식간에 대해서는 그냥 평범한 직선으로"). 레이아웃이 바뀌면
  // (fold/unfold 등) 일단 경량 휴리스틱으로 즉시 그리고, 변경이 잦아든 150ms 후
  // A* 정밀 경로로 교체 → fold/unfold 지연 없음. 드래그 중(fastRoute)에는 아예 스킵.
  const [gridRoutes, setGridRoutes] = useState<Record<string, Array<{ x: number; y: number }> | null> | null>(null)
  useEffect(() => {
    if (fastRoute) { setGridRoutes(null); return }
    setGridRoutes(null)
    const t = setTimeout(() => {
      const reqs: RouteRequest[] = []
      for (const edge of edges) {
        if (edge.type !== 'arrow') continue
        const srcR = allRects.get(edge.source), tgtR = allRects.get(edge.target)
        if (!srcR || !tgtR) continue
        const { sourcePort, targetPort } = getNearestPorts(srcR, tgtR)
        reqs.push({
          key: edge.id,
          src: getPortPosition(srcR, sourcePort),
          tgt: getPortPosition(tgtR, targetPort),
          srcId: edge.source,
          tgtId: edge.target,
        })
      }
      const rectList = [...allRects].map(([id, rect]) => ({ id, rect }))
      setGridRoutes(routeEdgesOnGrid(reqs, rectList))
    }, 150)
    return () => clearTimeout(t)
  }, [edges, allRects, fastRoute])

  return (
    <svg
      style={{
        position: 'absolute',
        left: CANVAS_OFFSET,
        top: CANVAS_OFFSET,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      viewBox={`${CANVAS_OFFSET} ${CANVAS_OFFSET} ${CANVAS_SIZE} ${CANVAS_SIZE}`}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#666" />
        </marker>
        <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#007acc" />
        </marker>
        <marker id="arrowhead-preview" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#007acc" />
        </marker>
        <marker id="arrowhead-gen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill="#ef4444" />
        </marker>
      </defs>

      {/* 드래그 중 타겟 노드 하이라이트 */}
      {wireHoverTargetId && (() => {
        const hNode = nodes.find(n => n.id === wireHoverTargetId)
        if (!hNode) return null
        const pos = renderPositions[wireHoverTargetId] ?? hNode.position
        const sz = nodeSizes[wireHoverTargetId] ?? { width: DEFAULT_W, height: DEFAULT_H }
        return (
          <rect
            x={pos.x - 4} y={pos.y - 4}
            width={sz.width + 8} height={sz.height + 8}
            fill="none"
            stroke="#007acc"
            strokeWidth={2 * zc}
            strokeDasharray={`${6 * zc} ${3 * zc}`}
            rx={6}
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}

      {/* 개별 엣지 — main topic 백본(arrow)만 라우팅, 그 외(line)는 고정 직선 */}
      {edges.map((edge) => {
        const srcNode = nodeMap.get(edge.source)
        const tgtNode = nodeMap.get(edge.target)
        if (!srcNode || !tgtNode) return null

        const srcPos = renderPositions[edge.source] ?? srcNode.position
        const tgtPos = renderPositions[edge.target] ?? tgtNode.position
        const srcSize = nodeSizes[edge.source] ?? { width: DEFAULT_W, height: DEFAULT_H }
        const tgtSize = nodeSizes[edge.target] ?? { width: DEFAULT_W, height: DEFAULT_H }

        const srcRect: Rect = { x: srcPos.x, y: srcPos.y, width: srcSize.width, height: srcSize.height }
        const tgtRect: Rect = { x: tgtPos.x, y: tgtPos.y, width: tgtSize.width, height: tgtSize.height }

        const { sourcePort, targetPort } = getNearestPorts(srcRect, tgtRect)
        const srcPt = getPortPosition(srcRect, sourcePort)
        const tgtPt = getPortPosition(tgtRect, targetPort)
        let d: string
        if (edge.type !== 'arrow') {
          // hop 자식 연결: 라우팅/베지어 없이 포트-포트 직선 그대로
          // (사용자 요청: "그 자식간에 대해서는 그냥 평범한 직선으로")
          d = `M ${srcPt.x} ${srcPt.y} L ${tgtPt.x} ${tgtPt.y}`
        } else {
          const spread = spreadMap.get(edge.id) ?? 0
          const gridPts = gridRoutes ? gridRoutes[edge.id] : null
          const obstacles: Rect[] = []
          allRects.forEach((r, id) => { if (id !== edge.source && id !== edge.target) obstacles.push(r) })
          if (gridPts && gridPts.length > 2) {
            // 그리드 A* 경로 (노드 회피 + congestion 분산) + 같은 소스/타겟 묶음 분산
            // blockers를 넘겨서 장애물 근처 경유점은 둥글리지 않고 직선으로 꺾음(코너 부풀림 방지)
            d = pointsToPath(spreadPoints(gridPts, spread), obstacles)
          } else if (gridPts) {
            // 직선 경로: 기존 bezier 모양 유지
            d = getRoutedPath(srcPt, tgtPt, sourcePort, targetPort, [], spread)
          } else {
            // 드래그 중(fast) 또는 A* 실패: 경량 우회 휴리스틱
            d = getRoutedPath(srcPt, tgtPt, sourcePort, targetPort, obstacles, spread)
          }
        }
        const isSel = selectedEdgeId === edge.id
        const isGen = !isSel && highlightEdgeIds.has(edge.id)
        const strokeColor = isSel ? '#007acc' : isGen ? '#ef4444' : '#666'

        return (
          <g key={edge.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={12 * zc}
              style={{ pointerEvents: 'stroke' as any, cursor: 'pointer' }}
              onMouseDown={(e) => { e.stopPropagation(); onSelectEdge(edge.id) }} />
            <path
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={(isSel || isGen ? 2.5 : 1.5) * zc}
              markerEnd={edge.type === 'arrow' ? (isSel ? 'url(#arrowhead-selected)' : isGen ? 'url(#arrowhead-gen)' : 'url(#arrowhead)') : undefined}
              style={{ pointerEvents: 'none' }}
              data-edge-id={edge.id}
              data-edge-source={edge.source}
              data-edge-target={edge.target}
            />
            {edge.type === 'line' && (
              <>
                <circle cx={srcPt.x} cy={srcPt.y} r={4 * zc} fill={strokeColor} />
                <circle cx={tgtPt.x} cy={tgtPt.y} r={4 * zc} fill={strokeColor} />
              </>
            )}
          </g>
        )
      })}

      {/* 드래그 중인 wire 미리보기 */}
      {wirePreview && (() => {
        const srcNode = nodeMap.get(wirePreview.srcId)
        if (!srcNode) return null
        const srcPos = renderPositions[wirePreview.srcId] ?? srcNode.position
        const srcSize = nodeSizes[wirePreview.srcId] ?? { width: DEFAULT_W, height: DEFAULT_H }
        const srcRect: Rect = { x: srcPos.x, y: srcPos.y, width: srcSize.width, height: srcSize.height }
        const srcPt = getPortPosition(srcRect, wirePreview.srcPort)
        return (
          <line x1={srcPt.x} y1={srcPt.y} x2={wirePreview.curX} y2={wirePreview.curY}
            stroke="#007acc" strokeWidth={2 * zc} strokeDasharray={`${6 * zc} ${3 * zc}`}
            markerEnd="url(#arrowhead-preview)" style={{ pointerEvents: 'none' }} />
        )
      })()}
    </svg>
  )
}
