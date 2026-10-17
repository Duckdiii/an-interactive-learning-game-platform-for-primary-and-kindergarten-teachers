import { svg, svgDataUri } from './svgUri'

/** Ô nền lặp (200×200): bong bóng và vài nét sóng nhạt, trong suốt. Vị trí cố định. */
const BUBBLES: readonly [x: number, y: number, r: number][] = [
  [24, 30, 8],
  [62, 82, 5],
  [104, 24, 6],
  [150, 66, 9],
  [180, 22, 4],
  [34, 134, 6],
  [86, 160, 9],
  [128, 122, 5],
  [170, 160, 7],
  [194, 108, 4],
]

export function oceanBackdropSvg(): string {
  const bubbles = BUBBLES.map(
    ([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" fill-opacity="0.35" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="1.5"/>` +
      `<circle cx="${x - r / 3}" cy="${y - r / 3}" r="${Math.max(1, r / 4)}" fill="#FFFFFF" opacity="0.9"/>`,
  ).join('')
  const waves =
    '<path d="M0 60 Q25 48 50 60 T100 60 T150 60 T200 60" fill="none" stroke="#0EA5E9" stroke-opacity="0.18" stroke-width="3"/>' +
    '<path d="M0 148 Q25 136 50 148 T100 148 T150 148 T200 148" fill="none" stroke="#0EA5E9" stroke-opacity="0.18" stroke-width="3"/>'
  return svg(200, 200, waves + bubbles)
}

/** Con cá thân thiện (160×100): thân cam vàng, đuôi, mắt, vảy (không có răng hay vẻ dữ). */
export function fishSvg(): string {
  return svg(
    160,
    100,
    '<path d="M112 50 L152 18 L152 82Z" fill="#F59E0B"/>' +
      '<ellipse cx="68" cy="50" rx="56" ry="36" fill="#FBBF24" stroke="#B45309" stroke-width="3"/>' +
      '<path d="M44 18 Q68 4 92 20 Q68 28 44 18Z" fill="#F59E0B"/>' +
      '<circle cx="40" cy="42" r="8" fill="#FFFFFF" stroke="#78350F" stroke-width="2"/>' +
      '<circle cx="38" cy="42" r="3.5" fill="#1F2937"/>' +
      '<path d="M26 62 Q38 70 50 62" fill="none" stroke="#B45309" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M72 34 Q82 50 72 66 M90 34 Q100 50 90 66" fill="none" stroke="#B45309" stroke-opacity="0.5" stroke-width="2.5" stroke-linecap="round"/>',
  )
}

/** Dải sóng (400×60) dùng làm đường viền. */
export function waveSvg(): string {
  return svg(
    400,
    60,
    '<path d="M0 30 Q25 6 50 30 T100 30 T150 30 T200 30 T250 30 T300 30 T350 30 T400 30 L400 60 L0 60Z" fill="#38BDF8" fill-opacity="0.55"/>' +
      '<path d="M0 40 Q25 20 50 40 T100 40 T150 40 T200 40 T250 40 T300 40 T350 40 T400 40 L400 60 L0 60Z" fill="#0EA5E9" fill-opacity="0.6"/>',
  )
}

export const oceanBackdropUri = () => svgDataUri(oceanBackdropSvg())
export const fishUri = () => svgDataUri(fishSvg())
export const waveUri = () => svgDataUri(waveSvg())
