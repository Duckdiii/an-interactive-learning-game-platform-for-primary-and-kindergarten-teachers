import { describe, expect, it } from 'vitest'
import { missingCorrectLinks, verdictOfLink, type MatchingResult } from './matchingResult'

const link = (leftPairId: string, rightPairId: string) => ({ leftPairId, rightPairId })
const correctLinks = [link('l1', 'r2'), link('l2', 'r1'), link('l3', 'r3')]

describe('verdictOfLink', () => {
  it('màn đúng thì mọi cặp đúng, kể cả khi không có danh sách đáp án', () => {
    const result: MatchingResult = { isCorrect: true, correctLinks: [] }

    expect(verdictOfLink(link('l1', 'r2'), result)).toBe('correct')
  })

  it('màn sai và biết đáp án: cặp trùng đáp án là đúng, còn lại là sai', () => {
    const result: MatchingResult = { isCorrect: false, correctLinks }

    expect(verdictOfLink(link('l1', 'r2'), result)).toBe('correct')
    expect(verdictOfLink(link('l2', 'r3'), result)).toBe('wrong')
    expect(verdictOfLink(link('l3', 'r1'), result)).toBe('wrong')
  })

  it('màn sai và không biết đáp án: mọi cặp là sai, không đoán cặp nào đúng', () => {
    const result: MatchingResult = { isCorrect: false, correctLinks: [] }

    expect(verdictOfLink(link('l1', 'r2'), result)).toBe('wrong')
  })
})

describe('missingCorrectLinks', () => {
  it('màn đúng thì không có cặp thiếu', () => {
    expect(missingCorrectLinks(correctLinks, { isCorrect: true, correctLinks })).toEqual([])
  })

  it('màn sai: trả các cặp đúng mà trẻ chưa nối đúng', () => {
    const student = [link('l1', 'r2'), link('l2', 'r3'), link('l3', 'r1')]

    expect(missingCorrectLinks(student, { isCorrect: false, correctLinks })).toEqual([
      link('l2', 'r1'),
      link('l3', 'r3'),
    ])
  })

  it('không biết đáp án thì không có gì để hiện thêm', () => {
    expect(missingCorrectLinks([link('l1', 'r1')], { isCorrect: false, correctLinks: [] })).toEqual([])
  })

  it('trẻ chưa nối gì (xem lại câu bỏ qua) thì hiện toàn bộ đáp án đúng', () => {
    expect(missingCorrectLinks([], { isCorrect: false, correctLinks })).toEqual(correctLinks)
  })
})
