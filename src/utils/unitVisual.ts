import { getCabinetDesign } from '../cabinetDesigns'
import { STORAGE_TYPE_COLOR, STORAGE_TYPE_ICON, type StorageUnit } from '../types'

// 수납가구 종류(및 싱크대 디자인/장롱 서랍형 여부)에 따른 실제 표시 아이콘·색상을 계산한다.
export function getUnitVisual(unit: StorageUnit): { icon: string; color: string; hasTopBox: boolean } {
  if (unit.type === 'kitchenCabinet') {
    const design = getCabinetDesign(unit.designId)
    return { icon: '🍽️', color: design.doorColor, hasTopBox: design.hasUpper }
  }
  if (unit.type === 'wardrobe' && unit.wardrobeStyle === 'drawer') {
    return { icon: STORAGE_TYPE_ICON.drawer, color: STORAGE_TYPE_COLOR.drawer, hasTopBox: false }
  }
  return { icon: STORAGE_TYPE_ICON[unit.type], color: STORAGE_TYPE_COLOR[unit.type], hasTopBox: false }
}
