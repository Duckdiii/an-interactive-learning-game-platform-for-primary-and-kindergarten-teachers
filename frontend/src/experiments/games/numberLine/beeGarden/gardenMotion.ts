import { panForX } from '../../../audio/ambience'
import { beamSweep, fireflyPose, pollenPose, starPose, type Band, type ParticlePose } from './atmosphere'
import { applyBeeMotion, BEE_NAMES } from './bee/beeMotion'
import type { BeeState } from './bee/beePoses'
import type { SparkleTrail } from './sparkleTrail'
import {
  beeBob,
  decorFade,
  parallaxOffset,
  PARALLAX_NAME,
  GARDEN_LEFT,
  GARDEN_RIGHT,
  CONFETTI_SECONDS,
  confettiPose,
  happyHop,
  happySpin,
  OOPS_SECONDS,
  oopsShake,
  pulse,
  sunGlowOpacity,
  sunGlowScale,
  type ConfettiParticle,
} from './beeGardenGeometry'

/**
 * Chuyển động nền của vườn (mây trôi, mặt trời quay, hoa đung đưa, cánh ong vỗ, ong nhấp nhô, ăn mừng/lắc đầu, sao rải) chạy THẲNG trên
 * node Konva mỗi khung hình (xem `useGardenMotion`), không qua state của React: không vẽ lại cả cây React ~60 lần mỗi giây.
 * Hàm này thuần theo thời gian nên test được bằng node giả. Node được tìm theo `name`; tham số riêng của từng node đọc bằng `getAttr`.
 */

/** Phần của node Konva mà chuyển động cần. */
export interface MotionNode {
  x(value: number): unknown
  y(value: number): unknown
  rotation(value: number): unknown
  scaleX(value: number): unknown
  scaleY(value: number): unknown
  opacity(value: number): unknown
  getAttr(name: string): unknown
}

export interface MotionHost {
  find(selector: string): readonly MotionNode[]
}

export interface MotionState {
  /** Mốc thời gian (giây, cùng đồng hồ với `now`) lúc có kết quả chấm; `null` khi chưa trả lời. */
  answeredAt: number | null
  correct: boolean
  /** Ong đang bay: chuyến bay tự điều khiển y của ong, nên chuyển động nền không đụng vào. */
  flying: boolean
  confetti: readonly ConfettiParticle[]
  /** Vệt lấp lánh sau ong khi bay (xem `sparkleTrail`); bỏ trống thì không có vệt. */
  trail?: SparkleTrail
  /** Âm nền theo ong (vo ve khi bay, cân trái/phải); bỏ trống thì không có tiếng ong. */
  ambience?: { follow(flying: boolean, pan: number): void }
  /** Trạng thái của ong (mặt, râu, cánh); đang bay thì luôn là `fly` bất kể giá trị này. Bỏ trống: `idle`. */
  beeState?: BeeState
  /** Trần nâng của chú ong (`GardenLayout.beeMaxLift`): nhảy cẫng thấp lại để ong không chạm bảng; bỏ trống thì nhảy đầy đủ. */
  maxLift?: number
  /** Giọng đọc đang phát: loa rung nhẹ và sóng âm chớp lần lượt. */
  speaking?: boolean
}

/**
 * Tên node mà `applyGardenMotion` tìm; các thành phần vẽ phải gắn đúng tên. Thuộc tính riêng của node (`motionIndex`, `motionRestY`...)
 * có tiền tố `motion` để không trùng setter có sẵn của Konva (như `setIndex`).
 */
export const MOTION_NAMES = {
  cloud: 'motion-cloud',
  sunRays: 'motion-sun-rays',
  sunGlow: 'motion-sun-glow',
  sway: 'motion-sway',
  wing: BEE_NAMES.wing,
  bee: BEE_NAMES.root,
  hintGlow: 'motion-hint-glow',
  hintSpark: 'motion-hint-spark',
  confetti: 'motion-confetti',
  decoration: 'motion-decoration',
  trail: 'motion-trail',
  pollen: 'motion-pollen',
  star: 'motion-star',
  firefly: 'motion-firefly',
  beam: 'motion-beam',
  parallax: PARALLAX_NAME,
  speaker: 'motion-speaker',
  wave: 'motion-wave',
} as const

const text = (node: MotionNode, name: string): string => {
  const value = node.getAttr(name)
  return typeof value === 'string' ? value : ''
}

const attr = (node: MotionNode, name: string, fallback = 0): number => {
  const value = node.getAttr(name)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Độ lệch nhún nhảy của ong: nhún khi chưa trả lời; sau khi lắc đầu (sai) xong cũng nhún lại; đúng thì không nhún (đang ăn mừng). */
function bobbing(answeredAt: number | null, correct: boolean, since: number): boolean {
  if (answeredAt === null) return true
  return !correct && since >= OOPS_SECONDS + 1
}

const bandOf = (node: MotionNode): Band | null => {
  const value = node.getAttr('motionBand')
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number') ? (value as unknown as Band) : null
}

/** Đặt vị trí, độ đục và cỡ của một hạt không khí theo hàm dáng của nó (bỏ qua nếu node không có dải). */
function applyPose(node: MotionNode, pose: (index: number, t: number, band: Band) => ParticlePose, now: number) {
  const band = bandOf(node)
  if (!band) return
  const next = pose(attr(node, 'motionIndex'), now, band)
  node.x(next.x)
  node.y(next.y)
  node.opacity(next.opacity)
  node.scaleX(next.scale)
  node.scaleY(next.scale)
}

export function applyGardenMotion(host: MotionHost, now: number, state: MotionState): void {
  // Camera nhẹ (thị sai): các lớp nền trượt ngược chiều ong; không có ong thì đứng ở giữa.
  const cameraX = host.find(`.${MOTION_NAMES.bee}`)[0]?.getAttr('x')
  const shift = typeof cameraX === 'number' ? parallaxOffset(cameraX) : 0
  for (const layer of host.find(`.${PARALLAX_NAME}`)) layer.x(attr(layer, 'parallaxBaseX') + shift * attr(layer, 'parallaxK'))
  for (const cloud of host.find(`.${MOTION_NAMES.cloud}`)) cloud.x(attr(cloud, 'motionBaseX') + Math.sin(now * attr(cloud, 'motionSpeed')) * attr(cloud, 'motionAmplitude') + shift * attr(cloud, 'parallaxK'))
  for (const rays of host.find(`.${MOTION_NAMES.sunRays}`)) rays.rotation(now * 8)
  // Không khí: phấn hoa trôi lên, sao nhấp nháy, đom đóm lượn và sáng tắt, tia nắng quét chậm (mỗi hạt tính thẳng từ chỉ số và thời gian).
  for (const node of host.find(`.${MOTION_NAMES.pollen}`)) applyPose(node, pollenPose, now)
  for (const node of host.find(`.${MOTION_NAMES.star}`)) applyPose(node, starPose, now)
  for (const node of host.find(`.${MOTION_NAMES.firefly}`)) applyPose(node, fireflyPose, now)
  for (const beam of host.find(`.${MOTION_NAMES.beam}`)) beam.rotation(beamSweep(attr(beam, 'motionIndex'), now))
  // Hạt lấp lánh quanh hoa gợi ý quay chậm quanh hoa (một vòng khoảng 9 giây).
  for (const spark of host.find(`.${MOTION_NAMES.hintSpark}`)) spark.rotation(now * 40)
  for (const glow of host.find(`.${MOTION_NAMES.sunGlow}`)) {
    glow.scaleX(sunGlowScale(now))
    glow.scaleY(sunGlowScale(now))
    glow.opacity(sunGlowOpacity(now))
  }
  for (const flower of host.find(`.${MOTION_NAMES.sway}`)) flower.rotation(Math.sin(now * 1.3 + attr(flower, 'motionIndex') * 0.9) * 4)
  // Cánh vỗ, râu lắc, chớp mắt, bóng đổ dưới ong theo trạng thái của ong (xem `bee/beeMotion`).
  applyBeeMotion(host, now, state.flying ? 'fly' : (state.beeState ?? 'idle'))
  for (const glow of host.find(`.${MOTION_NAMES.hintGlow}`)) {
    const scale = pulse(now)
    glow.scaleX(scale)
    glow.scaleY(scale)
  }

  const beeNode = host.find(`.${MOTION_NAMES.bee}`)[0]
  // Tiếng ong vo ve: chỉ khi đang bay, cân bằng trái/phải theo vị trí ngang của ong.
  if (state.ambience && beeNode) state.ambience.follow(state.flying, panForX(attr(beeNode, 'x'), GARDEN_LEFT, GARDEN_RIGHT))
  for (const item of host.find(`.${MOTION_NAMES.decoration}`)) {
    const angle = now * attr(item, 'motionSpeed') + attr(item, 'motionPhase')
    const amplitude = attr(item, 'motionAmplitude')
    // Phản ứng khi chạm (`decorReactions`) cộng thêm: nhấc lên `reactY` và nghiêng `reactRot` độ; bằng 0 thì chuyển động nền như cũ.
    const lift = attr(item, 'reactY')
    const tilt = attr(item, 'reactRot')
    const kind = text(item, 'motionKind')
    switch (kind) {
      case 'drift':
        item.x(attr(item, 'motionBaseX') + Math.sin(angle) * amplitude)
        break
      case 'float':
        item.y(attr(item, 'motionBaseY') + Math.sin(angle) * amplitude + lift)
        item.x(attr(item, 'motionBaseX') + Math.cos(angle * 0.7) * amplitude * 0.6)
        break
      case 'sway':
        item.rotation(Math.sin(angle) * amplitude + tilt)
        break
      default:
        break
    }
    if (kind !== 'float' && lift !== 0) item.y(attr(item, 'motionBaseY') + lift)
    if (kind !== 'sway' && tilt !== 0) item.rotation(tilt)
    // Vật ở trời nhường chỗ cho ong: càng gần ong càng mờ (tâm ong và tâm vật cùng hệ toạ độ sau khi trừ độ lệch của nhóm trang trí).
    if (attr(item, 'motionFade') !== 0 && beeNode) {
      const dx = attr(beeNode, 'x') - attr(item, 'motionOffX') - attr(item, 'x')
      const dy = attr(beeNode, 'y') - attr(item, 'motionOffY') - attr(item, 'y')
      item.opacity(attr(item, 'motionBaseOpacity', 1) * decorFade(Math.hypot(dx, dy)))
    }
  }

  // Vệt lấp lánh: thả hạt tại chỗ ong khi đang bay, rồi đặt dáng từng ngôi sao nhỏ (tên + chỉ số ô) theo tuổi của hạt.
  const trail = state.trail
  if (trail) {
    const bee = host.find(`.${MOTION_NAMES.bee}`)[0]
    if (bee) trail.update(now, state.flying, attr(bee, 'x'), attr(bee, 'y'))
    for (const star of host.find(`.${MOTION_NAMES.trail}`)) {
      const pose = trail.pose(attr(star, 'motionIndex'), now)
      star.x(pose.x)
      star.y(pose.y)
      star.opacity(pose.opacity)
      star.scaleX(pose.scale)
      star.scaleY(pose.scale)
      star.rotation(pose.rotation)
    }
  }

  // Nút nghe lại: đang đọc thì loa rung nhẹ (±5°) và ba vòng sóng sáng lần lượt (lệch pha theo chỉ số); không đọc thì loa đứng yên, sóng ẩn.
  for (const speaker of host.find(`.${MOTION_NAMES.speaker}`)) speaker.rotation(state.speaking ? Math.sin(now * 22) * 5 : 0)
  for (const wave of host.find(`.${MOTION_NAMES.wave}`)) {
    wave.opacity(state.speaking ? 0.25 + 0.75 * Math.max(0, Math.sin(now * 7 - attr(wave, 'motionIndex') * 1.1)) : 0)
  }

  const since = state.answeredAt === null ? -1 : now - state.answeredAt
  if (!state.flying) {
    for (const bee of host.find(`.${MOTION_NAMES.bee}`)) {
      const rest = attr(bee, 'motionRestY')
      const bob = bobbing(state.answeredAt, state.correct, since) ? beeBob(now) : 0
      bee.y(rest + bob + (state.correct ? happyHop(since, state.maxLift) : 0))
      bee.rotation(state.answeredAt === null ? 0 : state.correct ? happySpin(since) : oopsShake(since))
    }
  }
  for (const star of host.find(`.${MOTION_NAMES.confetti}`)) {
    const particle = state.confetti[attr(star, 'motionIndex', -1)]
    const pose = particle && state.correct && since < CONFETTI_SECONDS ? confettiPose(particle, since) : { x: 0, y: 0, rotation: 0, opacity: 0 }
    star.x(pose.x)
    star.y(pose.y)
    star.rotation(pose.rotation)
    star.opacity(pose.opacity)
  }
}
