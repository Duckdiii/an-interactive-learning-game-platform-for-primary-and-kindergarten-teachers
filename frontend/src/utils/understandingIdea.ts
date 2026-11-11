import type { GameUnderstanding } from '../types/understanding.types'
import { IDEA_MAX_LENGTH, IDEA_MIN_LENGTH } from './generateRequest'

/**
 * Ghép thẻ giáo viên đã xác nhận thành `idea` cho `POST /games/generate` (contract của endpoint đó không đổi). Thẻ trống quá thì dùng lại mô tả
 * ban đầu để không gửi ý tưởng dưới 10 ký tự.
 */
export function composeIdea(card: GameUnderstanding, originalIdea: string): string {
  const lines = [
    card.learningGoal && `Mục tiêu: ${card.learningGoal}`,
    card.childAction && `Trẻ sẽ: ${card.childAction}`,
    card.content.length > 0 && `Nội dung: ${card.content.join('; ')}`,
    card.setting && `Bối cảnh: ${card.setting}`,
    card.unsupported.length > 0 && `Làm thay phần chưa hỗ trợ: ${card.unsupported.map((item) => item.fallback).join('; ')}`,
  ].filter((line): line is string => Boolean(line && line.trim()))
  const idea = lines.join('\n').slice(0, IDEA_MAX_LENGTH)

  return idea.trim().length >= IDEA_MIN_LENGTH ? idea : originalIdea.trim().slice(0, IDEA_MAX_LENGTH)
}
