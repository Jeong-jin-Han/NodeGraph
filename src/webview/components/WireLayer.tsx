import React from 'react'
import { GraphEdge, GraphNode } from '../types/graph'
import { getNearestPorts, getPortPosition, getSmartPath, Rect, Port } from '../utils/wireGeometry'

interface WireLayerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeSizes: Record<string, { width: number; height: number }>
  renderPositions: Record<string, { x: number; y: number }>
  wirePreview: { srcId: string; srcPort: Port; curX: number; curY: number } | null
  wireHoverTargetId: string | null
  selectedEdgeId: string | null
  highlightEdgeIds: Set<string>
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

export function WireLayer({ nodes, edges, nodeSizes, renderPositions, wirePreview, wireHoverTargetId, selectedEdgeId, highlightEdgeIds, onSelectEdge }: WireLayerProps) {
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
    // 모든 타겟이 source 오른쪽에 있을 때만 bus
    const valid = group.every((e) => {
      if (!nodeMap.has(e.target)) return false
      const tr = getRect(e.target, renderPositions, nodeSizes, nodes)
      return (tr.x + tr.width / 2) > (sr.x + sr.width / 2)
    })
    if (!valid) return
    busGroups.push({ srcId, edgeGroup: group })
    group.forEach((e) => busEdgeIds.add(e.id))
  })

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
          <polygon points="0 0,10 3.5,0 7" fill="#f59e0b" />
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

        // 세대 하이라이트: 그룹 내 하이라이트 엣지가 있으면 트렁크(공용 구간)도 노란색
        const groupGen = edgeGroup.some((e) => highlightEdgeIds.has(e.id))
        const trunkColor = groupGen ? '#f59e0b' : '#888'
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
              const branchColor = isSel ? '#007acc' : isGen ? '#f59e0b' : '#888'
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
        const d = getSmartPath(srcPt, tgtPt, sourcePort, targetPort)
        const isSel = selectedEdgeId === edge.id
        const isGen = !isSel && highlightEdgeIds.has(edge.id)
        const strokeColor = isSel ? '#007acc' : isGen ? '#f59e0b' : '#666'

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
