import { useState } from 'react'
import { ROOM_KIND_COLOR, ROOM_KIND_LABEL, type RoomKind } from '../types'
import './RoomKindPicker.css'

interface RoomKindPickerProps {
  value: RoomKind
  onChange: (kind: RoomKind) => void
  className?: string
}

// 방 종류를 고를 때 도면 위 방 색깔과 똑같은 색으로, 글씨는 가운데 정렬해서 보여준다.
// 기기 기본 <select> 팝업은 색/정렬을 우리 마음대로 바꿀 수 없어서 직접 만든 목록으로 대신한다.
export function RoomKindPicker({ value, onChange, className }: RoomKindPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`kind-picker ${className ?? ''}`}>
      <button
        type="button"
        className="kind-picker-trigger"
        style={{ background: ROOM_KIND_COLOR[value] }}
        onClick={() => setOpen((v) => !v)}
      >
        {ROOM_KIND_LABEL[value]} ▾
      </button>

      {open && (
        <>
          <div className="kind-picker-outside" onClick={() => setOpen(false)} />
          <div className="kind-picker-list">
            {Object.entries(ROOM_KIND_LABEL).map(([kind, label]) => (
              <button
                type="button"
                key={kind}
                className={`kind-picker-option ${kind === value ? 'selected' : ''}`}
                style={{ background: ROOM_KIND_COLOR[kind as RoomKind] }}
                onClick={() => {
                  onChange(kind as RoomKind)
                  setOpen(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
