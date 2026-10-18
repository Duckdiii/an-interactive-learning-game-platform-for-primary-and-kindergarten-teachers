import { parseHex, isHarshRed } from '../../theme/contrast'
import type { ThemeColors } from '../../theme/themeTypes'
import { MAX_EFFECT_SECONDS, MAX_FLASHES_PER_SECOND, MAX_OFFSET_PX, MAX_SCALE, MIN_SCALE } from '../../feedback/feedbackEffects'

/**
 * Hoạt ảnh Lottie TỰ SINH bằng code (không tải tệp ngoài): sao nảy cho «đúng», gương mặt gật đầu nhẹ cho «thử lại».
 * Màu lấy từ theme (không viết cứng), và `validateLottie` kiểm các giới hạn an toàn dùng chung với hiệu ứng Konva
 * (thời lượng, độ nảy, biên độ rung, số lần chớp, không đỏ gắt). Chỉ là JSON thuần nên test được trong jsdom.
 */
export type LottieKind = 'correct' | 'tryAgain'
export const LOTTIE_KINDS: readonly LottieKind[] = ['correct', 'tryAgain']

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type LottieAnimation = { [key: string]: Json }

export const LOTTIE_FRAME_RATE = 60
export const LOTTIE_SIZE = 200
/** Giới hạn nhẹ nhàng riêng của hoạt ảnh Lottie (đề xuất của thử nghiệm, chưa được chuyên gia xác nhận). */
export const MAX_ROTATION_DEG = 15
export const MAX_LAYERS = 8
export const MAX_LOTTIE_SIZE = 400

// ---------------------------------------------------------------------------------------------- dựng JSON
const rgba = (hex: string): number[] => {
  const rgb = parseHex(hex)
  if (!rgb) throw new Error(`Màu không hợp lệ: ${hex}`)
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1]
}

const still = (k: Json): Json => ({ a: 0, k })

/** Thuộc tính có khung hình khóa: mỗi phần tử [khung, giá trị]; nội suy mượt (bezier) giữa các khung. */
function animated(frames: Array<[number, number[]]>): Json {
  const width = frames[0][1].length
  const handle = (x: number, y: number) => ({ x: Array(width).fill(x), y: Array(width).fill(y) })
  return {
    a: 1,
    k: frames.map(([t, s], i): Json => (i === frames.length - 1 ? { t, s } : { t, s, i: handle(0.3, 1), o: handle(0.7, 0) })),
  }
}

const transform = (overrides: Record<string, Json> = {}): Json => ({
  ty: 'tr',
  p: still([0, 0]),
  a: still([0, 0]),
  s: still([100, 100]),
  r: still(0),
  o: still(100),
  sk: still(0),
  sa: still(0),
  ...overrides,
})

const fill = (hex: string): Json => ({ ty: 'fl', nm: 'Fill', c: still(rgba(hex)), o: still(100), r: 1 })
const stroke = (hex: string, width: number): Json => ({ ty: 'st', nm: 'Stroke', c: still(rgba(hex)), o: still(100), w: still(width), lc: 2, lj: 2 })
const group = (name: string, items: Json[]): Json => ({ ty: 'gr', nm: name, it: [...items, transform()] })

function layer(index: number, name: string, ks: Record<string, Json>, shapes: Json[], op: number): Json {
  return {
    ddd: 0,
    ind: index,
    ty: 4,
    nm: name,
    sr: 1,
    ks: { o: still(100), r: still(0), p: still([LOTTIE_SIZE / 2, LOTTIE_SIZE / 2, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]), ...ks },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  }
}

const wrap = (name: string, op: number, layers: Json[]): LottieAnimation => ({
  v: '5.7.0',
  fr: LOTTIE_FRAME_RATE,
  ip: 0,
  op,
  w: LOTTIE_SIZE,
  h: LOTTIE_SIZE,
  nm: name,
  ddd: 0,
  assets: [],
  layers,
})

/** Sao nảy: hiện ra, nảy quá 115% một chút rồi ổn định ở 100%, lắc nhẹ; ba chấm nhỏ hiện dần quanh sao. Dài 1,2 giây. */
export function buildStarBounce(colors: ThemeColors): LottieAnimation {
  const op = 72
  const star = group('Star', [
    { ty: 'sr', nm: 'Star', sy: 1, d: 1, pt: still(5), p: still([0, 0]), r: still(0), ir: still(26), is: still(0), or: still(60), os: still(0) },
    stroke(colors.lineCorrect, 6),
    fill(colors.surfaceCorrect),
  ])
  const dots = [
    [34, 46],
    [168, 52],
    [158, 164],
  ].map(([x, y], i) =>
    layer(
      i + 2,
      `Dot ${i + 1}`,
      { p: still([x, y, 0]), s: animated([[10 + i * 6, [0, 0, 100]], [30 + i * 6, [100, 100, 100]]]) },
      [group('Dot', [{ ty: 'el', nm: 'Dot', d: 1, p: still([0, 0]), s: still([16, 16]) }, fill(colors.lineCorrect)])],
      op,
    ),
  )
  return wrap('star-bounce', op, [
    layer(
      1,
      'Star',
      {
        s: animated([[0, [0, 0, 100]], [18, [115, 115, 100]], [30, [95, 95, 100]], [42, [105, 105, 100]], [54, [100, 100, 100]]]),
        r: animated([[0, [0]], [18, [-8]], [36, [8]], [54, [0]]]),
      },
      [star],
      op,
    ),
    ...dots,
  ])
}

/** Gương mặt gật đầu nhẹ (lên xuống tối đa 6 và nghiêng tối đa 10 độ), màu dịu, không đỏ. Dài 1,5 giây. */
export function buildGentleNod(colors: ThemeColors): LottieAnimation {
  const op = 90
  const face = group('Face', [
    { ty: 'el', nm: 'Head', d: 1, p: still([0, 0]), s: still([120, 120]) },
    stroke(colors.lineTryAgain, 6),
    fill(colors.surfaceTryAgain),
  ])
  const eyes = group('Eyes', [
    { ty: 'el', nm: 'Eye left', d: 1, p: still([-22, -10]), s: still([12, 12]) },
    { ty: 'el', nm: 'Eye right', d: 1, p: still([22, -10]), s: still([12, 12]) },
    fill(colors.text),
  ])
  const mouth = group('Smile', [
    {
      ty: 'sh',
      nm: 'Smile',
      ks: still({ c: false, v: [[-26, 16], [0, 34], [26, 16]], i: [[0, 0], [-14, 0], [-10, 12]], o: [[10, 12], [14, 0], [0, 0]] }),
    },
    stroke(colors.text, 5),
  ])
  const cx = LOTTIE_SIZE / 2
  return wrap('gentle-nod', op, [
    layer(
      1,
      'Face',
      {
        p: animated([[0, [cx, cx, 0]], [20, [cx, cx + MAX_OFFSET_PX, 0]], [40, [cx, cx, 0]], [60, [cx, cx + 4, 0]], [80, [cx, cx, 0]]]),
        r: animated([[0, [0]], [20, [10]], [40, [-6]], [60, [6]], [80, [0]]]),
      },
      [face, eyes, mouth],
      op,
    ),
  ])
}

export function buildLottie(kind: LottieKind, colors: ThemeColors): LottieAnimation {
  return kind === 'correct' ? buildStarBounce(colors) : buildGentleNod(colors)
}

/** Khung cuối (hết hoạt ảnh): dùng làm hình tĩnh khi người dùng bật «giảm chuyển động». */
export function finalFrame(animation: LottieAnimation): number {
  const op = animation.op
  return typeof op === 'number' ? Math.max(0, op - 1) : 0
}

// ---------------------------------------------------------------------------------------------- đọc thuộc tính
type Frames = Array<{ t: number; value: number[] }>

/** Các khung hình khóa của một thuộc tính Lottie; thuộc tính đứng yên thì một khung tại 0. */
export function framesOf(property: unknown): Frames {
  if (!property || typeof property !== 'object') return []
  const prop = property as { a?: number; k?: unknown }
  if (prop.a !== 1 || !Array.isArray(prop.k)) {
    const k = prop.k
    return Array.isArray(k) ? [{ t: 0, value: k.filter((n): n is number => typeof n === 'number') }] : typeof k === 'number' ? [{ t: 0, value: [k] }] : []
  }
  return (prop.k as Array<{ t?: number; s?: number[] }>)
    .filter((kf) => typeof kf.t === 'number' && Array.isArray(kf.s))
    .map((kf) => ({ t: kf.t as number, value: kf.s as number[] }))
}

/** Giá trị tại một khung hình (nội suy tuyến tính, bỏ qua làm mượt); ngoài khoảng thì kẹp ở hai đầu. */
export function sampleProperty(property: unknown, frame: number): number[] | null {
  const frames = framesOf(property)
  if (frames.length === 0) return null
  if (frame <= frames[0].t) return frames[0].value
  const last = frames[frames.length - 1]
  if (frame >= last.t) return last.value
  const next = frames.findIndex((f) => f.t >= frame)
  const a = frames[next - 1]
  const b = frames[next]
  const k = (frame - a.t) / (b.t - a.t)
  return a.value.map((v, i) => v + ((b.value[i] ?? v) - v) * k)
}

// ---------------------------------------------------------------------------------------------- kiểm tra an toàn
export type LottieIssueCode =
  | 'NOT_OBJECT'
  | 'BAD_SIZE'
  | 'BAD_FRAME_RATE'
  | 'DURATION_INVALID'
  | 'DURATION_TOO_LONG'
  | 'NO_LAYERS'
  | 'TOO_MANY_LAYERS'
  | 'HARSH_RED'
  | 'SCALE_TOO_LARGE'
  | 'SCALE_BOUNCE_TOO_DEEP'
  | 'OFFSET_TOO_LARGE'
  | 'ROTATION_TOO_LARGE'
  | 'FLASHING'
  | 'UNSUPPORTED_FEATURE'
  | 'KEYFRAME_INVALID'

export interface LottieIssue {
  code: LottieIssueCode
  message: string
}

const toHex = (c: number[]): string => '#' + [0, 1, 2].map((i) => Math.round(Math.min(1, Math.max(0, c[i] ?? 0)) * 255).toString(16).padStart(2, '0')).join('')

/** Mọi màu tô/viền (`fl`, `st`) trong cây, dạng `#RRGGBB`. */
export function colorsIn(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((child) => colorsIn(child, found))
  else if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c) {
      for (const frame of framesOf(obj.c)) found.push(toHex(frame.value))
    }
    Object.values(obj).forEach((child) => colorsIn(child, found))
  }
  return found
}

/** Khung hình khóa của một thuộc tính hợp lệ không: `t` hữu hạn và tăng dần, giá trị là số hữu hạn. */
export function keyframesValid(property: unknown): boolean {
  if (!property || typeof property !== 'object') return true
  const prop = property as { a?: number; k?: unknown }
  if (prop.a !== 1) return !Array.isArray(prop.k) || prop.k.every((n) => typeof n === 'number' && Number.isFinite(n)) || prop.k.every((n) => typeof n !== 'number')
  if (!Array.isArray(prop.k)) return false
  let previous = -Infinity
  for (const kf of prop.k as Array<{ t?: unknown; s?: unknown }>) {
    if (typeof kf.t !== 'number' || !Number.isFinite(kf.t) || kf.t <= previous) return false
    if (!Array.isArray(kf.s) || kf.s.length === 0 || !kf.s.every((n) => typeof n === 'number' && Number.isFinite(n))) return false
    previous = kf.t
  }
  return true
}

/** Tính năng Lottie mà cổng kiểm này KHÔNG kiểm được: biểu thức, tài nguyên ngoài/precomp, lớp không phải hình, màu chuyển sắc. */
export function unsupportedFeatures(animation: Record<string, unknown>): string[] {
  const found = new Set<string>()
  if (Array.isArray(animation.assets) && animation.assets.length > 0) found.add('tài nguyên (assets): ảnh ngoài hoặc precomp')
  for (const l of Array.isArray(animation.layers) ? (animation.layers as Array<Record<string, unknown>>) : []) {
    if (l.ty !== 4) found.add(`lớp loại ${String(l.ty)} (chỉ chấp nhận lớp hình, ty = 4)`)
    if (l.parent !== undefined) found.add('lớp cha (parent)')
  }
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>
      if (typeof obj.x === 'string') found.add('biểu thức (expression)')
      if (obj.ty === 'gf' || obj.ty === 'gs') found.add('màu chuyển sắc (gradient)')
      Object.values(obj).forEach(walk)
    }
  }
  walk(animation.layers)
  return [...found]
}

/** Số lần chớp (đảo chiều độ mờ ≥ 10 điểm phần trăm) nhiều nhất trong một cửa sổ 1 giây. */
export function maxFlashesPerSecond(opacityFrames: Frames, fr: number): number {
  const reversals: number[] = []
  let direction = 0
  for (let i = 1; i < opacityFrames.length; i += 1) {
    const delta = (opacityFrames[i].value[0] ?? 0) - (opacityFrames[i - 1].value[0] ?? 0)
    if (Math.abs(delta) < 10) continue
    const sign = Math.sign(delta)
    if (direction !== 0 && sign !== direction) reversals.push(opacityFrames[i - 1].t)
    direction = sign
  }
  let best = 0
  for (const start of reversals) best = Math.max(best, reversals.filter((t) => t >= start && t < start + fr).length)
  return best
}

/** Kiểm một hoạt ảnh Lottie theo giới hạn an toàn; rỗng nếu đạt. Hàm thuần, chấp nhận mọi đầu vào. */
export function validateLottie(animation: unknown): LottieIssue[] {
  const issues: LottieIssue[] = []
  const add = (code: LottieIssueCode, message: string) => issues.push({ code, message })
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) return [{ code: 'NOT_OBJECT', message: 'Hoạt ảnh phải là một đối tượng JSON.' }]
  const a = animation as Record<string, unknown>

  const { w, h, fr, ip, op } = a
  if (![w, h].every((n) => typeof n === 'number' && n > 0 && n <= MAX_LOTTIE_SIZE)) add('BAD_SIZE', `Khung hình phải rộng và cao trong (0, ${MAX_LOTTIE_SIZE}].`)
  if (typeof fr !== 'number' || fr < 24 || fr > 60) add('BAD_FRAME_RATE', 'Tốc độ khung hình phải từ 24 đến 60.')
  const frames = typeof ip === 'number' && typeof op === 'number' ? op - ip : NaN
  if (!(frames > 0) || typeof fr !== 'number' || !(fr > 0)) add('DURATION_INVALID', 'Thời lượng không hợp lệ (cần ip < op và fr > 0).')
  else if (frames / fr > MAX_EFFECT_SECONDS) add('DURATION_TOO_LONG', `Dài hơn ${MAX_EFFECT_SECONDS} giây.`)

  const layers = Array.isArray(a.layers) ? (a.layers as Array<Record<string, unknown>>) : []
  if (layers.length === 0) add('NO_LAYERS', 'Không có lớp nào.')
  if (layers.length > MAX_LAYERS) add('TOO_MANY_LAYERS', `Hơn ${MAX_LAYERS} lớp.`)

  for (const feature of unsupportedFeatures(a)) add('UNSUPPORTED_FEATURE', `Chưa kiểm được: ${feature}.`)
  if (colorsIn(a.layers).some((hex) => isHarshRed(hex))) add('HARSH_RED', 'Có màu đỏ gắt (quy ước UX: phản hồi sai không dùng màu đỏ gắt).')

  const rate = typeof fr === 'number' ? fr : 60
  for (const l of layers) {
    const ks = (l.ks ?? {}) as Record<string, unknown>
    if (!['o', 'r', 'p', 's'].every((key) => keyframesValid(ks[key]))) add('KEYFRAME_INVALID', 'Khung hình khóa không hợp lệ (thời điểm không tăng dần hoặc giá trị không phải số hữu hạn).')
    // Độ nảy: không phóng quá MAX_SCALE; sau đỉnh không co dưới MIN_SCALE (nảy nhẹ, không giật).
    const scaleFrames = framesOf(ks.s)
    const peakIndex = scaleFrames.reduce((best, f, i, all) => (f.value[0] > all[best].value[0] ? i : best), 0)
    if (scaleFrames.some((f) => f.value[0] > MAX_SCALE * 100 + 1e-9)) add('SCALE_TOO_LARGE', `Phóng quá ${MAX_SCALE * 100}%.`)
    if (scaleFrames.slice(peakIndex + 1).some((f) => f.value[0] < MIN_SCALE * 100 - 1e-9)) add('SCALE_BOUNCE_TOO_DEEP', `Co dưới ${MIN_SCALE * 100}% sau đỉnh nảy.`)
    // Rung/gật: biên độ vị trí so với khung đầu và độ nghiêng.
    const positions = framesOf(ks.p)
    if (positions.length > 1 && positions.some((f) => Math.hypot(...f.value.slice(0, 2).map((v, i) => v - positions[0].value[i])) > MAX_OFFSET_PX + 1e-9)) {
      add('OFFSET_TOO_LARGE', `Dịch chuyển vượt ${MAX_OFFSET_PX}px.`)
    }
    if (framesOf(ks.r).some((f) => Math.abs(f.value[0]) > MAX_ROTATION_DEG + 1e-9)) add('ROTATION_TOO_LARGE', `Nghiêng quá ${MAX_ROTATION_DEG} độ.`)
    if (maxFlashesPerSecond(framesOf(ks.o), rate) > MAX_FLASHES_PER_SECOND) add('FLASHING', `Chớp quá ${MAX_FLASHES_PER_SECOND} lần mỗi giây.`)
  }
  return issues
}
