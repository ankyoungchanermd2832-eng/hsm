// PC에서 켜둔 run.bat 서버를 같은 와이파이의 다른 기기(휴대폰 등)와 공유해서, 도면/방/
// 수납공간/물건 데이터를 실시간으로 맞춘다. 서버는 이 컴퓨터 안에서만 돌고, 데이터는
// 이 컴퓨터의 로컬 파일에만 저장된다 (외부 클라우드 전송 없음).
//
// 정책: 서버에 이미 데이터가 있으면 서버를 기준으로 맞춘다. 이 기기에서 뭔가 바뀌면
// 서버로 올려서 다른 기기가 몇 초 안에 받아가게 한다 (마지막에 저장한 내용이 기준).

import { useHouseStore } from './store'
import type { House } from './types'

const POLL_INTERVAL_MS = 3000
const PUSH_DEBOUNCE_MS = 500

let lastKnownUpdatedAt = 0
let suppressPush = false
let pushTimer: ReturnType<typeof setTimeout> | null = null

interface SyncPayload {
  house: House | null
  updatedAt: number
}

async function fetchServerHouse(): Promise<SyncPayload | null> {
  try {
    const res = await fetch('/api/house')
    if (!res.ok) return null
    return (await res.json()) as SyncPayload
  } catch {
    return null
  }
}

async function pushHouseToServer(house: House) {
  try {
    const res = await fetch('/api/house', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house }),
    })
    if (res.ok) {
      const payload = (await res.json()) as SyncPayload
      lastKnownUpdatedAt = payload.updatedAt
    }
  } catch {
    // 서버에 못 닿아도(오프라인 등) 로컬 저장(localStorage)은 그대로라 무시해도 된다
  }
}

function applyServerHouse(house: House, updatedAt: number) {
  suppressPush = true
  useHouseStore.getState().hydrateHouse(house)
  lastKnownUpdatedAt = updatedAt
  setTimeout(() => {
    suppressPush = false
  }, 0)
}

export function initHouseSync() {
  void (async () => {
    const server = await fetchServerHouse()
    if (!server) return // 서버에 못 닿으면(오프라인 등) 로컬 저장만 계속 사용

    const localHouse = useHouseStore.getState().house
    const localHasData = localHouse.rooms.length > 0 || localHouse.floorPlanImage !== null

    if (server.house && server.updatedAt > 0) {
      // 서버에 이미 데이터가 있으면 그걸 기준으로 맞춘다 (다른 기기가 더 최신일 수 있다)
      applyServerHouse(server.house, server.updatedAt)
    } else if (localHasData) {
      // 서버는 비어있는데 이 기기엔 예전 데이터가 있으면, 서버에 올려서 공유를 시작한다
      await pushHouseToServer(localHouse)
    }
  })()

  // 다른 기기가 바꾼 내용을 주기적으로 받아온다
  setInterval(() => {
    void (async () => {
      const server = await fetchServerHouse()
      if (!server || !server.house) return
      if (server.updatedAt > lastKnownUpdatedAt) {
        applyServerHouse(server.house, server.updatedAt)
      }
    })()
  }, POLL_INTERVAL_MS)

  // 이 기기에서 바뀐 내용을 서버로 올려서 다른 기기와 공유한다
  useHouseStore.subscribe((state, prevState) => {
    if (suppressPush) return
    if (state.house === prevState.house) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      void pushHouseToServer(useHouseStore.getState().house)
    }, PUSH_DEBOUNCE_MS)
  })
}
