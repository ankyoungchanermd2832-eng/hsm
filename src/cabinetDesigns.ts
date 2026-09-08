import type { CabinetDesign } from './types'

// 사용자가 고를 수 있는 싱크대(주방 수납장) 디자인 예시 모음
export const CABINET_DESIGNS: CabinetDesign[] = [
  {
    id: 'white-basic',
    name: '화이트 무광',
    doorColor: '#f5f4f0',
    frameColor: '#d8d5cd',
    handleColor: '#8a8a8a',
    hasUpper: true,
    countertopColor: '#e8e6e1',
  },
  {
    id: 'oak-wood',
    name: '오크 우드톤',
    doorColor: '#c9a06b',
    frameColor: '#a8794a',
    handleColor: '#4a3521',
    hasUpper: true,
    countertopColor: '#3c3c3c',
  },
  {
    id: 'gray-modern',
    name: '그레이 모던',
    doorColor: '#8b93a0',
    frameColor: '#5f6672',
    handleColor: '#2b2f36',
    hasUpper: true,
    countertopColor: '#1f1f1f',
  },
  {
    id: 'navy-point',
    name: '네이비 포인트',
    doorColor: '#2f4468',
    frameColor: '#1c2b45',
    handleColor: '#d4b483',
    hasUpper: false,
    countertopColor: '#e8e6e1',
  },
  {
    id: 'mint-pastel',
    name: '민트 파스텔',
    doorColor: '#a9d6cf',
    frameColor: '#7fb3aa',
    handleColor: '#3f6b63',
    hasUpper: true,
    countertopColor: '#f5f4f0',
  },
  {
    id: 'black-gold',
    name: '블랙 & 골드',
    doorColor: '#242424',
    frameColor: '#141414',
    handleColor: '#c9a24b',
    hasUpper: false,
    countertopColor: '#0f0f0f',
  },
]

export function getCabinetDesign(id: string | undefined): CabinetDesign {
  return CABINET_DESIGNS.find((d) => d.id === id) ?? CABINET_DESIGNS[0]
}
