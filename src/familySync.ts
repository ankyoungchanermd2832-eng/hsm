// 가족끼리 같은 "가족 코드"를 입력하면, 클라우드(Firebase)를 통해 도면/방/수납공간/물건
// 데이터가 실시간으로 공유된다. 코드를 설정하지 않으면 지금까지처럼 이 기기 안에만
// 저장되고 아무 데이터도 클라우드로 나가지 않는다 (완전히 선택 사항).
//
// 정책: 클라우드에 이미 데이터가 있으면 그걸 기준으로 맞춘다. 이 기기에서 뭔가 바뀌면
// 클라우드로 올려서 다른 가족 기기가 곧바로 받아가게 한다 (마지막에 저장한 내용이 기준).

import { off, onValue, ref, set as dbSet } from 'firebase/database'
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

  let lastKnownUpdatedAt = 0
  const houseRef = ref(db, `houses/${code}`)

  const listener = onValue(houseRef, (snapshot) => {
    const payload = snapshot.val() as SyncPayload | null
    if (!payload?.house || payload.updatedAt <= lastKnownUpdatedAt) return
    lastKnownUpdatedAt = payload.updatedAt
    suppressPush = true
    useHouseStore.getState().hydrateHouse(payload.house)
    setTimeout(() => {
      suppressPush = false
    }, 0)
  })

  const storeUnsubscribe = useHouseStore.subscribe((state, prevState) => {
    if (suppressPush || state.house === prevState.house) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      const updatedAt = Date.now()
      lastKnownUpdatedAt = updatedAt
      void dbSet(houseRef, { house: useHouseStore.getState().house, updatedAt } satisfies SyncPayload)
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
}

/** 앱 시작 시 이미 설정된 가족 코드가 있으면 동기화를 이어서 켠다. */
export function initFamilySync(): void {
  if (!firebaseConfigured) return
  const code = getFamilyCode()
  if (code) startSyncForCode(code)
}
