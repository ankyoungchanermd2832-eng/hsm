import { useRef, useState } from 'react'
import { useHouseStore } from '../store'
import {
  CELL_SPLIT_DEFAULT,
  CELL_SPLIT_MAX,
  CELL_SPLIT_MIN,
  STORAGE_TYPE_LABEL,
  UNIT_GRID_MAX,
  UNIT_GRID_MIN,
  UNIT_SHAPE_PRESETS,
  UNIT_SIZE_MIN,
  UNIT_SIZE_SLIDER_MAX,
  WARDROBE_STYLE_LABEL,
  type CellSplit,
  type Room,
  type StorageUnit,
} from '../types'
import { sortByName } from '../utils/sort'
import { getUnitVisual } from '../utils/unitVisual'
import { compressPhoto } from '../utils/compressImage'
import { IsoCube } from './IsoCube'
import './StorageDetail.css'

const QUICK_ICONS = ['📦', '👕', '📚', '🍳', '💊', '🧸', '🔌', '🧴', '📄', '🧦', '🧣', '🎁', '🛠️', '🧵']

// 바구니(단)를 옮기려면 이만큼(ms) 눌러야 드래그가 시작된다 - 방의 가구 이동과 같은 규칙.
const LONG_PRESS_MS = 1000
const PRESS_MOVE_CANCEL_PX = 8
const DOUBLE_TAP_MS = 400

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
    splitCell,
    setStorageUnitPhoto,
  } = useHouseStore()

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoProcessing, setPhotoProcessing] = useState(false)
  const photoMode = !!unit.photo

  const visual = getUnitVisual(unit)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoProcessing(true)
    try {
      const photo = await compressPhoto(file)
      setStorageUnitPhoto(room.id, unit.id, photo)
    } catch (err) {
      console.error('가구 사진을 처리하지 못했어요.', err)
    }
    setPhotoProcessing(false)
  }

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

        <div className="unit-photo-section">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handlePhotoChange}
          />
          {unit.photo ? (
            <div className="unit-photo-controls">
              <span className="hint small">이 가구 사진 위에서 층마다 바구니를 놓을 수 있어요.</span>
              <div className="unit-photo-actions">
                <button className="btn btn-sm" onClick={() => photoInputRef.current?.click()} disabled={photoProcessing}>
                  {photoProcessing ? '처리 중…' : '📷 다시 찍기'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    if (confirm('가구 사진을 지울까요? 사진 위에 놓은 바구니는 그대로 남아요.')) {
                      setStorageUnitPhoto(room.id, unit.id, null)
                    }
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" onClick={() => photoInputRef.current?.click()} disabled={photoProcessing}>
              {photoProcessing ? '✨ 처리 중…' : '📷 가구 사진 찍기'}
            </button>
          )}
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

        {photoMode ? (
          <PhotoTierEditor room={room} unit={unit} highlightBasketId={highlightBasketId} />
        ) : (
          <div className="shelf-grid-wrap">
            <p className="hint small">
              {unit.rows > 1 || unit.cols > 1
                ? '가구의 층·칸마다 바구니를 놓아보세요. 맨 아래가 1층이에요.'
                : '바구니를 놓고 물건을 정리해보세요.'}
            </p>
            <div className="shelf-grid" style={{ gridTemplateColumns: `repeat(${unit.cols}, minmax(180px, 1fr))` }}>
              {Array.from({ length: unit.rows }).map((_, r) =>
                Array.from({ length: unit.cols }).map((_, c) => {
                  const split = unit.cellSplits.find((sp) => sp.row === r && sp.col === c)
                  const basket = !split
                    ? unit.baskets.find((b) => b.row === r && b.col === c && b.subRow === undefined)
                    : undefined
                  const emptyCells: { row: number; col: number; label: string }[] = []
                  if (!split && unit.rows * unit.cols > 1) {
                    for (let rr = 0; rr < unit.rows; rr++) {
                      for (let cc = 0; cc < unit.cols; cc++) {
                        if (unit.cellSplits.some((sp) => sp.row === rr && sp.col === cc)) continue
                        if (
                          !(rr === r && cc === c) &&
                          !unit.baskets.some((b) => b.row === rr && b.col === cc && b.subRow === undefined)
                        ) {
                          emptyCells.push({ row: rr, col: cc, label: `${unit.rows - rr}층 · ${cc + 1}칸으로` })
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
                      {split ? (
                        <SplitCellPanel
                          room={room}
                          unit={unit}
                          row={r}
                          col={c}
                          split={split}
                          highlightBasketId={highlightBasketId}
                        />
                      ) : basket ? (
                        <BasketPanel
                          roomId={room.id}
                          unitId={unit.id}
                          basketId={basket.id}
                          name={basket.name}
                          items={basket.items}
                          emptyCells={emptyCells}
                          highlighted={basket.id === highlightBasketId}
                          onRename={(name) => renameBasket(room.id, unit.id, basket.id, name)}
                          onMove={(row, col, subRow, subCol) =>
                            moveBasketToCell(room.id, unit.id, basket.id, row, col, subRow, subCol)
                          }
                          onDelete={() => {
                            if (confirm(`'${basket.name}' 바구니를 삭제할까요?`)) deleteBasket(room.id, unit.id, basket.id)
                          }}
                        />
                      ) : (
                        <EmptyCell
                          onAdd={(name) => addBasket(room.id, unit.id, name, r, c)}
                          onSplit={(subRows, subCols) => splitCell(room.id, unit.id, r, c, subRows, subCols)}
                        />
                      )}
                    </div>
                  )
                }),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const DEFAULT_BOX_SIZE = { width: 18, height: 14 }

function PhotoTierEditor({
  room,
  unit,
  highlightBasketId,
}: {
  room: Room
  unit: StorageUnit
  highlightBasketId?: string | null
}) {
  const { addPhotoBasket, moveBasketPosition, renameBasket, deleteBasket } = useHouseStore()
  const photoRef = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [openBasketId, setOpenBasketId] = useState<string | null>(null)

  const draggingRef = useRef<{ basketId: string; offsetX: number; offsetY: number } | null>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPressRef = useRef<{
    basketId: string
    pointerId: number
    startX: number
    startY: number
    boxX: number
    boxY: number
  } | null>(null)
  const lastTapRef = useRef<{ basketId: string; time: number } | null>(null)
  const [pressingBasketId, setPressingBasketId] = useState<string | null>(null)

  const photoBaskets = unit.baskets.filter((b) => b.x !== undefined && b.y !== undefined)
  const openBasket = photoBaskets.find((b) => b.id === openBasketId) ?? null

  function relativePos(clientX: number, clientY: number) {
    const rect = photoRef.current!.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  // 사진 위에 실제 서랍/선반 영역만큼 드래그해서 사각형으로 표시한다 (도면에 방 그리는 것과 같은 방식).
  // 포인터 캡처를 걸어야 드래그 도중 화면이 살짝 스크롤되거나 손가락이 살짝 벗어나도
  // 드래그가 중간에 끊기지 않는다.
  function handlePhotoPointerDown(e: React.PointerEvent) {
    if (!drawing) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const pos = relativePos(e.clientX, e.clientY)
    setDrawStart(pos)
    setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  function handlePhotoPointerMove(e: React.PointerEvent) {
    if (drawing && drawStart) {
      const pos = relativePos(e.clientX, e.clientY)
      const x = Math.min(drawStart.x, pos.x)
      const y = Math.min(drawStart.y, pos.y)
      const width = Math.abs(pos.x - drawStart.x)
      const height = Math.abs(pos.y - drawStart.y)
      setDraftRect({ x, y, width, height })
      return
    }
    const dragging = draggingRef.current
    if (!dragging) return
    const pos = relativePos(e.clientX, e.clientY)
    moveBasketPosition(room.id, unit.id, dragging.basketId, pos.x - dragging.offsetX, pos.y - dragging.offsetY)
  }

  function handlePhotoPointerUp() {
    if (drawing) {
      setDrawStart(null)
      if (draftRect && draftRect.width > 2 && draftRect.height > 2) {
        addPhotoBasket(
          room.id,
          unit.id,
          `${photoBaskets.length + 1}단`,
          draftRect.x,
          draftRect.y,
          draftRect.width,
          draftRect.height,
        )
        setDrawing(false)
      }
      setDraftRect(null)
      return
    }
    draggingRef.current = null
    cancelPendingPress()
  }

  function cancelPendingPress() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    pendingPressRef.current = null
    setPressingBasketId(null)
  }

  // 방의 가구 이동과 같은 규칙: 꾹 눌러야(1초) 옮길 수 있고, 짧게 두 번 눌러야 편집창이 열린다.
  // 브라우저 기본 동작(길게 누르기 메뉴, 더블탭 확대/검색 팝업)이 끼어들지 않도록 막는다.
  function handleMarkerPointerDown(e: React.PointerEvent, basketId: string, boxX: number, boxY: number) {
    e.stopPropagation()
    e.preventDefault()
    const pointerId = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(pointerId)
    pendingPressRef.current = { basketId, pointerId, startX: e.clientX, startY: e.clientY, boxX, boxY }
    setPressingBasketId(basketId)
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null
      const pending = pendingPressRef.current
      if (pending?.basketId === basketId && pending.pointerId === pointerId) {
        const startPos = relativePos(pending.startX, pending.startY)
        draggingRef.current = {
          basketId,
          offsetX: startPos.x - pending.boxX,
          offsetY: startPos.y - pending.boxY,
        }
        pendingPressRef.current = null
        setPressingBasketId(null)
      }
    }, LONG_PRESS_MS)
  }

  function handleMarkerPointerMove(e: React.PointerEvent) {
    const pending = pendingPressRef.current
    if (!pending || pending.pointerId !== e.pointerId || draggingRef.current) return
    const dx = e.clientX - pending.startX
    const dy = e.clientY - pending.startY
    if (Math.hypot(dx, dy) > PRESS_MOVE_CANCEL_PX) {
      cancelPendingPress()
      lastTapRef.current = null
    }
  }

  function handleMarkerPointerUp(e: React.PointerEvent, basketId: string) {
    const pending = pendingPressRef.current
    const wasCleanPress = pending?.pointerId === e.pointerId && pending.basketId === basketId
    const wasDragging = draggingRef.current?.basketId === basketId
    cancelPendingPress()
    if (wasDragging) return

    if (wasCleanPress) {
      const now = Date.now()
      const last = lastTapRef.current
      if (last && last.basketId === basketId && now - last.time < DOUBLE_TAP_MS) {
        lastTapRef.current = null
        setOpenBasketId(basketId)
      } else {
        lastTapRef.current = { basketId, time: now }
      }
    } else {
      lastTapRef.current = null
    }
  }

  return (
    <div className="photo-tier-wrap">
      <div className="photo-tier-toolbar">
        <button className={`btn btn-sm ${drawing ? 'btn-active' : ''}`} onClick={() => setDrawing((v) => !v)}>
          {drawing ? '서랍/선반을 드래그해서 표시…' : '+ 단 추가'}
        </button>
        <span className="hint small">🧺 표시된 영역을 두 번 탭하면 안의 물건을 편집할 수 있어요.</span>
      </div>
      <div
        className={`photo-tier-floor ${drawing ? 'drawing' : ''}`}
        ref={photoRef}
        onPointerDown={handlePhotoPointerDown}
        onPointerMove={handlePhotoPointerMove}
        onPointerUp={handlePhotoPointerUp}
        onPointerLeave={handlePhotoPointerUp}
      >
        <img src={unit.photo!} alt="" className="photo-tier-image" draggable={false} />
        {photoBaskets.map((b) => {
          const width = b.width ?? DEFAULT_BOX_SIZE.width
          const height = b.height ?? DEFAULT_BOX_SIZE.height
          return (
            <div
              key={b.id}
              className={`photo-tier-box ${pressingBasketId === b.id ? 'pressing' : ''} ${
                b.id === highlightBasketId ? 'pulse-highlight' : ''
              }`}
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${width}%`, height: `${height}%` }}
              onPointerDown={(e) => handleMarkerPointerDown(e, b.id, b.x ?? 0, b.y ?? 0)}
              onPointerMove={handleMarkerPointerMove}
              onPointerUp={(e) => handleMarkerPointerUp(e, b.id)}
              onPointerCancel={(e) => handleMarkerPointerUp(e, b.id)}
              onContextMenu={(e) => e.preventDefault()}
              title="꾹 눌러서(약 1초) 위치 이동 · 두 번 탭해서 내용 편집"
            >
              <span className="photo-tier-box-label">
                🧺 {b.name}
                {b.items.length > 0 ? ` (${b.items.length})` : ''}
              </span>
            </div>
          )
        })}
        {draftRect && (
          <div
            className="photo-tier-draft"
            style={{
              left: `${draftRect.x}%`,
              top: `${draftRect.y}%`,
              width: `${draftRect.width}%`,
              height: `${draftRect.height}%`,
            }}
          />
        )}
        {drawing && <div className="placing-hint">사진에서 실제 서랍/선반 영역만큼 드래그하세요</div>}
      </div>

      {openBasket && (
        <div className="modal-backdrop" onClick={() => setOpenBasketId(null)}>
          <div className="modal-card photo-basket-modal" onClick={(e) => e.stopPropagation()}>
            <BasketPanel
              roomId={room.id}
              unitId={unit.id}
              basketId={openBasket.id}
              name={openBasket.name}
              items={openBasket.items}
              emptyCells={[]}
              highlighted={false}
              onRename={(name) => renameBasket(room.id, unit.id, openBasket.id, name)}
              onMove={() => {}}
              onDelete={() => {
                if (confirm(`'${openBasket.name}' 바구니를 삭제할까요?`)) {
                  deleteBasket(room.id, unit.id, openBasket.id)
                  setOpenBasketId(null)
                }
              }}
            />
            <button className="btn" onClick={() => setOpenBasketId(null)}>
              닫기 ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyCell({
  onAdd,
  onSplit,
}: {
  onAdd: (name: string) => void
  onSplit?: (subRows: number, subCols: number) => void
}) {
  const [name, setName] = useState('')
  const [splitting, setSplitting] = useState(false)
  const [subRows, setSubRows] = useState(CELL_SPLIT_DEFAULT.subRows)
  const [subCols, setSubCols] = useState(CELL_SPLIT_DEFAULT.subCols)

  function submit() {
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
  }

  if (splitting) {
    return (
      <div className="shelf-cell-empty shelf-cell-split-form">
        <p className="hint small">이 칸 내부를 더 잘게 나눠서 칸마다 따로 정리해보세요.</p>
        <div className="split-form-row">
          <label>
            세로
            <input
              type="number"
              min={CELL_SPLIT_MIN}
              max={CELL_SPLIT_MAX}
              value={subRows}
              onChange={(e) => setSubRows(Number(e.target.value) || CELL_SPLIT_MIN)}
            />
          </label>
          <label>
            가로
            <input
              type="number"
              min={CELL_SPLIT_MIN}
              max={CELL_SPLIT_MAX}
              value={subCols}
              onChange={(e) => setSubCols(Number(e.target.value) || CELL_SPLIT_MIN)}
            />
          </label>
        </div>
        <div className="split-form-actions">
          <button className="btn btn-sm" onClick={() => setSplitting(false)}>
            취소
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => onSplit?.(subRows, subCols)}>
            나누기
          </button>
        </div>
      </div>
    )
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
      {onSplit && (
        <button className="btn btn-sm" onClick={() => setSplitting(true)} title="이 칸 내부를 더 잘게 나눠요">
          ⛶ 칸 나누기
        </button>
      )}
    </div>
  )
}

function SplitCellPanel({
  room,
  unit,
  row,
  col,
  split,
  highlightBasketId,
}: {
  room: Room
  unit: StorageUnit
  row: number
  col: number
  split: CellSplit
  highlightBasketId?: string | null
}) {
  const { addBasket, renameBasket, moveBasketToCell, deleteBasket, unsplitCell } = useHouseStore()
  const baskets = unit.baskets.filter((b) => b.row === row && b.col === col && b.subRow !== undefined)
  const hasAny = baskets.length > 0

  return (
    <div className="subcell-wrap">
      <div
        className="subcell-grid"
        style={{ gridTemplateColumns: `repeat(${split.subCols}, minmax(96px, 1fr))` }}
      >
        {Array.from({ length: split.subRows }).map((_, sr) =>
          Array.from({ length: split.subCols }).map((_, sc) => {
            const subBasket = baskets.find((b) => b.subRow === sr && b.subCol === sc)
            const siblingEmpty: { row: number; col: number; subRow: number; subCol: number; label: string }[] = []
            if (split.subRows * split.subCols > 1) {
              for (let rr = 0; rr < split.subRows; rr++) {
                for (let cc = 0; cc < split.subCols; cc++) {
                  if (!(rr === sr && cc === sc) && !baskets.some((b) => b.subRow === rr && b.subCol === cc)) {
                    siblingEmpty.push({
                      row,
                      col,
                      subRow: rr,
                      subCol: cc,
                      label: `안 ${split.subRows - rr}-${cc + 1}로`,
                    })
                  }
                }
              }
            }
            return (
              <div className="subcell" key={`${sr}-${sc}`}>
                <span className="subcell-label">
                  안 {split.subRows - sr}-{sc + 1}
                </span>
                {subBasket ? (
                  <BasketPanel
                    roomId={room.id}
                    unitId={unit.id}
                    basketId={subBasket.id}
                    name={subBasket.name}
                    items={subBasket.items}
                    emptyCells={siblingEmpty}
                    highlighted={subBasket.id === highlightBasketId}
                    compact
                    onRename={(name) => renameBasket(room.id, unit.id, subBasket.id, name)}
                    onMove={(r, c, subRow, subCol) => moveBasketToCell(room.id, unit.id, subBasket.id, r, c, subRow, subCol)}
                    onDelete={() => {
                      if (confirm(`'${subBasket.name}' 바구니를 삭제할까요?`)) deleteBasket(room.id, unit.id, subBasket.id)
                    }}
                  />
                ) : (
                  <EmptyCell onAdd={(name) => addBasket(room.id, unit.id, name, row, col, sr, sc)} />
                )}
              </div>
            )
          }),
        )}
      </div>
      <button
        className="btn btn-sm subcell-unsplit"
        disabled={hasAny}
        onClick={() => unsplitCell(room.id, unit.id, row, col)}
        title={hasAny ? '안의 바구니를 모두 지우면 다시 합칠 수 있어요' : '나눈 칸을 다시 하나로 합쳐요'}
      >
        ⛶ 합치기
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

interface MoveTarget {
  row: number
  col: number
  subRow?: number
  subCol?: number
  label: string
}

function BasketPanel({
  roomId,
  unitId,
  basketId,
  name,
  items,
  emptyCells,
  highlighted,
  compact,
  onRename,
  onMove,
  onDelete,
}: {
  roomId: string
  unitId: string
  basketId: string
  name: string
  items: StorageUnit['baskets'][number]['items']
  emptyCells: MoveTarget[]
  highlighted: boolean
  compact?: boolean
  onRename: (name: string) => void
  onMove: (row: number, col: number, subRow?: number, subCol?: number) => void
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
    <div className={`basket-panel ${highlighted ? 'pulse-highlight' : ''} ${compact ? 'basket-panel-compact' : ''}`}>
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
            const target = emptyCells[Number(e.target.value)]
            if (target) onMove(target.row, target.col, target.subRow, target.subCol)
          }}
        >
          <option value="" disabled>
            다른 칸으로 이동…
          </option>
          {emptyCells.map((target, idx) => (
            <option key={idx} value={idx}>
              {target.label}
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
