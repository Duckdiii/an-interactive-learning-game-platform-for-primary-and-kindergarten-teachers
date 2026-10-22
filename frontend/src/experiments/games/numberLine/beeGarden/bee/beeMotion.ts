import type { MotionHost, MotionNode } from '../gardenMotion'
import { antennaAngle, BEE_POSES, beeShadow, blinkOpenness, wingFlapScale, type BeeState } from './beePoses'

/** Tên node của các bộ phận ong để bộ chuyển động tìm theo tên (cùng cách với phần còn lại của vườn). */
export const BEE_NAMES = {
  root: 'motion-bee',
  wing: 'motion-wing',
  antenna: 'motion-bee-antenna',
  eyes: 'motion-bee-eyes',
  shadow: 'motion-bee-shadow',
} as const

const attr = (node: MotionNode, name: string): number => {
  const value = node.getAttr(name)
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Chuyển động của các bộ phận ong theo `BeeState`, gọi MỖI KHUNG HÌNH từ `applyGardenMotion` (cùng một vòng lặp Konva.Animation, không thêm vòng lặp nào):
 * cánh vỗ (tốc độ theo trạng thái), râu lắc (hai râu lệch pha), chớp mắt định kỳ (chỉ khi mắt mở) và bóng đổ dưới ong (nhỏ và mờ dần theo độ nâng).
 * Hàm thuần theo thời gian: test được bằng node giả. Thân nhún, nhảy cẫng và lắc đầu vẫn do `applyGardenMotion` làm trên node gốc của ong.
 */
export function applyBeeMotion(host: MotionHost, now: number, state: BeeState): void {
  const pose = BEE_POSES[state]
  const flap = wingFlapScale(now, pose)
  for (const wing of host.find(`.${BEE_NAMES.wing}`)) wing.scaleY(flap)
  for (const antenna of host.find(`.${BEE_NAMES.antenna}`)) antenna.rotation(antennaAngle(now, pose, attr(antenna, 'motionSide') < 0 ? -1 : 1))
  const openness = pose.blinks ? blinkOpenness(now) : 1
  for (const eyes of host.find(`.${BEE_NAMES.eyes}`)) eyes.scaleY(openness)

  const shadows = host.find(`.${BEE_NAMES.shadow}`)
  if (shadows.length === 0) return
  const bee = host.find(`.${BEE_NAMES.root}`)[0]
  for (const shadow of shadows) {
    if (!bee) {
      shadow.opacity(0) // không có ong (xem lại bài chưa chọn) thì không có bóng
      continue
    }
    const { scale, opacity } = beeShadow(attr(bee, 'motionRestY') - attr(bee, 'y'))
    shadow.x(attr(bee, 'x'))
    shadow.scaleX(scale)
    shadow.scaleY(scale)
    shadow.opacity(opacity)
  }
}
