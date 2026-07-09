import React, { useEffect, useRef, useMemo } from 'react'

export interface SearchMatch {
  id: string
  title: string
}

interface SearchBarProps {
  query: string
  onQueryChange: (q: string) => void
  matches: SearchMatch[]
  showDropdown: boolean
  selectedId: string | null
  onSelectNode: (id: string) => void
  onPreviewNode: (id: string) => void
  onClose: () => void
  onReopen: () => void
  inputRef: React.RefObject<HTMLInputElement>
}

export function SearchBar({ query, onQueryChange, matches, showDropdown, selectedId, onSelectNode, onPreviewNode, onClose, onReopen, inputRef }: SearchBarProps) {
  const [kbIdx, setKbIdx] = React.useState(-1)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // match IDs가 실제로 바뀔 때만 kbIdx 리셋 (toggle 등 contentExpanded 변경은 무시)
  const matchKey = useMemo(() => matches.map(m => m.id).join(','), [matches])
  useEffect(() => {
    setKbIdx(-1)
  }, [matchKey])

  // Auto-scroll active item into view
  useEffect(() => {
    if (!dropRef.current || kbIdx < 0) return
    const el = dropRef.current.querySelector<HTMLElement>(`[data-kb-idx="${kbIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [kbIdx])

  const hasMatches = matches.length > 0
  const countLabel = query.trim() === '' ? '' : hasMatches ? `${matches.length} results` : '0 results'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (hasMatches) {
        const newIdx = kbIdx < 0 ? 0 : (kbIdx + 1) % matches.length
        setKbIdx(newIdx)
        onPreviewNode(matches[newIdx].id)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (hasMatches) {
        const newIdx = kbIdx < 0 ? matches.length - 1 : (kbIdx - 1 + matches.length) % matches.length
        setKbIdx(newIdx)
        onPreviewNode(matches[newIdx].id)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hasMatches) {
        const idx = kbIdx >= 0 ? kbIdx : 0
        onSelectNode(matches[idx].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
    e.stopPropagation()
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: 'absolute', top: 10, right: 14, zIndex: 500 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: showDropdown && hasMatches ? '6px 6px 0 0' : 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: '4px 6px',
      }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { onReopen() }}
          onClick={() => {
            const idx = selectedId ? matches.findIndex(m => m.id === selectedId) : -1
            setKbIdx(idx)
            onReopen()
          }}
          placeholder="Search nodes… (Ctrl+F)"
          style={{
            border: 'none', outline: 'none', fontSize: 13,
            width: 200, background: 'transparent', color: '#111',
          }}
        />
        {countLabel && (
          <span style={{
            fontSize: 11, color: hasMatches ? '#6b7280' : '#ef4444',
            whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right',
          }}>
            {countLabel}
          </span>
        )}
        <div style={{ width: 1, height: 16, background: '#e5e7eb', margin: '0 2px' }} />
        <button
          onClick={onClose}
          title="Close (Escape)"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 6px', fontSize: 13, color: '#6b7280', borderRadius: 3, lineHeight: 1,
          }}
        >✕</button>
      </div>

      {showDropdown && hasMatches && (
        <div
          ref={dropRef}
          style={{
            position: 'absolute', top: '100%', right: 0,
            minWidth: '100%', maxHeight: 280, overflowY: 'auto',
            background: '#fff',
            border: '1px solid #d1d5db', borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            zIndex: 501,
          }}
        >
          {matches.map((m, i) => {
            const isActive = i === kbIdx
            return (
              <div
                key={m.id}
                data-kb-idx={i}
                onMouseDown={(e) => { e.stopPropagation(); onSelectNode(m.id) }}
                onMouseEnter={() => setKbIdx(i)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  borderBottom: i < matches.length - 1 ? '1px solid #f3f4f6' : 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 320,
                  background: isActive ? '#e8f0fe' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {m.title}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
