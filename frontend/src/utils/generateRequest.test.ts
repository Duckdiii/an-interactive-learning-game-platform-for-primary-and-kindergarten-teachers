import { describe, expect, it } from 'vitest'
import {
  IDEA_MIN_LENGTH,
  buildGenerateRequest,
  checkGenerate,
  hasValidIdea,
} from './generateRequest'
import type { GenerateForm } from './generateRequest'

const form = (overrides: Partial<GenerateForm> = {}): GenerateForm => ({
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  idea: '',
  voiceRegion: 'NORTH',
  voiceGender: 'FEMALE',
  hasFile: false,
  ...overrides,
})

describe('checkGenerate', () => {
  it('khối lớp và môn học KHÔNG bắt buộc: không chọn, không đoán được vẫn tạo được', () => {
    const noContext = { idea: 'Đếm số lượng con vật', hasFile: false }

    expect(checkGenerate(noContext, 'idea')).toBeNull()
    expect(checkGenerate({ idea: '', hasFile: false }, 'random')).toBeNull()
  })

  it('chế độ ý tưởng cần ý tưởng đủ dài hoặc tệp giáo án', () => {
    expect(checkGenerate(form(), 'idea')).toBe('needIdea')
    expect(checkGenerate(form({ idea: 'ngắn' }), 'idea')).toBe('needIdea')
    expect(checkGenerate(form({ idea: 'Đếm số lượng con vật' }), 'idea')).toBeNull()
    expect(checkGenerate(form({ hasFile: true }), 'idea')).toBeNull()
  })

  it('ý tưởng chỉ khoảng trắng không được tính', () => {
    expect(checkGenerate(form({ idea: ' '.repeat(30) }), 'idea')).toBe('needIdea')
  })

  it('chế độ ngẫu nhiên không cần gì thêm', () => {
    expect(checkGenerate(form(), 'random')).toBeNull()
  })
})

describe('hasValidIdea', () => {
  it('đúng ngưỡng tối thiểu 10 ký tự sau khi cắt khoảng trắng', () => {
    expect(hasValidIdea('a'.repeat(IDEA_MIN_LENGTH - 1))).toBe(false)
    expect(hasValidIdea('a'.repeat(IDEA_MIN_LENGTH))).toBe(true)
    expect(hasValidIdea('  ' + 'a'.repeat(IDEA_MIN_LENGTH - 1) + '  ')).toBe(false)
  })
})

describe('buildGenerateRequest', () => {
  it('chế độ ý tưởng gửi idea đã cắt khoảng trắng và giọng đọc mặc định Bắc/Nữ', () => {
    expect(buildGenerateRequest(form({ idea: '  Đếm số lượng con vật  ' }), 'idea')).toEqual({
      subject: 'MATH',
      gradeLevel: 'GRADE_1',
      idea: 'Đếm số lượng con vật',
      voice: { region: 'NORTH', gender: 'FEMALE' },
    })
  })

  it('chưa có khối lớp hoặc môn thì không gửi hai trường đó (để AI tự suy ra)', () => {
    const request = buildGenerateRequest(form({ idea: 'Đếm số lượng con vật', subject: '', gradeLevel: '' }), 'idea')

    expect(request).not.toHaveProperty('subject')
    expect(request).not.toHaveProperty('gradeLevel')
  })

  it('chế độ ngẫu nhiên gửi randomTopic và KHÔNG gửi idea dù trong ô còn chữ', () => {
    const request = buildGenerateRequest(form({ idea: 'Đếm số lượng con vật' }), 'random')

    expect(request.randomTopic).toBe(true)
    expect(request).not.toHaveProperty('idea')
  })

  it('mỗi yêu cầu mang đúng một gameType giáo viên đã chọn; không truyền thì để AI chọn', () => {
    expect(buildGenerateRequest(form({ idea: 'Đếm số lượng con vật' }), 'idea')).not.toHaveProperty('gameType')
    expect(buildGenerateRequest(form({ idea: 'Đếm số lượng con vật' }), 'idea', 'MATCHING').gameType).toBe('MATCHING')
  })

  it('có tệp mà ý tưởng quá ngắn thì không gửi idea', () => {
    expect(buildGenerateRequest(form({ idea: 'ngắn', hasFile: true }), 'idea')).not.toHaveProperty('idea')
  })

  it('giọng đọc theo lựa chọn của giáo viên', () => {
    const request = buildGenerateRequest(
      form({ idea: 'Đếm số lượng con vật', voiceRegion: 'SOUTH', voiceGender: 'MALE' }),
      'idea',
    )

    expect(request.voice).toEqual({ region: 'SOUTH', gender: 'MALE' })
  })
})
