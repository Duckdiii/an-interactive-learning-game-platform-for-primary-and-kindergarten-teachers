import { describe, expect, it } from 'vitest'
import { SUBJECT_VALUES } from './labels'
import { IDEAS, ideaGroupOf } from './createIdeas'

const GROUPS = ['KINDERGARTEN', 'GRADE_1', 'UPPER'] as const

describe('IDEAS', () => {
  it('phủ đủ các môn của API', () => {
    expect(Object.keys(IDEAS).sort()).toEqual([...SUBJECT_VALUES].sort())
  })

  it.each(SUBJECT_VALUES.flatMap((subject) => GROUPS.map((group) => [subject, group] as const)))(
    '%s · %s có đúng 4 mục đầy đủ, không trùng tiêu đề, ký hiệu tối đa 2 ký tự',
    (subject, group) => {
      const ideas = IDEAS[subject as keyof typeof IDEAS][group]

      expect(ideas).toHaveLength(4)
      for (const idea of ideas) {
        expect(idea.glyph.trim()).not.toBe('')
        expect([...idea.glyph].length).toBeLessThanOrEqual(2)
        expect(idea.title.trim()).not.toBe('')
        expect(idea.description.trim()).not.toBe('')
      }
      expect(new Set(ideas.map((idea) => idea.title)).size).toBe(4)
    },
  )
})

describe('ideaGroupOf', () => {
  it('gộp Lớp 2–5 thành UPPER, khối lạ hoặc rỗng thì không có nhóm', () => {
    expect(ideaGroupOf('KINDERGARTEN')).toBe('KINDERGARTEN')
    expect(ideaGroupOf('GRADE_1')).toBe('GRADE_1')
    for (const grade of ['GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5']) expect(ideaGroupOf(grade)).toBe('UPPER')
    expect(ideaGroupOf('')).toBe('')
    expect(ideaGroupOf('GRADE_9')).toBe('')
  })
})
