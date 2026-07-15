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

export function WireLayer({ nodes, edges, nodeSizes, renderPositions, wirePreview, wireHoverTargetId, selectedEdgeId, highlightEdgeIds, fastRoute, onSelectEdge }: WireLayerProps) {
  // 지오메트리 모델 — 선택/하이라이트와 무관하게 노드·엣지 배치가 바뀔 때만 재계산
  const { nodeMap, busGroups, busEdgeIds, allRects, spreadMap } = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // line 엣지를 source별로 grouping
    const lineBySource = new Map<string, GraphEdge[]>()
    for (const edge of edges) {
      if (edge.type !== 'line') continue
      if (!lineBySource.has(edge.source)) lineBySource.set(edge.source, [])
      lineBySource.get(edge.source)!.push(edge)
    }

    // bus 라우팅 대상 엣지 ID 집합
    const busEdgeIds = new Set<string>()
    const busGroups: Array<{ srcId: string; edgeGroup: GraphEdge[] }> = []
    lineBySource.forEach((group, srcId) => {
      if (group.length < 2) return
      if (!nodeMap.has(srcId)) return
      const sr = getRect(srcId, renderPositions, nodeSizes, nodes)
      // 모든 타겟의 왼쪽 끝이 source 오른쪽 끝 + 40px 이상일 때만 bus.
      // 중심 기준 비교는 폭이 넓은 타겟에서 트렁크 X가 source보다 왼쪽으로 계산되어
      // 허공을 지나는 퇴화 버스를 만들었음 (HTML과 조건 통일)
      const valid = group.every((e) => {
        if (!nodeMap.has(e.target)) return false
        const tr = getRect(e.target, renderPositions, nodeSizes, nodes)
        return tr.x > sr.x + sr.width + 40
      })
      if (!valid) return
      busGroups.push({ srcId, edgeGroup: group })
      group.forEach((e) => busEdgeIds.add(e.id))
    })

    // 라우팅 장애물: 모든 노드 rect (각 엣지에서 자기 양 끝 노드는 제외)
    const allRects = new Map<string, Rect>()
    for (const n of nodes) {
      const pos = renderPositions[n.id] ?? n.position
      const sz = nodeSizes[n.id] ?? { width: DEFAULT_W, height: DEFAULT_H }
      allRects.set(n.id, { x: pos.x, y: pos.y, width: sz.width, height: sz.height })
    }

    // 같은 source에서 나가거나 같은 target으로 모이는 비-버스 엣지들은
    // 겹치지 않게 분산(spread) 오프셋 부여 — 두 그룹 오프셋 합산
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
      if (busEdgeIds.has(e.id)) continue
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue
      if (!bySrc.has(e.source)) bySrc.set(e.source, [])
      bySrc.get(e.source)!.push(e)
      if (!byTgt.has(e.target)) byTgt.set(e.target, [])
      byTgt.get(e.target)!.push(e)
    }
    addSpread(bySrc, (e) => allRects.get(e.target)!)
    addSpread(byTgt, (e) => allRects.get(e.source)!)

    return { nodeMap, busGroups, busEdgeIds, allRects, spreadMap }
  }, [nodes, edges, nodeSizes, renderPositions])

  // 그리드 A* 전역 라우팅 — 렌더 경로 밖에서 비동기로 실행.
  // 레이아웃이 바뀌면(fold/unfold 등) 일단 경량 휴리스틱으로 즉시 그리고,
  // 변경이 잦아든 150ms 후 A* 정밀 경로로 교체 → fold/unfold 지연 없음.
  // 드래그 중(fastRoute)에는 아예 스킵.
  const [gridRoutes, setGridRoutes] = useState<Record<string, Array<{ x: number; y: number }> | null> | null>(null)
  useEffect(() => {
    if (fastRoute) { setGridRoutes(null); return }
    setGridRoutes(null)
    const t = setTimeout(() => {
      const reqs: RouteRequest[] = []
      for (const edge of edges) {
        if (busEdgeIds.has(edge.id)) continue
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
  }, [edges, busEdgeIds, allRects, fastRoute])

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
            strokeWidth={2}
            strokeDasharray="6 3"
            rx={6}
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}

      {/* Bus 라우팅 그룹 */}
      {busGroups.map(({ srcId, edgeGroup }) => {
        const sr = getRect(srcId, renderPositions, nodeSizes, nodes)
        const targets = edgeGroup
          .filter((e) => nodeMap.has(e.target))
          .map((e) => ({ edge: e, r: getRect(e.target, renderPositions, nodeSizes, nodes) }))
        if (targets.length < 2) return null

        const srcAnchorX = sr.x + sr.width
        const srcAnchorY = sr.cy
        const targetLeftX = Math.min(...targets.map((t) => t.r.x))
        const busX = srcAnchorX + (targetLeftX - srcAnchorX) * 0.5
        const allCY = [srcAnchorY, ...targets.map((t) => t.r.cy)]
        const busMinY = Math.min(...allCY)
        const busMaxY = Math.max(...allCY)

        // 세대 하이라이트: 그룹 내 하이라이트 엣지가 있으면 트렁크(공용 구간)도 빨간색
        const groupGen = edgeGroup.some((e) => highlightEdgeIds.has(e.id))
        const trunkColor = groupGen ? '#ef4444' : '#888'
        const trunkW = groupGen ? 2.5 : 1.5
        return (
          <g key={`bus-${srcId}`}>
            {/* source → bus 수평선 */}
            <line x1={srcAnchorX} y1={srcAnchorY} x2={busX} y2={srcAnchorY}
              stroke={trunkColor} strokeWidth={trunkW} style={{ pointerEvents: 'none' }} />
            {/* 수직 버스 */}
            <line x1={busX} y1={busMinY} x2={busX} y2={busMaxY}
              stroke={trunkColor} strokeWidth={trunkW} style={{ pointerEvents: 'none' }} />
            {/* source 끝점 circle */}
            <circle cx={srcAnchorX} cy={srcAnchorY} r={4} fill={trunkColor} />
            {/* 각 타겟으로 수평 분기 + 클릭 히트 영역 */}
            {targets.map(({ edge, r }) => {
              const isSel = selectedEdgeId === edge.id
              const isGen = !isSel && highlightEdgeIds.has(edge.id)
              const branchColor = isSel ? '#007acc' : isGen ? '#ef4444' : '#888'
              return (
                <g key={edge.id}>
                  <line x1={busX} y1={r.cy} x2={r.x} y2={r.cy}
                    stroke="transparent" strokeWidth={12}
                    style={{ pointerEvents: 'stroke' as any, cursor: 'pointer' }}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectEdge(edge.id) }} />
                  <line x1={busX} y1={r.cy} x2={r.x} y2={r.cy}
                    stroke={branchColor} strokeWidth={isSel || isGen ? 2.5 : 1.5}
                    style={{ pointerEvents: 'none' }} />
                  <circle cx={r.x} cy={r.cy} r={4} fill={branchColor} />
                </g>
              )
            })}
          </g>
        )
      })}

      {/* 개별 엣지 (Bezier / L자) */}
      {edges.map((edge) => {
        if (busEdgeIds.has(edge.id)) return null
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
        const spread = spreadMap.get(edge.id) ?? 0
        const gridPts = gridRoutes ? gridRoutes[edge.id] : null
        let d: string
        if (gridPts && gridPts.length > 2) {
          // 그리드 A* 경로 (노드 회피 + congestion 분산) + 같은 소스/타겟 묶음 분산
          d = pointsToPath(spreadPoints(gridPts, spread))
        } else if (gridPts) {
          // 직선 경로: 기존 bezier 모양 유지
          d = getRoutedPath(srcPt, tgtPt, sourcePort, targetPort, [], spread)
        } else {
          // 드래그 중(fast) 또는 A* 실패: 경량 우회 휴리스틱
          const obstacles: Rect[] = []
          allRects.forEach((r, id) => { if (id !== edge.source && id !== edge.target) obstacles.push(r) })
          d = getRoutedPath(srcPt, tgtPt, sourcePort, targetPort, obstacles, spread)
        }
        const isSel = selectedEdgeId === edge.id
        const isGen = !isSel && highlightEdgeIds.has(edge.id)
        const strokeColor = isSel ? '#007acc' : isGen ? '#ef4444' : '#666'

        return (
          <g key={edge.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={12}
              style={{ pointerEvents: 'stroke' as any, cursor: 'pointer' }}
              onMouseDown={(e) => { e.stopPropagation(); onSelectEdge(edge.id) }} />
            <path
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isSel || isGen ? 2.5 : 1.5}
              markerEnd={edge.type === 'arrow' ? (isSel ? 'url(#arrowhead-selected)' : isGen ? 'url(#arrowhead-gen)' : 'url(#arrowhead)') : undefined}
              style={{ pointerEvents: 'none' }}
            />
            {edge.type === 'line' && (
              <>
                <circle cx={srcPt.x} cy={srcPt.y} r={4} fill={strokeColor} />
                <circle cx={tgtPt.x} cy={tgtPt.y} r={4} fill={strokeColor} />
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
            stroke="#007acc" strokeWidth={2} strokeDasharray="6 3"
            markerEnd="url(#arrowhead-preview)" style={{ pointerEvents: 'none' }} />
        )
      })()}
    </svg>
  )
}
