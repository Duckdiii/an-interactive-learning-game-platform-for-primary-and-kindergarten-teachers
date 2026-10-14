import { describe, expect, it } from 'vitest'
import { makeGame } from '../test/renderWithApp'
import { TOPIC_SUGGESTION_COUNT, suggestTopics, topicToCreateLink } from './topicSuggestions'

describe('suggestTopics (mock)', () => {
  it('chưa có game nào vẫn gợi ý đủ số lượng từ các mẫu chung', () => {
    expect(suggestTopics([])).toHaveLength(TOPIC_SUGGESTION_COUNT)
  })

  it('ưu tiên khối lớp và môn của các game gần đây', () => {
    const games = [makeGame(1, { gradeLevel: 'GRADE_1', subject: 'VIETNAMESE' })]
    const topics = suggestTopics(games)

    expect(topics).toHaveLength(TOPIC_SUGGESTION_COUNT)
    expect(topics[0]).toMatchObject({ gradeLevel: 'GRADE_1', subject: 'VIETNAMESE' })
  })

  it('xoay vòng giữa các môn gần đây để gợi ý đa dạng', () => {
    const games = [
      makeGame(1, { gradeLevel: 'KINDERGARTEN', subject: 'MATH' }),
      makeGame(2, { gradeLevel: 'KINDERGARTEN', subject: 'ENGLISH' }),
    ]
    const subjects = suggestTopics(games).map((topic) => topic.subject)

    expect(subjects.slice(0, 2)).toEqual(['MATH', 'ENGLISH'])
  })

  it('bỏ chủ đề trùng tên với game đã có, không trùng nhau, không vượt số lượng', () => {
    const [first] = suggestTopics([])
    const games = [makeGame(1, { title: first.title, gradeLevel: first.gradeLevel, subject: first.subject })]
    const topics = suggestTopics(games)

    expect(topics.map((topic) => topic.id)).not.toContain(first.id)
    expect(new Set(topics.map((topic) => topic.id)).size).toBe(topics.length)
    expect(topics.length).toBeLessThanOrEqual(TOPIC_SUGGESTION_COUNT)
  })
})

describe('topicToCreateLink', () => {
  it('mã hóa chủ đề và đưa khối lớp, môn vào địa chỉ', () => {
    const link = topicToCreateLink('/games/new', {
      id: 't',
      title: 'Đếm',
      topic: 'Đếm 1 đến 5 & hơn',
      gradeLevel: 'KINDERGARTEN',
      subject: 'MATH',
    })
    const url = new URL(link, 'http://localhost')

    expect(url.pathname).toBe('/games/new')
    expect(url.searchParams.get('idea')).toBe('Đếm 1 đến 5 & hơn')
    expect(url.searchParams.get('grade')).toBe('KINDERGARTEN')
    expect(url.searchParams.get('subject')).toBe('MATH')
  })
})
