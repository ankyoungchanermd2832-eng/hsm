import { useState } from 'react'
import { useHouseStore } from '../store'
import {
  STORAGE_TYPE_LABEL,
  UNIT_GRID_MAX,
  UNIT_GRID_MIN,
  UNIT_SHAPE_PRESETS,
  UNIT_SIZE_MIN,
  UNIT_SIZE_SLIDER_MAX,
  WARDROBE_STYLE_LABEL,
  type Room,
  type StorageUnit,
} from '../types'
import { sortByName } from '../utils/sort'
import { getUnitVisual } from '../utils/unitVisual'
import { IsoCube } from './IsoCube'
import './StorageDetail.css'

const QUICK_ICONS = ['📦', '👕', '📚', '🍳', '💊', '🧸', '🔌', '🧴', '📄', '🧦', '🧣', '🎁', '🛠️', '🧵']

interface StorageDetailProps {
  room: Room
  unit: StorageUnit
  highlightBasketId?: string | null
  onClose: () => void
  onDelete: () => void
}

export function StorageDetail({ room, unit, highlightBasketId, onClose, onDelete }: StorageDetailProps) {
  const {
    addBasket,
    renameBasket,
    moveBasketToCell,
    deleteBasket,
    renameStorageUnit,
    resizeStorageUnit,
    setStorageUnitGrid,
    setWardrobeStyle,
  } = useHouseStore()

  const visual = getUnitVisual(unit)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card storage-detail-card" onClick={(e) => e.stopPropagation()}>
        <div className="storage-detail-header">
          <div>
            <span className="unit-type-icon">{visual.icon}</span>
            <input
              className="unit-title-input"
              value={unit.name}
              onChange={(e) => renameStorageUnit(room.id, unit.id, e.target.value)}
            />
            <span className="unit-type-badge">{STORAGE_TYPE_LABEL[unit.type]}</span>
          </div>
          <div className="storage-detail-actions">
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`'${unit.name}'을(를) 삭제할까요? 안의 바구니와 물건 정보도 함께 삭제됩니다.`)) onDelete()
              }}
            >
              🗑️ 삭제
            </button>
            <button className="btn" onClick={onClose}>
              닫기 ✕
            </button>
          </div>
        </div>

        <div className="size-editor">
          <div className="size-editor-preview">
            <IsoCube
              color={visual.color}
              icon={visual.icon}
              width={unit.width}
              height={unit.height}
              rows={unit.rows}
              cols={unit.cols}
              hasTopBox={visual.hasTopBox}
            />
          </div>
          <div className="size-editor-controls">
            <h4>크기와 모양</h4>
            {unit.type === 'wardrobe' && (
              <div className="size-preset-row">
                {(['door', 'drawer'] as const).map((style) => (
                  <button
                    key={style}
                    className={`btn btn-sm ${(unit.wardrobeStyle ?? 'door') === style ? 'btn-active' : ''}`}
                    onClick={() => setWardrobeStyle(room.id, unit.id, style)}
                  >
                    {WARDROBE_STYLE_LABEL[style]}
                  </button>
                ))}
              </div>
            )}
            <div className="size-preset-row">
              {UNIT_SHAPE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="btn btn-sm"
                  onClick={() => resizeStorageUnit(room.id, unit.id, preset.width, preset.height)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="size-slider-row">
              <span>너비</span>
              <input
                type="range"
                min={UNIT_SIZE_MIN.width}
                max={UNIT_SIZE_SLIDER_MAX.width}
                value={Math.min(unit.width, UNIT_SIZE_SLIDER_MAX.width)}
                onChange={(e) => resizeStorageUnit(room.id, unit.id, Number(e.target.value), unit.height)}
              />
              <input
                type="number"
                className="size-number-input"
                min={UNIT_SIZE_MIN.width}
                value={unit.width}
                onChange={(e) => resizeStorageUnit(room.id, unit.id, Number(e.target.value) || UNIT_SIZE_MIN.width, unit.height)}
              />
            </label>
            <label className="size-slider-row">
              <span>높이</span>
              <input
                type="range"
                min={UNIT_SIZE_MIN.height}
                max={UNIT_SIZE_SLIDER_MAX.height}
                value={Math.min(unit.height, UNIT_SIZE_SLIDER_MAX.height)}
                onChange={(e) => resizeStorageUnit(room.id, unit.id, unit.width, Number(e.target.value))}
              />
              <input
                type="number"
                className="size-number-input"
                min={UNIT_SIZE_MIN.height}
                value={unit.height}
                onChange={(e) => resizeStorageUnit(room.id, unit.id, unit.width, Number(e.target.value) || UNIT_SIZE_MIN.height)}
              />
            </label>
            <p className="hint small">숫자칸에 직접 입력하면 크기 제한 없이 원하는 만큼 키울 수 있어요.</p>

            <div className="grid-stepper-row">
              <GridStepper
                label="세로 층"
                value={unit.rows}
                onChange={(v) => setStorageUnitGrid(room.id, unit.id, v, unit.cols)}
              />
              <GridStepper
                label="가로 칸"
                value={unit.cols}
                onChange={(v) => setStorageUnitGrid(room.id, unit.id, unit.rows, v)}
              />
            </div>
          </div>
        </div>

        <div className="shelf-grid-wrap">
          <p className="hint small">
            {unit.rows > 1 || unit.cols > 1
              ? '가구의 층·칸마다 바구니를 놓아보세요. 맨 아래가 1층이에요.'
              : '바구니를 놓고 물건을 정리해보세요.'}
          </p>
          <div className="shelf-grid" style={{ gridTemplateColumns: `repeat(${unit.cols}, minmax(180px, 1fr))` }}>
            {Array.from({ length: unit.rows }).map((_, r) =>
              Array.from({ length: unit.cols }).map((_, c) => {
                const basket = unit.baskets.find((b) => b.row === r && b.col === c)
                const emptyCells: { row: number; col: number }[] = []
                if (unit.rows * unit.cols > 1) {
                  for (let rr = 0; rr < unit.rows; rr++) {
                    for (let cc = 0; cc < unit.cols; cc++) {
                      if (!(rr === r && cc === c) && !unit.baskets.some((b) => b.row === rr && b.col === cc)) {
                        emptyCells.push({ row: rr, col: cc })
                      }
                    }
                  }
                }
                return (
                  <div className="shelf-cell" key={`${r}-${c}`}>
                    {(unit.rows > 1 || unit.cols > 1) && (
                      <span className="shelf-cell-label">
                        {unit.rows - r}층 · {c + 1}칸
                      </span>
                    )}
                    {basket ? (
                      <BasketPanel
                        roomId={room.id}
                        unitId={unit.id}
                        basketId={basket.id}
                        name={basket.name}
                        items={basket.items}
                        emptyCells={emptyCells}
                        totalRows={unit.rows}
                        highlighted={basket.id === highlightBasketId}
                        onRename={(name) => renameBasket(room.id, unit.id, basket.id, name)}
                        onMove={(row, col) => moveBasketToCell(room.id, unit.id, basket.id, row, col)}
                        onDelete={() => {
                          if (confirm(`'${basket.name}' 바구니를 삭제할까요?`)) deleteBasket(room.id, unit.id, basket.id)
                        }}
                      />
                    ) : (
                      <EmptyCell onAdd={(name) => addBasket(room.id, unit.id, name, r, c)} />
                    )}
                  </div>
                )
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyCell({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('')

  function submit() {
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
  }

  return (
    <div className="shelf-cell-empty">
      <input
        placeholder="바구니 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button className="btn btn-sm" disabled={!name.trim()} onClick={submit}>
        + 바구니
      </button>
    </div>
  )
}

function GridStepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="grid-stepper">
      <span className="grid-stepper-label">{label}</span>
      <button
        className="grid-stepper-btn"
        disabled={value <= UNIT_GRID_MIN}
        onClick={() => onChange(value - 1)}
        aria-label={`${label} 줄이기`}
      >
        −
      </button>
      <span className="grid-stepper-value">{value}</span>
      <button
        className="grid-stepper-btn"
        disabled={value >= UNIT_GRID_MAX}
        onClick={() => onChange(value + 1)}
        aria-label={`${label} 늘리기`}
      >
        +
      </button>
    </div>
  )
}

function BasketPanel({
  roomId,
  unitId,
  basketId,
  name,
  items,
  emptyCells,
  totalRows,
  highlighted,
  onRename,
  onMove,
  onDelete,
}: {
  roomId: string
  unitId: string
  basketId: string
  name: string
  items: StorageUnit['baskets'][number]['items']
  emptyCells: { row: number; col: number }[]
  totalRows: number
  highlighted: boolean
  onRename: (name: string) => void
  onMove: (row: number, col: number) => void
  onDelete: () => void
}) {
  const { addItem, deleteItem } = useHouseStore()
  const [itemName, setItemName] = useState('')
  const [itemIcon, setItemIcon] = useState('📦')

  const sortedItems = sortByName(items)

  function submitItem() {
    if (!itemName.trim()) return
    addItem(roomId, unitId, basketId, { name: itemName.trim(), icon: itemIcon })
    setItemName('')
  }

  return (
    <div className={`basket-panel ${highlighted ? 'pulse-highlight' : ''}`}>
      <div className="basket-panel-header">
        <span className="basket-icon">🧺</span>
        <input className="basket-name-input" value={name} onChange={(e) => onRename(e.target.value)} />
        <button className="basket-delete-btn" onClick={onDelete} title="바구니 삭제">
          ✕
        </button>
      </div>

      {emptyCells.length > 0 && (
        <select
          className="basket-move-select"
          value=""
          onChange={(e) => {
            const [r, c] = e.target.value.split('-').map(Number)
            onMove(r, c)
          }}
        >
          <option value="" disabled>
            다른 칸으로 이동…
          </option>
          {emptyCells.map(({ row, col }) => (
            <option key={`${row}-${col}`} value={`${row}-${col}`}>
              {totalRows - row}층 · {col + 1}칸으로
            </option>
          ))}
        </select>
      )}

      {sortedItems.length === 0 ? (
        <p className="hint small">비어있는 바구니예요.</p>
      ) : (
        <ul className="item-grid">
          {sortedItems.map((item) => (
            <li key={item.id} className="item-chip">
              <span className="item-icon">{item.icon}</span>
              <span className="item-name">{item.name}</span>
              <button
                className="item-remove"
                onClick={() => deleteItem(roomId, unitId, basketId, item.id)}
                title="삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="item-add-row">
        <select value={itemIcon} onChange={(e) => setItemIcon(e.target.value)} className="icon-select">
          {QUICK_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
        <input
          placeholder="물건 이름 입력 후 Enter"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitItem()}
        />
        <button className="btn btn-sm" disabled={!itemName.trim()} onClick={submitItem}>
          추가
        </button>
      </div>
    </div>
  )
}
