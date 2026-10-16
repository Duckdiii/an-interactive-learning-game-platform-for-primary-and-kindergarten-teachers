import { describe, expect, it } from 'vitest'
import type { AudioVisualMatchQuestion } from '../../../types/game-dsl.types'
import { addDistractor, removeDistractor, setCorrectPrompt, setDistractorPrompt } from './avmEditing'

const question = (count: number): AudioVisualMatchQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  audioText: 'Cat',
  correct: { visualPrompt: 'cat', imageUrl: 'https://example.com/cat.png' },
  distractors: Array.from({ length: count }, (_, index) => ({ visualPrompt: `d${index}`, imageUrl: `https://example.com/d${index}.png` })),
})

describe('avmEditing', () => {
  it('đổi mô tả giữ nguyên imageUrl và không đổi bản cũ', () => {
    const base = question(2)
    const next = setDistractorPrompt(setCorrectPrompt(base, 'kitten'), 1, 'puppy')

    expect(next.correct).toEqual({ visualPrompt: 'kitten', imageUrl: 'https://example.com/cat.png' })
    expect(next.distractors[1]).toEqual({ visualPrompt: 'puppy', imageUrl: 'https://example.com/d1.png' })
    expect(base.correct.visualPrompt).toBe('cat')
  })

  it('vị trí ngoài phạm vi: trả lại nguyên bản', () => {
    const base = question(2)

    expect(setDistractorPrompt(base, 2, 'x')).toBe(base)
    expect(setDistractorPrompt(base, -1, 'x')).toBe(base)
    expect(removeDistractor(base, 2)).toBe(base)
    expect(removeDistractor(base, -1)).toBe(base)
  })

  it('thêm ở cuối một hình trống; đủ 3 thì không thêm nữa', () => {
    const added = addDistractor(question(2))

    expect(added.distractors).toHaveLength(3)
    expect(added.distractors[2]).toEqual({ visualPrompt: '' })

    const full = question(3)

    expect(addDistractor(full)).toBe(full)
  })

  it('xóa đúng hình ở vị trí đó; chỉ còn 1 thì không xóa nữa', () => {
    expect(removeDistractor(question(3), 0).distractors.map((choice) => choice.visualPrompt)).toEqual(['d1', 'd2'])

    const last = question(1)

    expect(removeDistractor(last, 0)).toBe(last)
  })
})
