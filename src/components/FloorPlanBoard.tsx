import { useRef, useState } from 'react'
import { useHouseStore } from '../store'
import { ROOM_KIND_LABEL, type Room, type RoomKind } from '../types'
import { stylizeFloorPlanImage } from '../utils/floorPlanStyle'
import { detectRoomsFromFloorPlan } from '../utils/roomDetect'
import './FloorPlanBoard.css'

interface DrawRect {
  x: number
  y: number
  width: number
  height: number
}

const ROOM_KIND_COLOR: Record<RoomKind, string> = {
  living: '#ec9a3c',
  kitchen: '#3ca0ec',
  bedroom: '#a06bec',
  bathroom: '#3cc6ec',
  entrance: '#7a8a99',
  other: '#8f8f8f',
}

interface FloorPlanBoardProps {
  onOpenRoom: (roomId: string) => void
  highlightRoomId?: string | null
}

export function FloorPlanBoard({ onOpenRoom, highlightRoomId }: FloorPlanBoardProps) {
  const { house, setFloorPlanImage, addRoom, deleteRoom } = useHouseStore()
  const boardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [drawMode, setDrawMode] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draftRect, setDraftRect] = useState<DrawRect | null>(null)
  const [pendingRect, setPendingRect] = useState<DrawRect | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomKind, setNewRoomKind] = useState<RoomKind>('living')
  const [processingStage, setProcessingStage] = useState<'styling' | 'detecting' | null>(null)
  const processingImage = processingStage !== null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcessingStage('styling')
    let stylized: string
    try {
      stylized = await stylizeFloorPlanImage(file)
      setFloorPlanImage(stylized)
    } catch (err) {
      console.error('도면 이미지를 다듬는 데 실패해서 원본 사진을 사용해요.', err)
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      setFloorPlanImage(dataUrl)
      setProcessingStage(null)
      return
    }

    // 방을 하나도 등록하지 않은 첫 업로드일 때만 자동으로 방을 나눠준다.
    // 이미 방을 그려둔 상태에서 재업로드하면 기존 방 배치를 건드리지 않는다.
    if (house.rooms.length === 0) {
      setProcessingStage('detecting')
      let detected: { x: number; y: number; width: number; height: number }[] = []
      try {
        detected = await detectRoomsFromFloorPlan(stylized)
      } catch (err) {
        console.error('방 구역을 자동으로 나누지 못했어요. 기본 방 하나로 시작할게요.', err)
      }
      if (detected.length === 0) {
        // 벽을 인식하지 못했을 때도 빈 도면으로 두지 않고, 도면 전체를 덮는
        // 기본 방 하나를 만들어서 바로 수납가구를 배치할 수 있게 한다.
        // 필요하면 "방 추가하기"로 더 잘게 나눌 수 있다.
        addRoom({ name: '방 1', kind: 'other', x: 4, y: 4, width: 92, height: 92 })
      } else {
        detected.forEach((box, i) => {
          addRoom({ name: `방 ${i + 1}`, kind: 'other', ...box })
        })
      }
    }
    setProcessingStage(null)
  }

  function relativePos(clientX: number, clientY: number) {
    const rect = boardRef.current!.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!drawMode) return
    const pos = relativePos(e.clientX, e.clientY)
    setDragStart(pos)
    setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawMode || !dragStart) return
    const pos = relativePos(e.clientX, e.clientY)
    const x = Math.min(dragStart.x, pos.x)
    const y = Math.min(dragStart.y, pos.y)
    const width = Math.abs(pos.x - dragStart.x)
    const height = Math.abs(pos.y - dragStart.y)
    setDraftRect({ x, y, width, height })
  }

  function handlePointerUp() {
    if (!drawMode || !draftRect) return
    setDragStart(null)
    if (draftRect.width > 3 && draftRect.height > 3) {
      setPendingRect(draftRect)
      setNewRoomName('')
      setNewRoomKind('living')
    }
    setDraftRect(null)
  }

  function confirmNewRoom() {
    if (!pendingRect || !newRoomName.trim()) return
    addRoom({ name: newRoomName.trim(), kind: newRoomKind, ...pendingRect })
    setPendingRect(null)
    setDrawMode(false)
  }

  return (
    <div className="floorplan-panel">
      <div className="floorplan-toolbar">
        <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={processingImage}>
          {processingImage ? '✨ 처리 중…' : '🖼️ 도면 사진 업로드'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
        />
        <button
          className={`btn ${drawMode ? 'btn-active' : ''}`}
          onClick={() => setDrawMode((v) => !v)}
          disabled={!house.floorPlanImage || processingImage}
        >
          {drawMode ? '✏️ 방 그리는 중… (드래그해서 영역 지정)' : '➕ 방 추가하기'}
        </button>
      </div>

      {processingStage === 'styling' && (
        <div className="floorplan-empty">
          <p>✨ 도면 사진을 더 깔끔하게 다듬고 있어요…</p>
          <p className="hint">원래 벽 구조와 형태는 그대로 유지하면서 색과 잡음만 정리해요.</p>
        </div>
      )}

      {processingStage === 'detecting' && (
        <div className="floorplan-empty">
          <p>🧭 벽 구조를 보고 방 구역을 자동으로 나누고 있어요…</p>
          <p className="hint">
            방이 이상하게 나뉘었다면 나중에 이름/영역을 직접 고칠 수 있어요. 벽을 잘 못 찾으면 도면
            전체를 방 1개로 시작하고, "➕ 방 추가하기"로 필요한 만큼 나눌 수 있어요.
          </p>
        </div>
      )}

      {!processingImage && !house.floorPlanImage && (
        <div className="floorplan-empty">
          <p>먼저 우리집 도면 사진을 업로드해주세요.</p>
          <p className="hint">업로드하면 자동으로 깔끔하게 다듬고, 벽 구조를 보고 방도 자동으로 나눠드려요.</p>
        </div>
      )}

      {!processingImage && house.floorPlanImage && (
        <div
          className={`floorplan-board ${drawMode ? 'drawing' : ''}`}
          ref={boardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <img src={house.floorPlanImage} alt="집 도면" className="floorplan-image" draggable={false} />

          {house.rooms.map((room) => (
            <RoomBox
              key={room.id}
              room={room}
              highlighted={room.id === highlightRoomId}
              onOpen={() => !drawMode && onOpenRoom(room.id)}
              onDelete={() => deleteRoom(room.id)}
            />
          ))}

          {draftRect && (
            <div
              className="room-draft"
              style={{
                left: `${draftRect.x}%`,
                top: `${draftRect.y}%`,
                width: `${draftRect.width}%`,
                height: `${draftRect.height}%`,
              }}
            />
          )}
        </div>
      )}

      {pendingRect && (
        <div className="modal-backdrop" onClick={() => setPendingRect(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>새 방 등록</h3>
            <label className="field">
              <span>방 이름</span>
              <input
                autoFocus
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="예: 안방, 주방, 거실"
                onKeyDown={(e) => e.key === 'Enter' && confirmNewRoom()}
              />
            </label>
            <label className="field">
              <span>방 종류</span>
              <select value={newRoomKind} onChange={(e) => setNewRoomKind(e.target.value as RoomKind)}>
                {Object.entries(ROOM_KIND_LABEL).map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn" onClick={() => setPendingRect(null)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={confirmNewRoom} disabled={!newRoomName.trim()}>
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoomBox({
  room,
  highlighted,
  onOpen,
  onDelete,
}: {
  room: Room
  highlighted: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`room-box ${highlighted ? 'pulse-highlight' : ''}`}
      style={{
        left: `${room.x}%`,
        top: `${room.y}%`,
        width: `${room.width}%`,
        height: `${room.height}%`,
        borderColor: ROOM_KIND_COLOR[room.kind],
      }}
      onClick={onOpen}
    >
      <span className="room-box-label" style={{ background: ROOM_KIND_COLOR[room.kind] }}>
        {room.name}
        <em>({room.storageUnits.length})</em>
      </span>
      <button
        className="room-box-delete"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`'${room.name}' 방을 삭제할까요? 안의 수납공간 정보도 함께 삭제됩니다.`)) onDelete()
        }}
        title="방 삭제"
      >
        ✕
      </button>
    </div>
  )
}
