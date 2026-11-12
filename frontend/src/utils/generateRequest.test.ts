import { describe, expect, it } from 'vitest'
import {
  IDEA_MIN_LENGTH,
  buildGenerateRequest,
  checkGenerate,
  hasValidIdea,
  validateVisualClozeImageInput,
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
  it('gửi mode IMAGE khi giáo viên chọn Odd One Out hình', () => {
    const request = buildGenerateRequest(form({ idea: 'Nhận biết các loại trái cây', oddOneOutMode: 'IMAGE' }), 'idea', 'ODD_ONE_OUT')
    expect(request.mode).toBe('IMAGE')
    expect(request).not.toHaveProperty('sceneImageUrl')
    expect(request).not.toHaveProperty('optionImages')
  })
  it('chế độ ý tưởng gửi idea đã cắt khoảng trắng và giọng đọc mặc định Bắc/Nữ', () => {
    expect(buildGenerateRequest(form({ idea: '  Đếm số lượng con vật  ' }), 'idea', 'QUIZ')).toEqual({
      subject: 'MATH',
      gradeLevel: 'GRADE_1',
      gameType: 'QUIZ',
      idea: 'Đếm số lượng con vật',
      voice: { region: 'NORTH', gender: 'FEMALE' },
    })
  })

  it('chưa có khối lớp hoặc môn thì không gửi hai trường đó (để AI tự suy ra)', () => {
    const request = buildGenerateRequest(form({ idea: 'Đếm số lượng con vật', subject: '', gradeLevel: '' }), 'idea', 'QUIZ')

    expect(request).not.toHaveProperty('subject')
    expect(request).not.toHaveProperty('gradeLevel')
  })

  it('chế độ ngẫu nhiên gửi randomTopic và KHÔNG gửi idea dù trong ô còn chữ', () => {
    const request = buildGenerateRequest(form({ idea: 'Đếm số lượng con vật' }), 'random', 'QUIZ')

    expect(request.randomTopic).toBe(true)
    expect(request).not.toHaveProperty('idea')
  })

  it('mỗi yêu cầu mang gameType bắt buộc mà giáo viên đã chọn', () => {
    expect(buildGenerateRequest(form({ idea: 'Đếm số lượng con vật' }), 'idea', 'MATCHING').gameType).toBe('MATCHING')
  })

  it('có tệp mà ý tưởng quá ngắn thì không gửi idea', () => {
    expect(buildGenerateRequest(form({ idea: 'ngắn', hasFile: true }), 'idea', 'QUIZ')).not.toHaveProperty('idea')
  })

  it('giọng đọc theo lựa chọn của giáo viên', () => {
    const request = buildGenerateRequest(
      form({ idea: 'Đếm số lượng con vật', voiceRegion: 'SOUTH', voiceGender: 'MALE' }),
      'idea',
      'QUIZ',
    )

    expect(request.voice).toEqual({ region: 'SOUTH', gender: 'MALE' })
  })

  it('includes teacher supplied images only for VISUAL_CLOZE IMAGE', () => {
    const request = buildGenerateRequest(
      form({
        idea: 'Animals on a farm',
        visualClozeMode: 'IMAGE',
        sceneImageUrl: 'https://example.com/farm.png',
        optionImages: [
          { imageUrl: 'https://example.com/cow.png', visualPrompt: 'Cow' },
          { imageUrl: 'https://example.com/duck.png', visualPrompt: 'Duck' },
        ],
      }),
      'idea',
      'VISUAL_CLOZE',
    )

    expect(request).toMatchObject({
      gameType: 'VISUAL_CLOZE',
      mode: 'IMAGE',
      sceneImageUrl: 'https://example.com/farm.png',
      optionImages: [
        { imageUrl: 'https://example.com/cow.png', visualPrompt: 'Cow' },
        { imageUrl: 'https://example.com/duck.png', visualPrompt: 'Duck' },
      ],
    })
  })

  it('does not include image inputs for other game types', () => {
    const request = buildGenerateRequest(
      form({ visualClozeMode: 'IMAGE', sceneImageUrl: 'https://example.com/scene.png' }),
      'idea',
      'QUIZ',
    )

    expect(request).not.toHaveProperty('mode')
    expect(request).not.toHaveProperty('sceneImageUrl')
    expect(request).not.toHaveProperty('optionImages')
  })
})

describe('validateVisualClozeImageInput', () => {
  const options = [
    { imageUrl: 'https://example.com/a.png', visualPrompt: 'A' },
    { imageUrl: 'https://example.com/b.png', visualPrompt: 'B' },
  ]

  it('requires an HTTPS scene URL', () => {
    expect(validateVisualClozeImageInput('http://example.com/scene.png', options)).toBe('sceneUrl')
  })

  it('requires 2 to 8 options, each with an HTTPS URL and description', () => {
    expect(validateVisualClozeImageInput('https://example.com/scene.png', options.slice(0, 1))).toBe('optionCount')
    expect(
      validateVisualClozeImageInput('https://example.com/scene.png', [
        options[0],
        { imageUrl: 'http://example.com/b.png', visualPrompt: 'B' },
      ]),
    ).toBe('optionFields')
    expect(
      validateVisualClozeImageInput('https://example.com/scene.png', [
        options[0],
        { imageUrl: 'https://example.com/b.png', visualPrompt: '' },
      ]),
    ).toBe('optionFields')
  })

  it('requires distinct option URLs', () => {
    expect(
      validateVisualClozeImageInput('https://example.com/scene.png', [options[0], { ...options[0], visualPrompt: 'Other' }]),
    ).toBe('duplicateOptionUrl')
  })

  it('accepts a valid set of teacher supplied URLs', () => {
    expect(validateVisualClozeImageInput('https://example.com/scene.png', options)).toBeNull()
  })
})
