import { loadImage } from './loadImage'

// 요즘 휴대폰 카메라는 원본 해상도가 매우 커서(2000만 화소 이상인 경우도 흔하다),
// 그걸 그대로 <img>/canvas로 디코딩하면 메모리를 너무 많이 써서 휴대폰 브라우저가
// 멈추거나 탭이 꺼질 수 있다. createImageBitmap에 resizeWidth를 줘서 브라우저가
// 처음부터 작게 디코딩하도록 해 메모리 사용량을 크게 줄인다 (전체 해상도를 한 번에
// 메모리에 올리지 않는다).
const SAFE_DECODE_WIDTH = 2000

// 휴대폰 카메라로 찍은 사진은 용량이 커서(수 MB) 그대로 저장하면 로컬 저장 공간과
// 다른 기기와의 동기화 용량을 금방 채운다. 원래 색은 그대로 두고 크기와 용량만 줄인다.
export async function compressPhoto(file: File, maxDimension = 1600, quality = 0.82): Promise<string> {
  let bitmap: ImageBitmap | null = null
  try {
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file, { resizeWidth: SAFE_DECODE_WIDTH, resizeQuality: 'medium' })
      } catch {
        bitmap = null // 지원하지 않는 브라우저는 아래 <img> 방식으로 대신 처리한다
      }
    }

    let sourceWidth: number
    let sourceHeight: number
    let drawSource: CanvasImageSource
    let objectUrl: string | null = null

    if (bitmap) {
      sourceWidth = bitmap.width
      sourceHeight = bitmap.height
      drawSource = bitmap
    } else {
      objectUrl = URL.createObjectURL(file)
      const img = await loadImage(objectUrl)
      sourceWidth = img.naturalWidth
      sourceHeight = img.naturalHeight
      drawSource = img
    }

    try {
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d context를 사용할 수 없어요')
      ctx.drawImage(drawSource, 0, 0, width, height)

      return canvas.toDataURL('image/jpeg', quality)
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  } finally {
    bitmap?.close()
  }
}
