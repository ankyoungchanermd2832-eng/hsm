import { useState } from 'react'
import { useHouseStore } from '../store'
import { STORAGE_TYPE_ICON, type SearchResult } from '../types'
import './SearchBar.css'

interface SearchBarProps {
  onJump: (roomId: string, unitId: string, basketId: string) => void
}

export function SearchBar({ onJump }: SearchBarProps) {
  const search = useHouseStore((s) => s.search)
  // house 를 구독해야 다른 화면에서 물건을 추가/삭제했을 때 이미 열려있는 검색 결과도 갱신된다.
  useHouseStore((s) => s.house)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results: SearchResult[] = query.trim() ? search(query) : []

  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="찾을 물건 이름을 입력하세요 (예: 여권, 우산)"
      />
      {open && query.trim() && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">'{query}' 에 해당하는 물건을 찾지 못했어요.</div>
          ) : (
            results.map((r) => (
              <button
                key={r.item.id}
                className="search-result-item"
                title="클릭하면 도면에서 방이 깜빡여요"
                onMouseDown={() => {
                  onJump(r.room.id, r.storageUnit.id, r.basket.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="search-result-icon">{r.item.icon}</span>
                <span className="search-result-main">
                  <strong>{r.item.name}</strong>
                  <span className="search-result-path">
                    {r.room.name} · {STORAGE_TYPE_ICON[r.storageUnit.type]} {r.storageUnit.name} · 🧺 {r.basket.name}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
