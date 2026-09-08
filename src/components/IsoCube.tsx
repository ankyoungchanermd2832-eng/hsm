import { shadeColor } from '../utils/color'
import './IsoCube.css'

interface IsoCubeProps {
  color: string
  icon: string
  width?: number
  height?: number
  hasTopBox?: boolean // 상부장(윗칸) 표시 여부 - 싱크대용
  rows?: number // 세로 층(선반) 수
  cols?: number // 가로 칸 수
}

// 선반 층 / 칸 구분선을 앞면에 그리는 반복 그라데이션을 만든다.
function dividerLines(rows: number, cols: number): string | undefined {
  const layers: string[] = []
  if (rows > 1) {
    const step = 100 / rows
    layers.push(
      `repeating-linear-gradient(to bottom, transparent 0, transparent calc(${step}% - 1px), rgba(0,0,0,0.32) calc(${step}% - 1px), rgba(0,0,0,0.32) ${step}%)`,
    )
  }
  if (cols > 1) {
    const step = 100 / cols
    layers.push(
      `repeating-linear-gradient(to right, transparent 0, transparent calc(${step}% - 1px), rgba(0,0,0,0.32) calc(${step}% - 1px), rgba(0,0,0,0.32) ${step}%)`,
    )
  }
  return layers.length > 0 ? layers.join(', ') : undefined
}

// 순수 CSS skew 기법으로 그린 등각(isometric) 큐브. 가구/수납장을 입체감 있게 표현한다.
export function IsoCube({
  color,
  icon,
  width = 46,
  height = 50,
  hasTopBox = false,
  rows = 1,
  cols = 1,
}: IsoCubeProps) {
  const front = color
  const top = shadeColor(color, 22)
  const side = shadeColor(color, -18)
  const iconSize = Math.max(0.9, Math.min(2.6, Math.min(width, height) / 38))

  return (
    <div className="iso-cube-wrap" style={{ width, height: height + (hasTopBox ? 22 : 0) }}>
      {hasTopBox && (
        <div
          className="iso-cube iso-cube-upper"
          style={
            {
              width,
              height: Math.max(14, height * 0.22),
              '--front': shadeColor(color, 10),
              '--top': shadeColor(color, 30),
              '--side': shadeColor(color, -10),
            } as React.CSSProperties
          }
        />
      )}
      <div
        className="iso-cube"
        style={
          {
            width,
            height,
            '--front': front,
            '--top': top,
            '--side': side,
            '--divider': dividerLines(rows, cols) ?? 'none',
          } as React.CSSProperties
        }
      >
        <span className="iso-cube-icon" style={{ fontSize: `${iconSize}rem` }}>
          {icon}
        </span>
      </div>
    </div>
  )
}
