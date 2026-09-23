import React, { useEffect, useRef } from 'react'
import { FoldScope } from '../utils/foldState'

export interface FoldMenuItem {
  action: 'expand' | 'collapse'
  scope: FoldScope
  label: string
  enabled: boolean
}

interface NodeContextMenuProps {
  /** 화면(클라이언트) 좌표 */
  x: number
  y: number
  /** 메뉴를 띄운 노드의 표시용 이름 (`#17 제목`) */
  heading: string
  items: FoldMenuItem[]
  /** 되돌리기 — 직전 펼치기/접기 이전 상태로. 스택이 비면 비활성. */
  canUndo: boolean
  onUndo: () => void
  onPick: (action: 'expand' | 'collapse', scope: FoldScope) => void
  /** 편집 모드 진입 — 제목·태그·본문을 한꺼번에 고칠 수 있게 된다 */
  onEdit: () => void
  onClose: () => void
}

export function NodeContextMenu({ x, y, heading, items, canUndo, onUndo, onPick, onEdit, onClose }: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    // capture 단계에서 받아야 캔버스의 mousedown 패닝보다 먼저 닫힌다
    document.addEventListener('mousedown', away, true)
    document.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('mousedown', away, true)
      document.removeEventListener('keydown', esc, true)
    }
  }, [onClose])

  // 화면 밖으로 나가지 않게 살짝 밀어 넣는다
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1e4) - 250),
    top: Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 1e4) - 290),
    zIndex: 900,
    minWidth: 236,
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    padding: '4px 0',
    fontSize: 12,
    color: '#1a1a1a',
  }

  const rowStyle = (enabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '5px 12px', border: 'none', background: 'transparent',
    textAlign: 'left', fontSize: 12, lineHeight: 1.4,
    color: enabled ? '#1a1a1a' : '#b0b4ba',
    cursor: enabled ? 'pointer' : 'default',
  })

  const expandItems = items.filter(i => i.action === 'expand')
  const collapseItems = items.filter(i => i.action === 'collapse')

  const renderGroup = (group: FoldMenuItem[]) => group.map(it => (
    <button
      key={`${it.action}:${it.scope}`}
      disabled={!it.enabled}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => { if (it.enabled) { onPick(it.action, it.scope); onClose() } }}
      onMouseEnter={(e) => { if (it.enabled) e.currentTarget.style.background = '#f3f4f6' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      style={rowStyle(it.enabled)}
    >{it.label}</button>
  ))

  return (
    <div ref={ref} style={style} onContextMenu={(e) => e.preventDefault()}>
      <div style={{
        padding: '4px 12px 6px', fontSize: 11, color: '#6b7280', fontWeight: 600,
        borderBottom: '1px solid #f3f4f6', marginBottom: 4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{heading}</div>

      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => { onEdit(); onClose() }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        style={{ ...rowStyle(true), fontWeight: 600 }}
      >Edit this node</button>
      <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />

      {renderGroup(expandItems)}
      <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
      {renderGroup(collapseItems)}
      <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
      <button
        disabled={!canUndo}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => { if (canUndo) { onUndo(); onClose() } }}
        onMouseEnter={(e) => { if (canUndo) e.currentTarget.style.background = '#f3f4f6' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        style={rowStyle(canUndo)}
      >Undo last fold change</button>
    </div>
  )
}
