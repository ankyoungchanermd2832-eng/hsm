import { useRef, useState } from 'react'
import { useHouseStore } from '../store'
import { ROOM_KIND_COLOR, type Room, type RoomKind } from '../types'
import { prepareFloorPlanImage } from '../utils/floorPlanStyle'
import { detectRoomsFromFloorPlan } from '../utils/roomDetect'
import { RoomKindPicker } from './RoomKindPicker'
import './FloorPlanBoard.css'

interface DrawRect {
  x: number
  y: number
  width: number
  height: number
}

const ZOOM_MIN = 1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.5

// 방 크기 조정 손잡이도 가구 사진의 보관함처럼 꾹 눌러야(약 1초) 활성화된다.
const LONG_PRESS_MS = 1000
const PRESS_MOVE_CANCEL_PX = 18

interface FloorPlanBoardProps {
  onOpenRoom: (roomId: string) => void
  highlightRoomId?: string | null
}

export function FloorPlanBoard({ onOpenRoom, highlightRoomId }: FloorPlanBoardProps) {
  const { house, setFloorPlanImage, addRoom, updateRoom, deleteRoom } = useHouseStore()
  const boardRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 손가락 두 개로 꼬집듯 확대/축소(핀치 줌)하기 위해 현재 눌려있는 손가락들을 추적한다.
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{
    startDist: number
    startZoom: number
    midX: number
    midY: number
    startScrollLeft: number
    startScrollTop: number
  } | null>(null)

  const [drawMode, setDrawMode] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draftRect, setDraftRect] = useState<DrawRect | null>(null)
  const [pendingRect, setPendingRect] = useState<DrawRect | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomKind, setNewRoomKind] = useState<RoomKind>('living')
  const [processingStage, setProcessingStage] = useState<'styling' | 'detecting' | null>(null)
  const processingImage = processingStage !== null
  const [zoom, setZoom] = useState(1)

  // 방 테두리 크기 조정
  const resizingRoomRef = useRef<{ roomId: string; anchorX: number; anchorY: number } | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingResizeRef = useRef<{
    roomId: string
    pointerId: number
    anchorX: number
    anchorY: number
    startX: number
    startY: number
  } | null>(null)
  const [resizeArmedRoomId, setResizeArmedRoomId] = useState<string | null>(null)

  function cancelPendingRoomResize() {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = null
    }
    pendingResizeRef.current = null
    setResizeArmedRoomId(null)
  }

  // 방 상자 오른쪽 아래 손잡이도 꾹 눌러야(약 1초) 크기 조정이 활성화된다 - 가구 보관함과 같은 규칙.
  // 그래야 방을 열려고 살짝 탭했을 때 실수로 크기가 바뀌지 않는다.
  function handleRoomResizePointerDown(e: React.PointerEvent, roomId: string, anchorX: number, anchorY: number) {
    e.stopPropagation()
    e.preventDefault()
    const pointerId = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(pointerId)
    pendingResizeRef.current = { roomId, pointerId, anchorX, anchorY, startX: e.clientX, startY: e.clientY }
    setResizeArmedRoomId(roomId)
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    resizeTimerRef.current = setTimeout(() => {
      resizeTimerRef.current = null
      const pending = pendingResizeRef.current
      if (pending?.roomId === roomId && pending.pointerId === pointerId) {
        resizingRoomRef.current = { roomId, anchorX: pending.anchorX, anchorY: pending.anchorY }
        pendingResizeRef.current = null
      }
    }, LONG_PRESS_MS)
  }

  function handleRoomResizePointerMove(e: React.PointerEvent) {
    const resizing = resizingRoomRef.current
    if (resizing) {
      e.stopPropagation()
      const pos = relativePos(e.clientX, e.clientY)
      const width = Math.max(3, Math.min(100 - resizing.anchorX, pos.x - resizing.anchorX))
      const height = Math.max(3, Math.min(100 - resizing.anchorY, pos.y - resizing.anchorY))
      updateRoom(resizing.roomId, { width, height })
      return
    }
    const pending = pendingResizeRef.current
    if (!pending || pending.pointerId !== e.pointerId) return
    const dx = e.clientX - pending.startX
    const dy = e.clientY - pending.startY
    if (Math.hypot(dx, dy) > PRESS_MOVE_CANCEL_PX) {
      cancelPendingRoomResize()
    }
  }

  function handleRoomResizePointerUp(e: React.PointerEvent) {
    if (resizingRoomRef.current) {
      e.stopPropagation()
      resizingRoomRef.current = null
      setResizeArmedRoomId(null)
      return
    }
    cancelPendingRoomResize()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcessingStage('styling')
    let stylized: string
    try {
      stylized = await prepareFloorPlanImage(file)
      setFloorPlanImage(stylized)
    } catch (err) {
      console.error('도면 이미지를 준비하는 데 실패해서 원본 사진을 사용해요.', err)
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
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointersRef.current.size === 2) {
      // 두 번째 손가락이 닿으면 핀치 줌을 시작하고, 진행 중이던 한 손가락 드래그(방 그리기)는 취소한다.
      setDragStart(null)
      setDraftRect(null)
      const [p1, p2] = Array.from(activePointersRef.current.values())
      pinchRef.current = {
        startDist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        startZoom: zoom,
        midX: (p1.x + p2.x) / 2,
        midY: (p1.y + p2.y) / 2,
        startScrollLeft: viewportRef.current?.scrollLeft ?? 0,
        startScrollTop: viewportRef.current?.scrollTop ?? 0,
      }
      return
    }
    if (!drawMode) return
    const pos = relativePos(e.clientX, e.clientY)
    setDragStart(pos)
    setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const pinch = pinchRef.current
    if (pinch && activePointersRef.current.size === 2) {
      const [p1, p2] = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.startZoom * (dist / pinch.startDist)))
      setZoom(nextZoom)
      const viewport = viewportRef.current
      if (viewport) {
        const ratio = nextZoom / pinch.startZoom
        const rect = viewport.getBoundingClientRect()
        const contentX = pinch.startScrollLeft + (pinch.midX - rect.left)
        const contentY = pinch.startScrollTop + (pinch.midY - rect.top)
        viewport.scrollLeft = contentX * ratio - (pinch.midX - rect.left)
        viewport.scrollTop = contentY * ratio - (pinch.midY - rect.top)
      }
      return
    }
    if (!drawMode || !dragStart) return
    const pos = relativePos(e.clientX, e.clientY)
    const x = Math.min(dragStart.x, pos.x)
    const y = Math.min(dragStart.y, pos.y)
    const width = Math.abs(pos.x - dragStart.x)
    const height = Math.abs(pos.y - dragStart.y)
    setDraftRect({ x, y, width, height })
  }

  function handlePointerUp(e: React.PointerEvent) {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (activePointersRef.current.size > 0) return
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
          onClick={() => {
            setDrawMode((v) => !v)
            setDeleteMode(false)
          }}
          disabled={!house.floorPlanImage || processingImage}
        >
          {drawMode ? '✏️ 방 그리는 중… (드래그해서 영역 지정)' : '➕ 방 추가하기'}
        </button>
        <button
          className={`btn ${deleteMode ? 'btn-active btn-danger' : ''}`}
          onClick={() => {
            setDeleteMode((v) => !v)
            setDrawMode(false)
          }}
          disabled={house.rooms.length === 0 || processingImage}
        >
          {deleteMode ? '🗑️ 삭제할 방을 눌러주세요' : '🗑️ 방 삭제'}
        </button>
        {house.floorPlanImage && (
          <div className="zoom-controls" title="손가락 두 개로 꼬집듯 확대/축소할 수도 있어요">
            <button
              className="btn btn-sm"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
              title="축소"
            >
              🔍−
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button
              className="btn btn-sm"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
              title="확대"
            >
              🔍+
            </button>
          </div>
        )}
      </div>

      {processingStage === 'styling' && (
        <div className="floorplan-empty">
          <p>✨ 도면 사진을 준비하고 있어요…</p>
          <p className="hint">색은 원본 그대로 유지하고, 용량만 적당히 줄여요.</p>
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
          <p className="hint">업로드한 사진은 색 그대로 쓰고, 벽 구조를 보고 방도 자동으로 나눠드려요.</p>
        </div>
      )}

      {!processingImage && house.floorPlanImage && (
        <div className={`floorplan-viewport ${zoom > 1 ? 'zoomed' : ''}`} ref={viewportRef}>
          <div
            className={`floorplan-board ${drawMode ? 'drawing' : ''}`}
            ref={boardRef}
            style={{ width: `${zoom * 100}%`, touchAction: drawMode ? 'none' : 'pan-x pan-y' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img src={house.floorPlanImage} alt="집 도면" className="floorplan-image" draggable={false} />

            {house.rooms.map((room) => (
              <RoomBox
                key={room.id}
                room={room}
                highlighted={room.id === highlightRoomId}
                deleteMode={deleteMode}
                resizeArmed={resizeArmedRoomId === room.id}
                onResizePointerDown={(e) => handleRoomResizePointerDown(e, room.id, room.x, room.y)}
                onResizePointerMove={handleRoomResizePointerMove}
                onResizePointerUp={handleRoomResizePointerUp}
                onClick={() => {
                  if (drawMode) return
                  if (deleteMode) {
                    if (confirm(`'${room.name}' 방을 삭제할까요? 안의 수납공간 정보도 함께 삭제됩니다.`)) {
                      deleteRoom(room.id)
                    }
                    return
                  }
                  onOpenRoom(room.id)
                }}
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
              <RoomKindPicker value={newRoomKind} onChange={setNewRoomKind} />
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
  deleteMode,
  resizeArmed,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onClick,
}: {
  room: Room
  highlighted: boolean
  deleteMode: boolean
  resizeArmed: boolean
  onResizePointerDown: (e: React.PointerEvent) => void
  onResizePointerMove: (e: React.PointerEvent) => void
  onResizePointerUp: (e: React.PointerEvent) => void
  onClick: () => void
}) {
  return (
    <div
      className={`room-box ${highlighted ? 'pulse-highlight' : ''} ${deleteMode ? 'delete-target' : ''}`}
      style={{
        left: `${room.x}%`,
        top: `${room.y}%`,
        width: `${room.width}%`,
        height: `${room.height}%`,
        borderColor: ROOM_KIND_COLOR[room.kind],
      }}
      onClick={onClick}
      title={deleteMode ? `'${room.name}' 삭제하기` : undefined}
    >
      <span className="room-box-label" style={{ background: ROOM_KIND_COLOR[room.kind] }}>
        {room.name}
        <em>({room.storageUnits.length})</em>
      </span>
      {!deleteMode && (
        <div
          className={`room-resize-handle ${resizeArmed ? 'armed' : ''}`}
          style={{ background: ROOM_KIND_COLOR[room.kind] }}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          title="꾹 눌러서(약 1초) 크기 조정 활성화"
        />
      )}
    </div>
  )
}
