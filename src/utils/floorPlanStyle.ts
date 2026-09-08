// 업로드한 도면 사진을 원래 모양(벽 구조)은 그대로 유지한 채,
// 잡음을 지우고 2색조(듀오톤) 청사진 느낌으로 다듬어서 더 깔끔하고 감각적으로 보이게 한다.
// 외부 라이브러리 없이 캔버스 픽셀 처리만으로 동작한다.

import { loadImage } from './loadImage'

interface StylizeOptions {
  maxDimension?: number
  lightColor?: [number, number, number]
  darkColor?: [number, number, number]
}

const DEFAULT_LIGHT: [number, number, number] = [244, 239, 229] // 따뜻한 크림색 (벽 안쪽 공간)
const DEFAULT_DARK: [number, number, number] = [45, 38, 30] // 진한 잉크색 (벽/구조선)

export async function stylizeFloorPlanImage(file: File, options: StylizeOptions = {}): Promise<string> {
  const { maxDimension = 1400, lightColor = DEFAULT_LIGHT, darkColor = DEFAULT_DARK } = options

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

    const imageData = ctx.getImageData(0, 0, width, height)
    const { data } = imageData
    const pixelCount = width * height

    const gray = new Float32Array(pixelCount)
    for (let i = 0; i < pixelCount; i++) {
      const o = i * 4
      gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
    }

    const blurred = boxBlur3x3(gray, width, height)

    const [lo, hi] = contrastPercentiles(blurred, pixelCount, 0.02, 0.98)
    const range = Math.max(1, hi - lo)

    for (let i = 0; i < pixelCount; i++) {
      let t = (blurred[i] - lo) / range
      t = Math.max(0, Math.min(1, t))
      t = Math.pow(t, 0.85) // 중간톤을 배경 쪽으로 살짝 밀어 더 정갈하게 보이도록
      const o = i * 4
      data[o] = darkColor[0] + (lightColor[0] - darkColor[0]) * t
      data[o + 1] = darkColor[1] + (lightColor[1] - darkColor[1]) * t
      data[o + 2] = darkColor[2] + (lightColor[2] - darkColor[2]) * t
      data[o + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// 사진 노이즈를 지우기 위한 가벼운 3x3 박스 블러 (한 번만 적용)
function boxBlur3x3(src: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(src.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        const rowOffset = ny * width
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          sum += src[rowOffset + nx]
          count++
        }
      }
      out[y * width + x] = sum / count
    }
  }
  return out
}

// 히스토그램 기반 퍼센타일 계산 (정렬보다 훨씬 빠르다)
function contrastPercentiles(values: Float32Array, count: number, loP: number, hiP: number): [number, number] {
  const bins = new Uint32Array(256)
  for (let i = 0; i < count; i++) {
    const v = Math.max(0, Math.min(255, Math.round(values[i])))
    bins[v]++
  }
  const loTarget = count * loP
  const hiTarget = count * hiP
  let cum = 0
  let lo = 0
  let hi = 255
  for (let v = 0; v < 256; v++) {
    cum += bins[v]
    if (cum >= loTarget) {
      lo = v
      break
    }
  }
  cum = 0
  for (let v = 0; v < 256; v++) {
    cum += bins[v]
    if (cum >= hiTarget) {
      hi = v
      break
    }
  }
  return [lo, Math.max(hi, lo + 1)]
}
