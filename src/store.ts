import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Basket, House, Item, Room, RoomKind, SearchResult, StorageType, StorageUnit } from './types'
import { UNIT_GRID_DEFAULT, UNIT_GRID_MAX, UNIT_GRID_MIN, UNIT_SIZE_DEFAULT, UNIT_SIZE_MIN } from './types'
import { makeId } from './utils/id'

// 최대 크기는 제한하지 않는다 - 찌그러지지 않도록 최소값만 지킨다.
function clampSize(width: number, height: number) {
  return {
    width: Math.max(UNIT_SIZE_MIN.width, Number.isFinite(width) ? width : UNIT_SIZE_MIN.width),
    height: Math.max(UNIT_SIZE_MIN.height, Number.isFinite(height) ? height : UNIT_SIZE_MIN.height),
  }
}

function clampGrid(rows: number, cols: number) {
  return {
    rows: Math.max(UNIT_GRID_MIN, Math.min(UNIT_GRID_MAX, Math.round(rows) || UNIT_GRID_MIN)),
    cols: Math.max(UNIT_GRID_MIN, Math.min(UNIT_GRID_MAX, Math.round(cols) || UNIT_GRID_MIN)),
  }
}

interface HouseState {
  house: House
  setFloorPlanImage: (dataUrl: string | null) => void

  addRoom: (room: Omit<Room, 'id' | 'storageUnits'>) => string
  updateRoom: (roomId: string, patch: Partial<Omit<Room, 'id' | 'storageUnits'>>) => void
  deleteRoom: (roomId: string) => void

  addStorageUnit: (
    roomId: string,
    unit: { type: StorageType; name: string; x: number; y: number; designId?: string },
  ) => string
  moveStorageUnit: (roomId: string, unitId: string, x: number, y: number) => void
  resizeStorageUnit: (roomId: string, unitId: string, width: number, height: number) => void
  setStorageUnitGrid: (roomId: string, unitId: string, rows: number, cols: number) => void
  renameStorageUnit: (roomId: string, unitId: string, name: string) => void
  deleteStorageUnit: (roomId: string, unitId: string) => void

  addBasket: (roomId: string, unitId: string, name: string, row: number, col: number) => string
  renameBasket: (roomId: string, unitId: string, basketId: string, name: string) => void
  moveBasketToCell: (roomId: string, unitId: string, basketId: string, row: number, col: number) => void
  deleteBasket: (roomId: string, unitId: string, basketId: string) => void
  setWardrobeStyle: (roomId: string, unitId: string, style: 'door' | 'drawer') => void

  addItem: (
    roomId: string,
    unitId: string,
    basketId: string,
    item: { name: string; icon: string; memo?: string; quantity?: number },
  ) => string
  updateItem: (
    roomId: string,
    unitId: string,
    basketId: string,
    itemId: string,
    patch: Partial<Omit<Item, 'id'>>,
  ) => void
  deleteItem: (roomId: string, unitId: string, basketId: string, itemId: string) => void

  search: (query: string) => SearchResult[]
  resetHouse: () => void
}

const emptyHouse: House = {
  floorPlanImage: null,
  rooms: [],
}

export const useHouseStore = create<HouseState>()(
  persist(
    (set, get) => ({
      house: emptyHouse,

      setFloorPlanImage: (dataUrl) =>
        set((s) => ({ house: { ...s.house, floorPlanImage: dataUrl } })),

      addRoom: (room) => {
        const id = makeId()
        set((s) => ({
          house: {
            ...s.house,
            rooms: [...s.house.rooms, { ...room, id, storageUnits: [] }],
          },
        }))
        return id
      },

      updateRoom: (roomId, patch) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
          },
        })),

      deleteRoom: (roomId) =>
        set((s) => ({
          house: { ...s.house, rooms: s.house.rooms.filter((r) => r.id !== roomId) },
        })),

      addStorageUnit: (roomId, unit) => {
        const id = makeId()
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: [
                      ...r.storageUnits,
                      { ...UNIT_SIZE_DEFAULT, ...UNIT_GRID_DEFAULT, ...unit, id, baskets: [] } as StorageUnit,
                    ],
                  }
                : r,
            ),
          },
        }))
        return id
      },

      moveStorageUnit: (roomId, unitId, x, y) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId ? { ...u, x, y } : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      resizeStorageUnit: (roomId, unitId, width, height) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId ? { ...u, ...clampSize(width, height) } : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      setStorageUnitGrid: (roomId, unitId, rows, cols) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) => {
                      if (u.id !== unitId) return u
                      const grid = clampGrid(rows, cols)
                      // 칸 수가 줄어들면 그 칸 밖에 있던 바구니를 범위 안으로 당겨온다
                      const baskets = u.baskets.map((b) => ({
                        ...b,
                        row: Math.min(b.row, grid.rows - 1),
                        col: Math.min(b.col, grid.cols - 1),
                      }))
                      return { ...u, ...grid, baskets }
                    }),
                  }
                : r,
            ),
          },
        })),

      renameStorageUnit: (roomId, unitId, name) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId ? { ...u, name } : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      deleteStorageUnit: (roomId, unitId) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? { ...r, storageUnits: r.storageUnits.filter((u) => u.id !== unitId) }
                : r,
            ),
          },
        })),

      addBasket: (roomId, unitId, name, row, col) => {
        const id = makeId()
        const basket: Basket = { id, name, row, col, items: [] }
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId ? { ...u, baskets: [...u.baskets, basket] } : u,
                    ),
                  }
                : r,
            ),
          },
        }))
        return id
      },

      renameBasket: (roomId, unitId, basketId, name) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId
                        ? {
                            ...u,
                            baskets: u.baskets.map((b) =>
                              b.id === basketId ? { ...b, name } : b,
                            ),
                          }
                        : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      moveBasketToCell: (roomId, unitId, basketId, row, col) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId
                        ? {
                            ...u,
                            baskets: u.baskets.map((b) =>
                              b.id === basketId ? { ...b, row, col } : b,
                            ),
                          }
                        : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      deleteBasket: (roomId, unitId, basketId) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId
                        ? { ...u, baskets: u.baskets.filter((b) => b.id !== basketId) }
                        : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      setWardrobeStyle: (roomId, unitId, style) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId ? { ...u, wardrobeStyle: style } : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      addItem: (roomId, unitId, basketId, item) => {
        const id = makeId()
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId
                        ? {
                            ...u,
                            baskets: u.baskets.map((b) =>
                              b.id === basketId
                                ? { ...b, items: [...b.items, { ...item, id }] }
                                : b,
                            ),
                          }
                        : u,
                    ),
                  }
                : r,
            ),
          },
        }))
        return id
      },

      updateItem: (roomId, unitId, basketId, itemId, patch) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId
                        ? {
                            ...u,
                            baskets: u.baskets.map((b) =>
                              b.id === basketId
                                ? {
                                    ...b,
                                    items: b.items.map((it) =>
                                      it.id === itemId ? { ...it, ...patch } : it,
                                    ),
                                  }
                                : b,
                            ),
                          }
                        : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      deleteItem: (roomId, unitId, basketId, itemId) =>
        set((s) => ({
          house: {
            ...s.house,
            rooms: s.house.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    storageUnits: r.storageUnits.map((u) =>
                      u.id === unitId
                        ? {
                            ...u,
                            baskets: u.baskets.map((b) =>
                              b.id === basketId
                                ? { ...b, items: b.items.filter((it) => it.id !== itemId) }
                                : b,
                            ),
                          }
                        : u,
                    ),
                  }
                : r,
            ),
          },
        })),

      search: (query) => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        const results: SearchResult[] = []
        for (const room of get().house.rooms) {
          for (const unit of room.storageUnits) {
            for (const basket of unit.baskets) {
              for (const item of basket.items) {
                if (item.name.toLowerCase().includes(q)) {
                  results.push({ item, basket, storageUnit: unit, room })
                }
              }
            }
          }
        }
        return results
      },

      resetHouse: () => set({ house: emptyHouse }),
    }),
    { name: 'home-storage-app' },
  ),
)

export const DEFAULT_ROOM_KIND_ORDER: RoomKind[] = [
  'living',
  'kitchen',
  'bedroom',
  'bathroom',
  'entrance',
  'other',
]
