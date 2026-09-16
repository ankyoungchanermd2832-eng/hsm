import { useRef, useState } from 'react'
import { useHouseStore } from '../store'
import { ROOM_KIND_LABEL, type Room, type StorageUnit } from '../types'
import { compressPhoto } from '../utils/compressImage'
import { StorageDetail } from './StorageDetail'
import './RoomEditor.css'

interface RoomEditorProps {
  room: Room
  onClose: () => void
  highlightUnitId?: string | null
  highlightBasketId?: string | null
}

export function RoomEditor({ room, onClose, highlightUnitId, highlightBasketId }: RoomEditorProps) {
  const { addStorageUnit, setStorageUnitPhoto, deleteStorageUnit, updateRoom } = useHouseStore()
  const newPhotoInputRef = useRef<HTMLInputElement>(null)

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [photoProcessing, setPhotoProcessing] = useState(false)

  const selectedUnit = room.storageUnits.find((u) => u.id === selectedUnitId) ?? null

  // 방에 들어오면 바로 가구 사진을 찍어서 새 가구를 등록할 수 있게 한다.
  async function handleNewFurniturePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoProcessing(true)
    try {
      const photo = await compressPhoto(file)
      const id = addStorageUnit(room.id, {
        type: 'bookshelf',
        name: `가구 ${room.storageUnits.length + 1}`,
        x: 50,
        y: 50,
      })
      setStorageUnitPhoto(room.id, id, photo)
    } catch (err) {
      console.error('가구 사진을 처리하지 못했어요.', err)
    }
    setPhotoProcessing(false)
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

        <div className="room-editor-body-v2">
          <input
            ref={newPhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleNewFurniturePhoto}
          />
          <button
            className="btn btn-primary furniture-add-btn"
            onClick={() => newPhotoInputRef.current?.click()}
            disabled={photoProcessing}
          >
            {photoProcessing ? '✨ 처리 중…' : '📷 새 가구 사진 찍기'}
          </button>

          <div className="furniture-gallery">
            {room.storageUnits.length === 0 ? (
              <p className="hint">아직 등록된 가구가 없어요. 위 버튼으로 가구 사진을 찍어 추가해보세요.</p>
            ) : (
              room.storageUnits.map((u) => (
                <FurnitureCard
                  key={u.id}
                  unit={u}
                  highlighted={u.id === highlightUnitId}
                  onClick={() => setSelectedUnitId(u.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

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

function FurnitureCard({
  unit,
  highlighted,
  onClick,
}: {
  unit: StorageUnit
  highlighted: boolean
  onClick: () => void
}) {
  const itemCount = unit.baskets.reduce((n, b) => n + b.items.length, 0)

  return (
    <button className={`furniture-card ${highlighted ? 'pulse-highlight' : ''}`} onClick={onClick}>
      {unit.photo ? (
        <img src={unit.photo} alt="" className="furniture-card-photo" />
      ) : (
        <div className="furniture-card-placeholder">📷 사진 추가</div>
      )}
      <span className="furniture-card-name">{unit.name}</span>
      {itemCount > 0 && <span className="furniture-card-count">{itemCount}</span>}
    </button>
  )
}
