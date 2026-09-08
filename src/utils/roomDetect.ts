// 도면 사진에서 벽(어두운 선)으로 둘러싸인 열린 구역들을 찾아 방 후보 영역으로 만든다.
// 이미 다듬어진(듀오톤) 도면 이미지를 입력으로 받아, 외부 라이브러리 없이 캔버스 픽셀
// 처리만으로 동작한다. 문이 열려 있는 틈처럼 벽이 완전히 이어지지 않은 곳은 살짝
// 팽창(dilate)시켜 메꾸지만, 100% 정확하지는 않을 수 있어 결과는 사용자가 다듬는
// 출발점으로 취급한다.

import { loadImage } from './loadImage'

export interface DetectedRoom {
  x: number
  y: number
  width: number
  height: number
}

export async function detectRoomsFromFloorPlan(imageDataUrl: string): Promise<DetectedRoom[]> {
  const img = await loadImage(imageDataUrl)
  const maxDim = 700
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  if (width < 20 || height < 20) return []

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, width, height)

  const { data } = ctx.getImageData(0, 0, width, height)
  const pixelCount = width * height

  const gray = new Uint8ClampedArray(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
  }

  const threshold = otsuThreshold(gray, pixelCount)

  // wall[i] = 1 이면 벽(어두운 선), 0 이면 열린 공간
  const rawWall = new Uint8Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) rawWall[i] = gray[i] < threshold ? 1 : 0

  // 문이 열린 틈처럼 벽이 살짝 끊긴 곳을 메꾼다
  const dilateRadius = Math.max(4, Math.round(width / 90))
  const wall = dilate(rawWall, width, height, dilateRadius)

  // 연결된 열린 공간을 하나의 방 후보로 묶는다 (4방향, 스택 기반이라 재귀 깊이 문제가 없다)
  const regions: { area: number; minX: number; minY: number; maxX: number; maxY: number }[] = []
  const stack: number[] = []
  for (let start = 0; start < pixelCount; start++) {
    if (wall[start] === 1) continue
    let area = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    wall[start] = 1 // 방문 표시(재방문 방지)
    stack.push(start)
    while (stack.length > 0) {
      const idx = stack.pop()!
      const x = idx % width
      const y = (idx / width) | 0
      area++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0 && wall[idx - 1] === 0) {
        wall[idx - 1] = 1
        stack.push(idx - 1)
      }
      if (x < width - 1 && wall[idx + 1] === 0) {
        wall[idx + 1] = 1
        stack.push(idx + 1)
      }
      if (y > 0 && wall[idx - width] === 0) {
        wall[idx - width] = 1
        stack.push(idx - width)
      }
      if (y < height - 1 && wall[idx + width] === 0) {
        wall[idx + width] = 1
        stack.push(idx + width)
      }
    }
    regions.push({ area, minX, minY, maxX, maxY })
  }

  // 사진 속 건물 외곽 여백(도면 바깥의 흰 배경)이 사방으로 이어져 있으면 하나의
  // 거대한 "테두리" 영역으로 잡히는데, 이건 방이 아니므로 걸러낸다.
  const edgeMargin = 2
  const spansWholeImage = (r: (typeof regions)[number]) =>
    r.minX <= edgeMargin && r.minY <= edgeMargin && r.maxX >= width - 1 - edgeMargin && r.maxY >= height - 1 - edgeMargin
  const realRegions = regions.filter((r) => !spansWholeImage(r))

  const totalOpen = realRegions.reduce((s, r) => s + r.area, 0)
  if (totalOpen === 0 || realRegions.length === 0) return []

  // 가장 큰 조각이 열린 면적의 절반을 넘으면, 문 틈 등으로 방들이 다 이어져버려
  // 제대로 나뉘지 않은 것으로 보고 자동 인식을 포기한다 (사용자가 직접 그리도록)
  const biggestArea = Math.max(...realRegions.map((r) => r.area))
  if (biggestArea / totalOpen > 0.55) return []

  const minArea = pixelCount * 0.012
  const accepted = realRegions
    .filter((r) => r.area >= minArea)
    .sort((a, b) => b.area - a.area)
    .slice(0, 20)
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX)

  const inset = 1.2
  return accepted.map((r) => {
    const x = (r.minX / width) * 100
    const y = (r.minY / height) * 100
    const w = ((r.maxX - r.minX + 1) / width) * 100
    const h = ((r.maxY - r.minY + 1) / height) * 100
    return {
      x: Math.min(97, x + inset),
      y: Math.min(97, y + inset),
      width: Math.max(3, w - inset * 2),
      height: Math.max(3, h - inset * 2),
    }
  })
}

// Otsu 방법으로 명/암 두 그룹을 가장 잘 나누는 임계값을 찾는다
function otsuThreshold(gray: Uint8ClampedArray, count: number): number {
  const hist = new Uint32Array(256)
  for (let i = 0; i < count; i++) hist[gray[i]]++

  let sumAll = 0
  for (let t = 0; t < 256; t++) sumAll += t * hist[t]

  let sumB = 0
  let weightB = 0
  let maxVariance = 0
  let threshold = 127

  for (let t = 0; t < 256; t++) {
    weightB += hist[t]
    if (weightB === 0) continue
    const weightF = count - weightB
    if (weightF === 0) break
    sumB += t * hist[t]
    const meanB = sumB / weightB
    const meanF = (sumAll - sumB) / weightF
    const variance = weightB * weightF * (meanB - meanF) * (meanB - meanF)
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

// 정사각형 구조 요소를 이용한 형태학적 팽창 (가로/세로로 나눠 처리해 빠르다)
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const temp = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      const xs = Math.max(0, x - radius)
      const xe = Math.min(width - 1, x + radius)
      let v = 0
      for (let xx = xs; xx <= xe; xx++) {
        if (mask[rowOffset + xx] === 1) {
          v = 1
          break
        }
      }
      temp[rowOffset + x] = v
    }
  }
  const out = new Uint8Array(width * height)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const ys = Math.max(0, y - radius)
      const ye = Math.min(height - 1, y + radius)
      let v = 0
      for (let yy = ys; yy <= ye; yy++) {
        if (temp[yy * width + x] === 1) {
          v = 1
          break
        }
      }
      out[y * width + x] = v
    }
  }
  return out
}
