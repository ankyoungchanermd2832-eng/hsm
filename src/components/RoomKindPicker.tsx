import { useRef, useState } from 'react'
import { ROOM_KIND_COLOR, ROOM_KIND_LABEL, type RoomKind } from '../types'
import './RoomKindPicker.css'

interface RoomKindPickerProps {
  value: RoomKind
  onChange: (kind: RoomKind) => void
  className?: string
}

const LIST_WIDTH = 130
const VIEWPORT_MARGIN = 8

// 방 종류를 고를 때 도면 위 방 색깔과 똑같은 색으로, 글씨는 가운데 정렬해서 보여준다.
// 기기 기본 <select> 팝업은 색/정렬을 우리 마음대로 바꿀 수 없어서 직접 만든 목록으로 대신한다.
// 목록은 화면 좌표 기준 고정 위치(position: fixed)로 띄워서, 이 버튼을 담고 있는 모달이
// overflow: hidden 이어도 목록이 잘려 보이지 않게 한다.
export function RoomKindPicker({ value, onChange, className }: RoomKindPickerProps) {
  const [open, setOpen] = useState(false)
  const [listPos, setListPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // 버튼 오른쪽 끝에 목록 오른쪽 끝을 맞추되, 화면 밖으로 나가지 않게 양쪽 여백 안에서 고정한다.
      const left = Math.min(
        Math.max(rect.right - LIST_WIDTH, VIEWPORT_MARGIN),
        window.innerWidth - LIST_WIDTH - VIEWPORT_MARGIN,
      )
      setListPos({ top: rect.bottom + 6, left })
    }
    setOpen((v) => !v)
  }

  return (
    <div className={`kind-picker ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="kind-picker-trigger"
        style={{ background: ROOM_KIND_COLOR[value] }}
        onClick={handleToggle}
      >
        {ROOM_KIND_LABEL[value]} ▾
      </button>

      {open && (
        <>
          <div className="kind-picker-outside" onClick={() => setOpen(false)} />
          <div
            className="kind-picker-list"
            style={{ top: listPos.top, left: listPos.left, width: LIST_WIDTH }}
          >
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
