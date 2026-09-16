import { loadImage } from './loadImage'

// 휴대폰 카메라로 찍은 사진은 용량이 커서(수 MB) 그대로 저장하면 로컬 저장 공간과
// 다른 기기와의 동기화 용량을 금방 채운다. 원래 색은 그대로 두고 크기와 용량만 줄인다.
export async function compressPhoto(file: File, maxDimension = 1600, quality = 0.82): Promise<string> {
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

    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
