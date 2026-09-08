// hex 색상을 밝게/어둡게 보정해 입체(등각) 큐브의 top/side 면 음영을 만든다.
export function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  let r = (num >> 16) + Math.round(255 * (percent / 100))
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100))
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100))
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
