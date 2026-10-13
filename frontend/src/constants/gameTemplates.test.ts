import { describe, expect, it } from 'vitest'
import {
  GAME_TEMPLATES,
  TEMPLATE_LEVELS,
  TOPIC_MAX_LENGTH,
  templatesForLevel,
} from './gameTemplates'
import {
  GRADE_LEVEL_VALUES,
  SUBJECT_VALUES,
  gradeLevelLabel,
  subjectLabel,
} from './labels'

describe('mẫu game gợi ý', () => {
  it('id không trùng và mọi mẫu có tiêu đề, chủ đề', () => {
    const ids = GAME_TEMPLATES.map((template) => template.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const template of GAME_TEMPLATES) {
      expect(template.title.trim()).not.toBe('')
      expect(template.topic.trim()).not.toBe('')
    }
  })

  it('môn và khối lớp là giá trị enum của API và có nhãn tiếng Việt (không rơi về nhãn dự phòng)', () => {
    for (const template of GAME_TEMPLATES) {
      expect(SUBJECT_VALUES).toContain(template.subject)
      expect(GRADE_LEVEL_VALUES).toContain(template.level)
      expect(subjectLabel(template.subject)).not.toMatch(/^[A-Z][a-z]+$/)
      expect(gradeLevelLabel(template.level)).not.toMatch(/Grade/)
    }
  })

  it('chủ đề không vượt giới hạn độ dài của ô nhập', () => {
    for (const template of GAME_TEMPLATES) {
      expect(template.topic.length).toBeLessThanOrEqual(TOPIC_MAX_LENGTH)
    }
  })

  it('mỗi cấp học có ít nhất 2 mẫu cho từng môn', () => {
    for (const { value } of TEMPLATE_LEVELS) {
      for (const subject of SUBJECT_VALUES) {
        const count = templatesForLevel(value).filter(
          (template) => template.subject === subject,
        ).length
        expect(count, `${value} / ${subject}`).toBeGreaterThanOrEqual(2)
      }
    }
  })
})
