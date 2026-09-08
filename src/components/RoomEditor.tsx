import { useRef, useState } from 'react'
import { useHouseStore } from '../store'
import {
  ROOM_KIND_LABEL,
  STORAGE_TYPE_COLOR,
  STORAGE_TYPE_ICON,
  STORAGE_TYPE_LABEL,
  type Room,
  type StorageType,
  type StorageUnit,
} from '../types'
import { IsoCube } from './IsoCube'
import { getUnitVisual } from '../utils/unitVisual'
import { CabinetGallery } from './CabinetGallery'
import { StorageDetail } from './StorageDetail'
import './RoomEditor.css'

const PALETTE: StorageType[] = ['bookshelf', 'drawer', 'wardrobe', 'shelf']

// 가구를 옮기려면 이 시간(ms)만큼 누르고 있어야 드래그가 시작된다.
// 짧게 누르거나 두 번 눌러서(더블클릭) 편집창을 여는 동작과 헷갈리지 않도록 하기 위함.
const LONG_PRESS_MS = 1000
// 누르고 있는 동안 손가락/마우스가 이만큼(px) 넘게 움직이면 누르기를 취소한다.
const PRESS_MOVE_CANCEL_PX = 8

interface RoomEditorProps {
  room: Room
  onClose: () => void
  highlightUnitId?: string | null
  highlightBasketId?: string | null
}

export function RoomEditor({ room, onClose, highlightUnitId, highlightBasketId }: RoomEditorProps) {
  const { addStorageUnit, moveStorageUnit, deleteStorageUnit, updateRoom } = useHouseStore()
  const floorRef = useRef<HTMLDivElement>(null)

  const [placingType, setPlacingType] = useState<StorageType | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [showCabinetGallery, setShowCabinetGallery] = useState(false)
  const draggingRef = useRef<{ unitId: string } | null>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPressRef = useRef<{ unitId: string; pointerId: number; startX: number; startY: number } | null>(null)
  const [pressingUnitId, setPressingUnitId] = useState<string | null>(null)

  const selectedUnit = room.storageUnits.find((u) => u.id === selectedUnitId) ?? null

  function relativePos(clientX: number, clientY: number) {
    const rect = floorRef.current!.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(2, Math.min(96, x)), y: Math.max(2, Math.min(90, y)) }
  }

  function handleFloorClick(e: React.MouseEvent) {
    if (!placingType) return
    const pos = relativePos(e.clientX, e.clientY)
    const count = room.storageUnits.filter((u) => u.type === placingType).length
    addStorageUnit(room.id, {
      type: placingType,
      name: `${STORAGE_TYPE_LABEL[placingType]}${count > 0 ? ` ${count + 1}` : ''}`,
      x: pos.x,
      y: pos.y,
    })
    setPlacingType(null)
  }

  function cancelPendingPress() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    pendingPressRef.current = null
    setPressingUnitId(null)
  }

  // 가구를 바로 옮기지 않고, LONG_PRESS_MS 만큼 누르고 있어야 드래그가 시작되게 한다.
  // (짧게 누르는 동작은 두 번 눌러서 편집창을 여는 더블클릭과 구분하기 위함)
  function handleUnitPointerDown(e: React.PointerEvent, unitId: string) {
    e.stopPropagation()
    const pointerId = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(pointerId)
    pendingPressRef.current = { unitId, pointerId, startX: e.clientX, startY: e.clientY }
    setPressingUnitId(unitId)
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null
      if (pendingPressRef.current?.unitId === unitId && pendingPressRef.current.pointerId === pointerId) {
        draggingRef.current = { unitId }
        pendingPressRef.current = null
        setPressingUnitId(null)
      }
    }, LONG_PRESS_MS)
  }

  // 누르고 있는 동안 많이 움직이면(스크롤/실수 등) 드래그가 시작되지 않도록 취소한다.
  function handleUnitPointerMove(e: React.PointerEvent) {
    const pending = pendingPressRef.current
    if (!pending || pending.pointerId !== e.pointerId || draggingRef.current) return
    const dx = e.clientX - pending.startX
    const dy = e.clientY - pending.startY
    if (Math.hypot(dx, dy) > PRESS_MOVE_CANCEL_PX) {
      cancelPendingPress()
    }
  }

  function handleUnitPointerUp(e: React.PointerEvent) {
    if (pendingPressRef.current?.pointerId === e.pointerId) {
      cancelPendingPress()
    }
  }

  function handleFloorPointerMove(e: React.PointerEvent) {
    const dragging = draggingRef.current
    if (!dragging) return
    const pos = relativePos(e.clientX, e.clientY)
    moveStorageUnit(room.id, dragging.unitId, pos.x, pos.y)
  }

  function handleFloorPointerUp() {
    draggingRef.current = null
    cancelPendingPress()
  }

  function handleUnitDoubleClick(e: React.MouseEvent, unitId: string) {
    e.stopPropagation()
    setSelectedUnitId(unitId)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card room-editor-card" onClick={(e) => e.stopPropagation()}>
        <div className="room-editor-header">
          <div>
            <input
              className="room-title-input"
              value={room.name}
              onChange={(e) => updateRoom(room.id, { name: e.target.value })}
            />
            <select
              className="room-kind-select"
              value={room.kind}
              onChange={(e) => updateRoom(room.id, { kind: e.target.value as Room['kind'] })}
            >
              {Object.entries(ROOM_KIND_LABEL).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={onClose}>
            닫기 ✕
          </button>
        </div>

        <div className="room-editor-body">
          <aside className="storage-palette">
            <h4>수납가구 배치하기</h4>
            <p className="hint">아이콘을 누른 뒤 바닥을 클릭하면 배치돼요.</p>
            {PALETTE.map((type) => (
              <button
                key={type}
                className={`palette-btn ${placingType === type ? 'active' : ''}`}
                onClick={() => setPlacingType((t) => (t === type ? null : type))}
              >
                <IsoCube color={STORAGE_TYPE_COLOR[type]} icon={STORAGE_TYPE_ICON[type]} width={36} height={38} />
                <span>{STORAGE_TYPE_LABEL[type]}</span>
              </button>
            ))}

            {room.kind === 'kitchen' && (
              <button className="btn btn-kitchen" onClick={() => setShowCabinetGallery(true)}>
                🍽️ 싱크대 디자인 고르기
              </button>
            )}

            {room.storageUnits.length > 0 && (
              <div className="unit-list">
                <h5>배치된 수납공간 ({room.storageUnits.length})</h5>
                {room.storageUnits.map((u) => (
                  <button key={u.id} className="unit-list-item" onClick={() => setSelectedUnitId(u.id)}>
                    <span>
                      {getUnitVisual(u).icon} {u.name}
                    </span>
                    <span className="unit-list-count">{u.baskets.reduce((n, b) => n + b.items.length, 0)}개</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div
            className={`room-floor ${placingType ? 'placing' : ''}`}
            ref={floorRef}
            onClick={handleFloorClick}
            onPointerMove={handleFloorPointerMove}
            onPointerUp={handleFloorPointerUp}
            onPointerLeave={handleFloorPointerUp}
          >
            <div className="room-floor-grid" />
            {room.storageUnits.map((u) => (
              <UnitTile
                key={u.id}
                unit={u}
                onPointerDown={(e) => handleUnitPointerDown(e, u.id)}
                onPointerMove={handleUnitPointerMove}
                onPointerUp={handleUnitPointerUp}
                onPointerCancel={handleUnitPointerUp}
                onDoubleClick={(e) => handleUnitDoubleClick(e, u.id)}
                selected={u.id === selectedUnitId}
                highlighted={u.id === highlightUnitId}
                pressing={u.id === pressingUnitId}
              />
            ))}
            {placingType && <div className="placing-hint">바닥을 클릭해서 {STORAGE_TYPE_LABEL[placingType]} 배치</div>}
          </div>
        </div>
      </div>

      {showCabinetGallery && (
        <CabinetGallery
          onSelect={(designId) => {
            const count = room.storageUnits.filter((u) => u.type === 'kitchenCabinet').length
            addStorageUnit(room.id, {
              type: 'kitchenCabinet',
              name: `싱크대 ${count + 1}`,
              x: 15 + count * 18,
              y: 55,
              designId,
            })
            setShowCabinetGallery(false)
          }}
          onClose={() => setShowCabinetGallery(false)}
        />
      )}

      {selectedUnit && (
        <StorageDetail
          room={room}
          unit={selectedUnit}
          highlightBasketId={highlightBasketId}
          onClose={() => setSelectedUnitId(null)}
          onDelete={() => {
            deleteStorageUnit(room.id, selectedUnit.id)
            setSelectedUnitId(null)
          }}
        />
      )}
    </div>
  )
}

function UnitTile({
  unit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
  selected,
  highlighted,
  pressing,
}: {
  unit: StorageUnit
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
  selected: boolean
  highlighted: boolean
  pressing: boolean
}) {
  const itemCount = unit.baskets.reduce((n, b) => n + b.items.length, 0)
  const visual = getUnitVisual(unit)

  return (
    <div
      className={`unit-tile ${selected ? 'selected' : ''} ${highlighted ? 'pulse-highlight' : ''} ${pressing ? 'pressing' : ''}`}
      style={{ left: `${unit.x}%`, top: `${unit.y}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
      title="꾹 눌러서(약 1초) 위치 이동 · 더블클릭해서 내용 편집"
    >
      <IsoCube
        color={visual.color}
        icon={visual.icon}
        width={unit.width}
        height={unit.height}
        rows={unit.rows}
        cols={unit.cols}
        hasTopBox={visual.hasTopBox}
      />
      <span className="unit-tile-name">{unit.name}</span>
      {itemCount > 0 && <span className="unit-tile-count">{itemCount}</span>}
    </div>
  )
}
