import { useEffect, useState } from 'react'
import { attemptExit, initExitGuard } from './backNav'
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
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [exitPrimed, setExitPrimed] = useState(false)

  // 메인 화면(아무 창도 안 열린 상태)에서 뒤로가기를 누르면 앱을 바로 끄지 않고 물어본다.
  useEffect(() => initExitGuard(() => setExitConfirmOpen(true)), [])

  // 브라우저는 보안상 페이지가 스스로 탭을 완전히 닫는 걸 대부분 허용하지 않는다.
  // attemptExit()가 히스토리는 다 정리해놔서 이 상태에서 뒤로가기를 한 번 더 누르면
  // 확실히 꺼지지만, 아무 안내 없이는 "예"를 눌러도 안 꺼지는 것처럼 보이므로 알려준다.
  useEffect(() => {
    if (!exitPrimed) return
    const timer = setTimeout(() => setExitPrimed(false), 5000)
    return () => clearTimeout(timer)
  }, [exitPrimed])

  const isHome = !openRoomId && !familyShareOpen
  function goHome() {
    setOpenRoomId(null)
    setFamilyShareOpen(false)
    setSearchTarget(null)
  }

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

      {!isHome && (
        <button className="home-fab" onClick={goHome} title="메인 화면으로">
          🏠 홈
        </button>
      )}

      {exitConfirmOpen && (
        <div className="modal-backdrop" onClick={() => setExitConfirmOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>앱을 종료하시겠습니까?</h3>
            <div className="modal-actions">
              <button className="btn" onClick={() => setExitConfirmOpen(false)}>
                아니오
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setExitConfirmOpen(false)
                  attemptExit()
                  setExitPrimed(true)
                }}
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {exitPrimed && <div className="exit-toast">🚪 뒤로가기를 한 번 더 누르면 종료돼요</div>}
    </div>
  )
}

export default App
