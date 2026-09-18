import { useState } from 'react'
import { useHouseStore } from './store'
import { FloorPlanBoard } from './components/FloorPlanBoard'
import { RoomEditor } from './components/RoomEditor'
import { SearchBar } from './components/SearchBar'
import { FamilyShareModal } from './components/FamilyShareModal'
import { InstallBanner } from './components/InstallBanner'
import './App.css'

interface SearchTarget {
  roomId: string
  unitId: string
  basketId: string
  itemId: string
}

function App() {
  const house = useHouseStore((s) => s.house)
  const [openRoomId, setOpenRoomId] = useState<string | null>(null)
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null)
  const [familyShareOpen, setFamilyShareOpen] = useState(false)

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
        <div className="app-header-actions">
          <SearchBar
            onJump={(roomId, unitId, basketId, itemId) => setSearchTarget({ roomId, unitId, basketId, itemId })}
          />
          <button className="btn" onClick={() => setFamilyShareOpen(true)}>👪 가족 공유</button>
        </div>
      </header>

      <InstallBanner />

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
          highlightItemId={searchTarget?.roomId === openRoom.id ? searchTarget.itemId : null}
          onClose={() => {
            setOpenRoomId(null)
            setSearchTarget(null)
          }}
        />
      )}

      {familyShareOpen && <FamilyShareModal onClose={() => setFamilyShareOpen(false)} />}
    </div>
  )
}

export default App
