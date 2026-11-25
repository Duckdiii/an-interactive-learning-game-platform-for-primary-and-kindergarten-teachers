import type { HitRegion, SpotTheTargetQuestion } from '../../../types/game-dsl.types'

/** Làm tròn số thực đến 4 chữ số thập phân. */
const round4 = (val: number) => Math.round(val * 10000) / 10000

/** Cập nhật câu lệnh mô tả đối tượng cần tìm. */
export function setTargetDescription(question: SpotTheTargetQuestion, targetDescription: string): SpotTheTargetQuestion {
  return {
    ...question,
    targetDescription,
  }
}

/** Cập nhật ảnh nền visualPrompt. */
export function setVisualPrompt(question: SpotTheTargetQuestion, visualPrompt: string): SpotTheTargetQuestion {
  return {
    ...question,
    visualPrompt,
  }
}

/** Cập nhật tọa độ tâm (x, y) và bán kính (radius) của vùng mục tiêu đúng. */
export function setHitRegion(
  question: SpotTheTargetQuestion,
  x: number,
  y: number,
  radius: number = 0.1
): SpotTheTargetQuestion {
  const clampedX = Math.min(1, Math.max(0, x))
  const clampedY = Math.min(1, Math.max(0, y))
  const clampedRadius = Math.min(1, Math.max(0.01, radius))

  const hitRegion: HitRegion = {
    x: round4(clampedX),
    y: round4(clampedY),
    radius: round4(clampedRadius),
  }

  return {
    ...question,
    hitRegion,
  }
}

/** Xóa vùng mục tiêu đã chọn. */
export function clearHitRegion(question: SpotTheTargetQuestion): SpotTheTargetQuestion {
  const { hitRegion: _removed, ...rest } = question
  return rest as SpotTheTargetQuestion
}
