// 가족끼리 같은 "가족 코드"를 입력하면, 클라우드(Firebase)를 통해 도면/방/수납공간/물건
// 데이터가 실시간으로 공유된다. 코드를 설정하지 않으면 지금까지처럼 이 기기 안에만
// 저장되고 아무 데이터도 클라우드로 나가지 않는다 (완전히 선택 사항).
//
// 정책: 클라우드에 이미 데이터가 있으면 그걸 기준으로 맞춘다. 이 기기에서 뭔가 바뀌면
// 클라우드로 올려서 다른 가족 기기가 곧바로 받아가게 한다 (마지막에 저장한 내용이 기준).

import { get, off, onValue, ref, set as dbSet } from 'firebase/database'
import { db, firebaseConfigured } from './firebase'
import { useHouseStore } from './store'
import type { House } from './types'

const STORAGE_KEY = 'hsm-family-code'
const PUSH_DEBOUNCE_MS = 800
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 헷갈리기 쉬운 0/O, 1/I 는 뺀다

interface SyncPayload {
  house: House
  updatedAt: number
}

let suppressPush = false
let pushTimer: ReturnType<typeof setTimeout> | null = null
let stopCurrentSync: (() => void) | null = null

// 동기화 성공/실패 상태를 화면(가족 공유 창)에서도 바로 볼 수 있게 한다 - 콘솔에만
// 남으면 휴대폰에서는 확인할 방법이 없어서, 권한/네트워크 문제를 놓치기 쉬웠다.
export interface SyncStatus {
  error: string | null
  lastSyncedAt: number | null
}

let syncStatus: SyncStatus = { error: null, lastSyncedAt: null }
const statusListeners = new Set<() => void>()

function setSyncStatus(patch: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...patch }
  statusListeners.forEach((fn) => fn())
}

export function getSyncStatus(): SyncStatus {
  return syncStatus
}

export function subscribeSyncStatus(fn: () => void): () => void {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

export function isFamilySyncAvailable(): boolean {
  return firebaseConfigured
}

export function getFamilyCode(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

function randomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

function startSyncForCode(code: string) {
  if (!db) return
  stopCurrentSync?.()
  setSyncStatus({ error: null, lastSyncedAt: null })

  let lastKnownUpdatedAt = 0
  const houseRef = ref(db, `houses/${code}`)

  function applyPayload(payload: SyncPayload | null) {
    setSyncStatus({ error: null, lastSyncedAt: Date.now() })
    if (!payload?.house || payload.updatedAt <= lastKnownUpdatedAt) return
    lastKnownUpdatedAt = payload.updatedAt
    suppressPush = true
    useHouseStore.getState().hydrateHouse(payload.house)
    setTimeout(() => {
      suppressPush = false
    }, 0)
  }

  function reportReadError(err: Error) {
    // 권한 규칙 문제 등으로 못 읽으면 조용히 실패하지 않고 화면에도 보이게 한다.
    console.error('가족 공유 데이터를 받아오지 못했어요 (권한/네트워크 문제일 수 있어요).', err)
    setSyncStatus({ error: `동기화 오류: ${err.message}` })
  }

  // 새로 구독을 시작할 때 onValue의 첫 콜백이 늦게 오거나 오지 않는 경우가 있어서
  // (특히 다른 기기가 만든 코드에 "참여"할 때), 한 번은 직접 즉시 읽어와서 빠르게
  // 동기화한다. 그 이후의 실시간 변경 감지는 계속 onValue가 담당한다.
  void get(houseRef)
    .then((snapshot) => applyPayload(snapshot.val() as SyncPayload | null))
    .catch(reportReadError)

  const listener = onValue(
    houseRef,
    (snapshot) => applyPayload(snapshot.val() as SyncPayload | null),
    reportReadError,
  )

  const storeUnsubscribe = useHouseStore.subscribe((state, prevState) => {
    if (suppressPush || state.house === prevState.house) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      const updatedAt = Date.now()
      lastKnownUpdatedAt = updatedAt
      void dbSet(houseRef, { house: useHouseStore.getState().house, updatedAt } satisfies SyncPayload)
        .then(() => setSyncStatus({ error: null, lastSyncedAt: Date.now() }))
        .catch((err) => {
          console.error('가족 공유 데이터를 올리지 못했어요 (권한/네트워크 문제일 수 있어요).', err)
          setSyncStatus({ error: `업로드 오류: ${err.message}` })
        })
    }, PUSH_DEBOUNCE_MS)
  })

  stopCurrentSync = () => {
    off(houseRef, 'value', listener)
    storeUnsubscribe()
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = null
  }
}

/** 새 가족 코드를 만들고, 이 기기의 현재 데이터를 바로 클라우드에 올려서 공유를 시작한다. */
export function createFamilyCode(): string {
  const code = randomCode()
  localStorage.setItem(STORAGE_KEY, code)
  startSyncForCode(code)
  if (db) {
    void dbSet(ref(db, `houses/${code}`), {
      house: useHouseStore.getState().house,
      updatedAt: Date.now(),
    } satisfies SyncPayload)
      .then(() => setSyncStatus({ error: null, lastSyncedAt: Date.now() }))
      .catch((err) => {
        console.error('가족 공유 코드를 만들었지만 초기 데이터를 올리지 못했어요.', err)
        setSyncStatus({ error: `업로드 오류: ${err.message}` })
      })
  }
  return code
}

/** 가족이 알려준 코드로 참여한다. 참여하는 순간부터는 그 가족의 클라우드 데이터를 기준으로 맞춘다. */
export function joinFamilyCode(code: string): void {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return
  localStorage.setItem(STORAGE_KEY, normalized)
  startSyncForCode(normalized)
}

export function leaveFamilyCode(): void {
  localStorage.removeItem(STORAGE_KEY)
  stopCurrentSync?.()
  stopCurrentSync = null
  setSyncStatus({ error: null, lastSyncedAt: null })
}

/** 앱 시작 시 이미 설정된 가족 코드가 있으면 동기화를 이어서 켠다. */
export function initFamilySync(): void {
  if (!firebaseConfigured) return
  const code = getFamilyCode()
  if (code) startSyncForCode(code)
}
