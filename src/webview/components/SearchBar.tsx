import React, { useEffect } from 'react'

interface SearchBarProps {
  query: string
  onQueryChange: (q: string) => void
  matchCount: number
  activeIdx: number       // 0-based
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  inputRef: React.RefObject<HTMLInputElement>
}

export function SearchBar({ query, onQueryChange, matchCount, activeIdx, onNext, onPrev, onClose, inputRef }: SearchBarProps) {
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const hasMatches = matchCount > 0
  const label = query.trim() === '' ? '' : hasMatches ? `${activeIdx + 1} / ${matchCount}` : '0 results'

  const btn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: 13,
    color: '#374151',
    borderRadius: 3,
    lineHeight: 1,
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 10,
        right: 14,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: '4px 6px',
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.shiftKey ? onPrev() : onNext(); e.preventDefault() }
          if (e.key === 'Escape') { onClose(); e.preventDefault() }
          e.stopPropagation()
        }}
        placeholder="Search nodes…"
        style={{
          border: 'none',
          outline: 'none',
          fontSize: 13,
          width: 180,
          background: 'transparent',
          color: '#111',
        }}
      />
      {label && (
        <span style={{ fontSize: 11, color: hasMatches ? '#6b7280' : '#ef4444', whiteSpace: 'nowrap', minWidth: 52, textAlign: 'right' }}>
          {label}
        </span>
      )}
      <div style={{ width: 1, height: 16, background: '#e5e7eb', margin: '0 2px' }} />
      <button style={{ ...btn, opacity: hasMatches ? 1 : 0.3 }} onClick={onPrev} disabled={!hasMatches} title="Previous (Shift+Enter)">↑</button>
      <button style={{ ...btn, opacity: hasMatches ? 1 : 0.3 }} onClick={onNext} disabled={!hasMatches} title="Next (Enter)">↓</button>
      <button style={{ ...btn, color: '#6b7280' }} onClick={onClose} title="Close (Escape)">✕</button>
    </div>
  )
}
