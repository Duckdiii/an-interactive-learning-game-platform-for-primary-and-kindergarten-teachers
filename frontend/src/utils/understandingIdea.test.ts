import { describe, expect, it } from 'vitest'
import type { GameUnderstanding } from '../types/understanding.types'
import { composeIdea } from './understandingIdea'

const CARD: GameUnderstanding = {
  learningGoal: 'So sánh số trong phạm vi 10',
  childAction: 'Chọn dấu đúng',
  content: ['3 ... 5', '7 ... 2'],
  setting: 'Bầu trời, bóng bay',
  gameType: 'CUSTOM',
  alternativeGameTypes: [],
  unsupported: [{ need: 'Ghi âm', fallback: 'Bé nghe rồi chọn' }],
  assumptions: [],
}

describe('composeIdea', () => {
  it('ghép thẻ thành các dòng có nhãn, bỏ dòng trống', () => {
    expect(composeIdea(CARD, 'mô tả gốc')).toBe(
      'Mục tiêu: So sánh số trong phạm vi 10\nTrẻ sẽ: Chọn dấu đúng\nNội dung: 3 ... 5; 7 ... 2\nBối cảnh: Bầu trời, bóng bay\nLàm thay phần chưa hỗ trợ: Bé nghe rồi chọn',
    )
    expect(composeIdea({ ...CARD, setting: '', content: [], unsupported: [] }, 'x')).toBe('Mục tiêu: So sánh số trong phạm vi 10\nTrẻ sẽ: Chọn dấu đúng')
  })

  it('thẻ gần như trống thì dùng lại mô tả ban đầu; quá dài thì cắt ở 2000 ký tự', () => {
    const empty = { ...CARD, learningGoal: '', childAction: '', content: [], setting: '', unsupported: [] }
    expect(composeIdea(empty, '  Đếm con vật cho bé  ')).toBe('Đếm con vật cho bé')
    expect(composeIdea({ ...CARD, content: Array(20).fill('a'.repeat(100)) }, 'x')).toHaveLength(2000)
  })
})
