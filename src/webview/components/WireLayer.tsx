import React from 'react'
import { GraphEdge, GraphNode } from '../types/graph'
import { getNearestPorts, getPortPosition, getSmartPath, Rect, Port } from '../utils/wireGeometry'

interface WireLayerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeSizes: Record<string, { width: number; height: number }>
  renderPositions: Record<string, { x: number; y: number }>
  wirePreview: { srcId: string; srcPort: Port; curX: number; curY: number } | null
  onDeleteEdge: (id: string) => void
}

const CANVAS_SIZE = 20000
const CANVAS_OFFSET = -10000
const DEFAULT_W = 240
const DEFAULT_H = 36

export function WireLayer({ nodes, edges, nodeSizes, renderPositions, wirePreview, onDeleteEdge }: WireLayerProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

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
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--vscode-editorWidget-border, #888)" />
        </marker>
        <marker id="arrowhead-preview" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--vscode-focusBorder, #007acc)" />
        </marker>
      </defs>
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
        const d = getSmartPath(srcPt, tgtPt, sourcePort, targetPort)

        return (
          <g key={edge.id}>
            {/* 투명 히트 영역 - pointer-events: stroke로 SVG none 오버라이드 */}
            <path d={d} fill="none" stroke="transparent" strokeWidth={12}
              style={{ pointerEvents: 'stroke' as any, cursor: 'pointer' }}
              onClick={() => onDeleteEdge(edge.id)} />
            {/* 시각적 선 */}
            <path
              d={d}
              fill="none"
              stroke="var(--vscode-editorWidget-border, #555)"
              strokeWidth={1.5}
              markerEnd={edge.type === 'arrow' ? 'url(#arrowhead)' : undefined}
              style={{ pointerEvents: 'none' }}
            />
            {edge.type === 'line' && (
              <>
                <circle cx={srcPt.x} cy={srcPt.y} r={4} fill="var(--vscode-editorWidget-border, #555)" />
                <circle cx={tgtPt.x} cy={tgtPt.y} r={4} fill="var(--vscode-editorWidget-border, #555)" />
              </>
            )}
            {edge.label && (
              <text
                x={(srcPt.x + tgtPt.x) / 2}
                y={(srcPt.y + tgtPt.y) / 2 - 6}
                fill="var(--vscode-editor-foreground, #ccc)"
                fontSize={11}
                textAnchor="middle"
                opacity={0.7}
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}
      {wirePreview && (() => {
        const srcNode = nodeMap.get(wirePreview.srcId)
        if (!srcNode) return null
        const srcPos = renderPositions[wirePreview.srcId] ?? srcNode.position
        const srcSize = nodeSizes[wirePreview.srcId] ?? { width: DEFAULT_W, height: DEFAULT_H }
        const srcRect: Rect = { x: srcPos.x, y: srcPos.y, width: srcSize.width, height: srcSize.height }
        const srcPt = getPortPosition(srcRect, wirePreview.srcPort)
        return (
          <line x1={srcPt.x} y1={srcPt.y} x2={wirePreview.curX} y2={wirePreview.curY}
            stroke="var(--vscode-focusBorder, #007acc)" strokeWidth={1.5} strokeDasharray="6 3"
            markerEnd="url(#arrowhead-preview)" style={{ pointerEvents: 'none' }} />
        )
      })()}
    </svg>
  )
}
