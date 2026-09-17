// 업로드한 도면 사진을 색은 원본 그대로 유지한 채, 너무 큰 사진이면 적당한 크기로만
// 줄여서 저장한다 (성능/용량을 위해서일 뿐, 색이나 형태는 건드리지 않는다).

import { loadImage } from './loadImage'

interface ResizeOptions {
  maxDimension?: number
}

export async function prepareFloorPlanImage(file: File, options: ResizeOptions = {}): Promise<string> {
  const { maxDimension = 1800 } = options

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context를 사용할 수 없어요')
    ctx.drawImage(img, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', 0.9)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
