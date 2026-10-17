import { svg, svgDataUri } from './svgUri'

/** Ô nền lặp (200×200): sao nhỏ và vài tia lấp lánh, trong suốt (màu nền đặc vẽ bên dưới). Vị trí cố định, không ngẫu nhiên. */
const STARS: readonly [x: number, y: number, r: number, opacity: number][] = [
  [14, 22, 1.6, 0.9],
  [48, 70, 1.1, 0.6],
  [90, 18, 2, 0.8],
  [132, 54, 1.2, 0.7],
  [176, 28, 1.5, 0.85],
  [30, 128, 1.3, 0.65],
  [72, 168, 1.8, 0.9],
  [112, 118, 1, 0.55],
  [150, 150, 1.6, 0.8],
  [186, 104, 1.1, 0.6],
  [58, 104, 0.9, 0.5],
  [168, 186, 1.2, 0.7],
]

const SPARKLES: readonly [x: number, y: number][] = [
  [40, 40],
  [150, 90],
  [100, 160],
]

const sparkle = (x: number, y: number) =>
  `<path d="M${x} ${y - 6}L${x + 1.5} ${y - 1.5}L${x + 6} ${y}L${x + 1.5} ${y + 1.5}L${x} ${y + 6}L${x - 1.5} ${y + 1.5}L${x - 6} ${y}L${x - 1.5} ${y - 1.5}Z" fill="#FDE68A" opacity="0.45"/>`

export function spaceBackdropSvg(): string {
  const stars = STARS.map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#E0E7FF" opacity="${o}"/>`).join('')
  return svg(200, 200, stars + SPARKLES.map(([x, y]) => sparkle(x, y)).join(''))
}

/** Hành tinh có vành đai (120×120). */
export function planetSvg(): string {
  return svg(
    120,
    120,
    '<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#6D28D9"/></linearGradient></defs>' +
      '<ellipse cx="60" cy="62" rx="54" ry="14" fill="none" stroke="#FBBF24" stroke-width="6" opacity="0.9" transform="rotate(-18 60 62)"/>' +
      '<circle cx="60" cy="60" r="34" fill="url(#p)"/>' +
      '<circle cx="48" cy="50" r="6" fill="#DDD6FE" opacity="0.55"/>' +
      '<circle cx="72" cy="70" r="4" fill="#DDD6FE" opacity="0.4"/>' +
      '<ellipse cx="60" cy="62" rx="54" ry="14" fill="none" stroke="#F59E0B" stroke-width="6" stroke-dasharray="0 140 120 400" transform="rotate(-18 60 62)"/>',
  )
}

/** Tên lửa thân thiện (100×150): thân bo tròn, cửa sổ, hai cánh, ngọn lửa cam (không đỏ). */
export function rocketSvg(): string {
  return svg(
    100,
    150,
    '<path d="M50 6 C74 28 80 62 76 100 L24 100 C20 62 26 28 50 6Z" fill="#F1F5F9" stroke="#94A3B8" stroke-width="3"/>' +
      '<circle cx="50" cy="52" r="12" fill="#38BDF8" stroke="#0369A1" stroke-width="3"/>' +
      '<path d="M24 78 L6 112 L26 104Z" fill="#7C3AED"/>' +
      '<path d="M76 78 L94 112 L74 104Z" fill="#7C3AED"/>' +
      '<path d="M36 100 L50 142 L64 100Z" fill="#FBBF24"/>' +
      '<path d="M42 100 L50 126 L58 100Z" fill="#FDE68A"/>',
  )
}

export const spaceBackdropUri = () => svgDataUri(spaceBackdropSvg())
export const planetUri = () => svgDataUri(planetSvg())
export const rocketUri = () => svgDataUri(rocketSvg())
