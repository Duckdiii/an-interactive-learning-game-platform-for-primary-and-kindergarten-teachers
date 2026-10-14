import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { clearAllDrafts, clearDraft, clearDraftsExcept, loadDraft, saveDraft } from './draftStorage'

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

describe('draftStorage: gắn với mã giáo viên và xóa khi đăng xuất', () => {
  it('chưa có mã giáo viên (null, undefined, rỗng) thì không lưu, không đọc, không xóa gì', () => {
    saveDraft('t1', 'g1', content, '2026-10-14T07:00:00.000Z')

    for (const owner of [null, undefined, '', '   ']) {
      expect(saveDraft(owner, 'g1', content, '2026-10-14T07:00:00.000Z'), String(owner)).toBe(false)
      expect(loadDraft(owner, 'g1'), String(owner)).toBeNull()
      clearDraft(owner, 'g1')
    }

    // Không có khóa lạ nào được tạo, và bản của giáo viên thật không bị đụng tới.
    expect(localStorage.length).toBe(1)
    expect(loadDraft('t1', 'g1')).not.toBeNull()
  })

  it('clearAllDrafts xóa bản sao lưu của MỌI giáo viên và game, nhưng giữ nguyên khóa khác', () => {
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tA', 'g2', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tB', 'g1', content, '2026-10-14T07:00:00.000Z')
    localStorage.setItem('accessToken', 'giu-nguyen')

    clearAllDrafts()

    expect(loadDraft('tA', 'g1')).toBeNull()
    expect(loadDraft('tA', 'g2')).toBeNull()
    expect(loadDraft('tB', 'g1')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBe('giu-nguyen')
  })

  it('clearAllDrafts không văng lỗi khi trình duyệt chặn lưu trữ', () => {
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new DOMException('bị chặn', 'SecurityError')
    })
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')

    expect(() => clearAllDrafts()).not.toThrow()
  })
})

describe('clearDraftsExcept', () => {
  it('giữ bản sao lưu của giáo viên được chỉ định, xóa của mọi người khác, không đụng khóa khác', () => {
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tB', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tB', 'g2', content, '2026-10-14T07:00:00.000Z')
    localStorage.setItem('accessToken', 'giu-nguyen')

    clearDraftsExcept('tB')

    expect(loadDraft('tA', 'g1')).toBeNull()
    expect(loadDraft('tB', 'g1')).not.toBeNull()
    expect(loadDraft('tB', 'g2')).not.toBeNull()
    expect(localStorage.getItem('accessToken')).toBe('giu-nguyen')
  })

  it('không rõ người đăng nhập là ai (thiếu mã) thì xóa hết', () => {
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')

    clearDraftsExcept(undefined)

    expect(loadDraft('tA', 'g1')).toBeNull()
  })

  it('mã giáo viên là tiền tố của mã khác (t1 và t10) không bị nhầm', () => {
    saveDraft('t1', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('t10', 'g1', content, '2026-10-14T07:00:00.000Z')

    clearDraftsExcept('t1')

    expect(loadDraft('t1', 'g1')).not.toBeNull()
    expect(loadDraft('t10', 'g1')).toBeNull()
  })
})
