import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { clearDraft, loadDraft, saveDraft } from './draftStorage'

const content = buildMockGameContents()[0]

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('draftStorage', () => {
  it('lưu rồi đọc lại đúng nội dung kèm thời điểm sao lưu và mốc cập nhật của máy chủ', () => {
    const now = new Date('2026-10-14T08:30:00.000Z')

    expect(saveDraft('t1', 'g1', content, '2026-10-14T07:00:00.000Z', now)).toBe(true)
    expect(loadDraft('t1', 'g1')).toEqual({ content, savedAt: now.toISOString(), baseUpdatedAt: '2026-10-14T07:00:00.000Z' })
  })

  it('khóa theo giáo viên và theo game: người khác hoặc game khác không thấy bản sao lưu', () => {
    saveDraft('t1', 'g1', content, '2026-10-14T07:00:00.000Z')

    expect(loadDraft('t2', 'g1')).toBeNull()
    expect(loadDraft('t1', 'g2')).toBeNull()
  })

  it('xóa bản sao lưu', () => {
    saveDraft('t1', 'g1', content, '2026-10-14T07:00:00.000Z')
    clearDraft('t1', 'g1')

    expect(loadDraft('t1', 'g1')).toBeNull()
  })

  it('dữ liệu hỏng hoặc sai hình dạng được coi như không có, không văng lỗi', () => {
    const noMetadata = JSON.stringify({ content: { gameType: 'QUIZ', questions: [] }, savedAt: '2026-10-14T08:00:00.000Z', baseUpdatedAt: '2026-10-14T07:00:00.000Z' })
    const badDate = JSON.stringify({ content, savedAt: 'hôm qua', baseUpdatedAt: '2026-10-14T07:00:00.000Z' })

    for (const bad of ['không phải JSON', '{}', '{"content":{"gameType":"QUIZ"}}', 'null', '[]', noMetadata, badDate]) {
      localStorage.setItem('ai-game:editor-draft:t1:g1', bad)

      expect(loadDraft('t1', 'g1'), bad).toBeNull()
    }
  })

  it('trình duyệt chặn lưu trữ thì bỏ qua, không làm hỏng trang', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('đầy', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bị chặn', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('bị chặn', 'SecurityError')
    })

    expect(saveDraft('t1', 'g1', content, 'x')).toBe(false)
    expect(loadDraft('t1', 'g1')).toBeNull()
    expect(() => clearDraft('t1', 'g1')).not.toThrow()
  })

  it('chỉ lưu nội dung game: không có trường nào của học sinh hay phiên chơi', () => {
    saveDraft('t1', 'g1', content, '2026-10-14T07:00:00.000Z')

    const raw = localStorage.getItem('ai-game:editor-draft:t1:g1') ?? ''

    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['baseUpdatedAt', 'content', 'savedAt'])
    expect(raw).not.toMatch(/participant|nickname|sessionId|studentId/i)
  })
})
