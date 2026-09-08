import { useState } from 'react'
import { useHouseStore } from './store'
import { FloorPlanBoard } from './components/FloorPlanBoard'
import { RoomEditor } from './components/RoomEditor'
import { SearchBar } from './components/SearchBar'
import './App.css'

interface SearchTarget {
  roomId: string
  unitId: string
  basketId: string
}

function App() {
  const house = useHouseStore((s) => s.house)
  const [openRoomId, setOpenRoomId] = useState<string | null>(null)
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null)

  const openRoom = house.rooms.find((r) => r.id === openRoomId) ?? null

  const totalItems = house.rooms.reduce(
    (n, r) => n + r.storageUnits.reduce((m, u) => m + u.baskets.reduce((k, b) => k + b.items.length, 0), 0),
    0,
  )
  const totalUnits = house.rooms.reduce((n, r) => n + r.storageUnits.length, 0)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-logo">🏠</span>
          <div>
            <h1>우리집 수납정리</h1>
            <p>도면을 등록하고 방마다 수납공간을 배치한 뒤, 넣어둔 물건을 검색해서 찾아보세요.</p>
          </div>
        </div>
        <SearchBar onJump={(roomId, unitId, basketId) => setSearchTarget({ roomId, unitId, basketId })} />
      </header>

      <div className="app-stats">
        <span>🚪 방 {house.rooms.length}개</span>
        <span>🗄️ 수납공간 {totalUnits}개</span>
        <span>📦 등록된 물건 {totalItems}개</span>
      </div>

      <main className="app-main">
        <FloorPlanBoard
          highlightRoomId={searchTarget?.roomId ?? null}
          onOpenRoom={(roomId) => setOpenRoomId(roomId)}
        />
      </main>

      {openRoom && (
        <RoomEditor
          key={openRoom.id}
          room={openRoom}
          highlightUnitId={searchTarget?.roomId === openRoom.id ? searchTarget.unitId : null}
          highlightBasketId={searchTarget?.roomId === openRoom.id ? searchTarget.basketId : null}
          onClose={() => {
            setOpenRoomId(null)
            setSearchTarget(null)
          }}
        />
      )}
    </div>
  )
}

export default App
