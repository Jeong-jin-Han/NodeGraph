import React from 'react'
import { formatNodeNumber } from '../utils/nodeNumber'

export interface OutlineEntry {
  id: string
  title: string
  template: string
  color: string
  childCount: number
}

interface OutlinePanelProps {
  /** 루트 → 현재 노드까지의 경로. 마지막 항목이 지금 펼쳐 보고 있는 노드. 비면 최상위. */
  trail: OutlineEntry[]
  /** 지금 보고 있는 단계의 직속 자식들 — 읽는 순서대로 정렬되어 들어온다. */
  items: OutlineEntry[]
  /** 캔버스에서 실제로 선택되어 있는 노드 (목차에서 강조 표시용) */
  selectedId: string | null
  /** 목차에서 한 항목을 눌렀을 때 — 그 노드로 내려가면서 캔버스도 그리로 이동 */
  onDrillInto: (id: string) => void
  /** 브레드크럼에서 위로 올라갈 때. null이면 최상위로. */
  onGoUp: (id: string | null) => void
  onClose: () => void
}

const rowBase: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 6,
  padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
  fontSize: 12, lineHeight: 1.4, textAlign: 'left', width: '100%',
  border: 'none', background: 'transparent', color: '#1a1a1a',
}

function NumChip({ id, color }: { id: string; color: string }) {
  const label = formatNodeNumber(id)
  if (!label) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 26,
    }}>{label}</span>
  )
}

export function OutlinePanel({ trail, items, selectedId, onDrillInto, onGoUp, onClose }: OutlinePanelProps) {
  const current = trail.length > 0 ? trail[trail.length - 1] : null

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 256, zIndex: 480,
        background: '#fff', borderRight: '1px solid #d1d5db',
        boxShadow: '2px 0 12px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px', borderBottom: '1px solid #e5e7eb', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', flex: 1 }}>Outline</span>
        <button
          onClick={onClose}
          title="Hide the outline"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '2px 4px', lineHeight: 1 }}
        >✕</button>
      </div>

      {/* 브레드크럼 — 어디까지 내려왔는지, 그리고 되돌아가는 길 */}
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid #f3f4f6', flexShrink: 0,
        fontSize: 11, color: '#6b7280', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3,
      }}>
        <button
          onClick={() => onGoUp(null)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: trail.length ? '#2563eb' : '#6b7280', fontSize: 11 }}
        >Top</button>
        {trail.map((t, i) => (
          <React.Fragment key={t.id}>
            <span style={{ color: '#9ca3af' }}>›</span>
            <button
              onClick={() => onGoUp(t.id)}
              title={t.title}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11,
                color: i === trail.length - 1 ? '#374151' : '#2563eb',
                fontWeight: i === trail.length - 1 ? 600 : 400,
                maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >{formatNodeNumber(t.id) ?? t.title}</button>
          </React.Fragment>
        ))}
      </div>

      {current && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <NumChip id={current.id} color={current.color} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{current.title}</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px 12px' }}>
        <div style={{ fontSize: 10, color: '#9ca3af', padding: '2px 8px 6px', fontWeight: 600, letterSpacing: '0.03em' }}>
          {items.length === 0
            ? 'NOTHING BELOW THIS NODE'
            : current ? 'READ IN THIS ORDER' : 'BACKBONE — READ IN THIS ORDER'}
        </div>
        {items.map(it => {
          const isSelected = it.id === selectedId
          return (
            <button
              key={it.id}
              onClick={() => onDrillInto(it.id)}
              title={it.childCount > 0 ? `${it.title} — ${it.childCount} below` : it.title}
              style={{
                ...rowBase,
                background: isSelected ? '#e8f0fe' : 'transparent',
                fontWeight: isSelected ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
            >
              <NumChip id={it.id} color={it.color} />
              <span style={{ flex: 1, minWidth: 0 }}>{it.title}</span>
              {it.childCount > 0 && (
                <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>›{it.childCount}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
