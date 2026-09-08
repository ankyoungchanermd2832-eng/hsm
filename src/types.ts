// 수납공간 종류
export type StorageType =
  | 'bookshelf' // 책장
  | 'drawer' // 서랍장
  | 'wardrobe' // 장롱
  | 'shelf' // 선반
  | 'kitchenCabinet' // 싱크대(부엌 수납장)

export const STORAGE_TYPE_LABEL: Record<StorageType, string> = {
  bookshelf: '책장',
  drawer: '서랍장',
  wardrobe: '장롱',
  shelf: '선반',
  kitchenCabinet: '싱크대',
}

export const STORAGE_TYPE_ICON: Record<StorageType, string> = {
  bookshelf: '📚',
  drawer: '🗄️',
  wardrobe: '🚪',
  shelf: '🗃️',
  kitchenCabinet: '🍽️',
}

export const STORAGE_TYPE_COLOR: Record<StorageType, string> = {
  bookshelf: '#c98a4b',
  drawer: '#7a8fa6',
  wardrobe: '#8a6bb0',
  shelf: '#5aa06a',
  kitchenCabinet: '#c9a06b',
}

export type RoomKind =
  | 'living' // 거실
  | 'kitchen' // 주방
  | 'bedroom' // 침실
  | 'bathroom' // 욕실
  | 'entrance' // 현관
  | 'other' // 기타

export const ROOM_KIND_LABEL: Record<RoomKind, string> = {
  living: '거실',
  kitchen: '주방',
  bedroom: '침실',
  bathroom: '욕실',
  entrance: '현관',
  other: '기타',
}

// 바구니 안에 든 물건
export interface Item {
  id: string
  name: string
  icon: string // 이모지 아이콘
  memo?: string
  quantity?: number
}

// 수납공간 안에 진열된 바구니 - 가구의 세로 층(row)과 가로 칸(col) 중 한 자리에 놓인다.
// 그 칸을 CellSplit 으로 더 잘게 나눴다면 subRow/subCol 로 그 안에서의 위치를 나타낸다.
export interface Basket {
  id: string
  name: string
  row: number
  col: number
  subRow?: number
  subCol?: number
  items: Item[]
}

// 가구의 특정 칸(row, col) 내부를 더 잘게 나눈 정보
export interface CellSplit {
  row: number
  col: number
  subRows: number
  subCols: number
}

export const CELL_SPLIT_MIN = 2
export const CELL_SPLIT_MAX = 4
export const CELL_SPLIT_DEFAULT = { subRows: 2, subCols: 2 }

// 싱크대(주방 수납장) 디자인 프리셋 참조
export interface CabinetDesign {
  id: string
  name: string
  doorColor: string
  frameColor: string
  handleColor: string
  hasUpper: boolean
  countertopColor: string
}

// 수납가구 크기/모양 기본값 (등각 아이콘의 픽셀 크기 기준)
// 최대 크기는 제한하지 않는다 - 최소값만 지켜서 아이콘이 찌그러지지 않게 한다.
export const UNIT_SIZE_DEFAULT = { width: 44, height: 48 }
export const UNIT_SIZE_MIN = { width: 20, height: 20 }
// 슬라이더에서 손쉽게 다룰 수 있는 범위. 이보다 큰 값은 숫자 입력으로 직접 지정한다.
export const UNIT_SIZE_SLIDER_MAX = { width: 220, height: 240 }

// 자주 쓰는 크기/모양 프리셋 (낮고 넓은 서랍장, 높고 좁은 장롱 등)
export const UNIT_SHAPE_PRESETS: { id: string; label: string; width: number; height: number }[] = [
  { id: 'low-wide', label: '낮고 넓게', width: 92, height: 34 },
  { id: 'default', label: '기본 비율', width: 44, height: 48 },
  { id: 'tall-narrow', label: '높고 좁게', width: 34, height: 96 },
  { id: 'large', label: '크게', width: 140, height: 150 },
]

// 세로 층(선반)과 가로 칸 수의 편집 범위
export const UNIT_GRID_MIN = 1
export const UNIT_GRID_MAX = 10
export const UNIT_GRID_DEFAULT = { rows: 1, cols: 1 }

// 방 안에 배치된 하나의 수납가구
export interface StorageUnit {
  id: string
  type: StorageType
  name: string
  // 방(캔버스) 내부 상대 좌표 (0~100 %)
  x: number
  y: number
  // 등각 아이콘의 표시 크기(px) - 사용자가 자유롭게 편집 가능, 최대 제한 없음
  width: number
  height: number
  // 세로 층(선반) 수와 가로 칸 수 - 아이콘에 구분선으로 표시된다
  rows: number
  cols: number
  designId?: string // kitchenCabinet 인 경우 CabinetDesign 참조
  // wardrobe 전용: 여닫이문 옷장인지 서랍장 형태인지
  wardrobeStyle?: 'door' | 'drawer'
  baskets: Basket[]
  // 특정 칸을 내부적으로 더 잘게 나눈 정보들
  cellSplits: CellSplit[]
}

export const WARDROBE_STYLE_LABEL: Record<'door' | 'drawer', string> = {
  door: '여닫이문',
  drawer: '서랍형',
}

// 도면 위에 그려진 방 영역
export interface Room {
  id: string
  name: string
  kind: RoomKind
  // 도면 이미지 위 상대 좌표 (0~100 %)
  x: number
  y: number
  width: number
  height: number
  storageUnits: StorageUnit[]
}

export interface House {
  floorPlanImage: string | null
  rooms: Room[]
}

export interface SearchResult {
  item: Item
  basket: Basket
  storageUnit: StorageUnit
  room: Room
}
