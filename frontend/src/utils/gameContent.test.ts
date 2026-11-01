import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { deepEqual, isTransientMediaUrl, stripTransientMedia, toContent, trimContent } from './gameContent'

describe('toContent', () => {
  it('bỏ gameId, status, updatedAt và giữ nguyên phần DSL', () => {
    const dsl = buildMockGameContents()[0]
    const response = { ...dsl, gameId: 'g1', status: 'DRAFT', updatedAt: '2026-10-14T00:00:00.000Z' }

    expect(toContent(response)).toEqual(dsl)
    expect(Object.keys(toContent(response))).not.toContain('gameId')
  })
})

describe('deepEqual', () => {
  it('không phụ thuộc thứ tự khóa, phân biệt mảng và đối tượng', () => {
    expect(deepEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
  })
})

describe('trimContent', () => {
  it('cắt khoảng trắng hai đầu của mọi chuỗi (lồng nhau, trong mảng), giữ nguyên số và cấu trúc', () => {
    const input = { a: '  x ', n: 5, list: [' y', { deep: 'z  ' }], flag: true, none: null }

    expect(trimContent(input)).toEqual({ a: 'x', n: 5, list: ['y', { deep: 'z' }], flag: true, none: null })
  })

  it('không có gì để cắt thì trả lại ĐÚNG đối tượng cũ (không tạo bản sao thừa)', () => {
    const input = { a: 'x', list: ['y', { deep: 'z' }] }

    expect(trimContent(input)).toBe(input)
  })

  it('chỉ sao chép nhánh có thay đổi', () => {
    const untouched = { deep: 'z' }
    const input = { a: ' x', keep: untouched }
    const out = trimContent(input)

    expect(out.keep).toBe(untouched)
    expect(out.a).toBe('x')
  })
})

describe('stripTransientMedia', () => {
  it('bỏ imageUrl/audioUrl dạng blob: và data: ở mọi cấp (câu, bên của cặp), giữ đường dẫn thường', () => {
    const content = {
      questions: [
        { id: 'q1', imageUrl: 'blob:http://localhost/abc', audioUrl: '/mock/q1.wav' },
        { id: 'q2', imageUrl: 'data:image/png;base64,AAAA', audioUrl: 'DATA:audio/mpeg;base64,AAAA' },
        { id: 'q3', pairs: [{ left: { imageUrl: 'blob:x' }, right: { imageUrl: 'https://cdn.example/a.png', text: 'a' } }] },
      ],
    }

    expect(stripTransientMedia(content)).toEqual({
      questions: [
        { id: 'q1', audioUrl: '/mock/q1.wav' },
        { id: 'q2' },
        { id: 'q3', pairs: [{ left: {}, right: { imageUrl: 'https://cdn.example/a.png', text: 'a' } }] },
      ],
    })
  })

  it('KHÔNG đụng chữ giáo viên gõ, dù chữ đó bắt đầu bằng "data:" hay "blob:"', () => {
    const content = { questions: [{ questionText: 'data: là gì?', audioText: 'blob: là gì?', visualPrompt: 'data:image' }] }

    expect(stripTransientMedia(content)).toEqual(content)
  })

  it('không có gì cần bỏ thì trả lại đúng đối tượng cũ (không tạo bản sao)', () => {
    const content = { questions: [{ id: 'q1', imageUrl: '/mock/cat.png' }] }

    expect(stripTransientMedia(content)).toBe(content)
  })

  it('không sửa đối tượng đầu vào', () => {
    const content = { questions: [{ id: 'q1', imageUrl: 'blob:http://localhost/abc' }] }

    stripTransientMedia(content)

    expect(content.questions[0].imageUrl).toBe('blob:http://localhost/abc')
  })

  it('isTransientMediaUrl: chỉ blob: và data: (không phân biệt hoa thường, bỏ khoảng trắng đầu), không nhận đường dẫn thường hay giá trị không phải chuỗi', () => {
    expect(isTransientMediaUrl('blob:http://localhost/abc')).toBe(true)
    expect(isTransientMediaUrl('  Data:text/plain,hi')).toBe(true)
    expect(isTransientMediaUrl('/mock/cat.png')).toBe(false)
    expect(isTransientMediaUrl('https://blob.example/data:x')).toBe(false)
    expect(isTransientMediaUrl(undefined)).toBe(false)
  })
})

describe('stripTransientMedia với bản đã lưu (fallback)', () => {
  const saved = {
    questions: [
      { id: 'q1', imageUrl: '/mock/dog.png', audioUrl: '/mock/q1.wav' },
      { id: 'q2' },
      { id: 'q3', pairs: [{ pairId: 'p1', left: { imageUrl: '/mock/cat.png' } }, { pairId: 'p2', left: {} }] },
    ],
  }

  it('thay ảnh cũ bằng ảnh blob: thì bản sao lưu GIỮ ảnh cũ, không làm mất ảnh đang dùng', () => {
    const draft = {
      questions: [
        { id: 'q1', imageUrl: 'blob:http://localhost/new', audioUrl: 'data:audio/mpeg;base64,AAAA' },
        { id: 'q2', imageUrl: 'blob:http://localhost/other' },
        { id: 'q3', pairs: [{ pairId: 'p1', left: { imageUrl: 'blob:x' } }, { pairId: 'p2', left: { imageUrl: 'blob:y' } }] },
      ],
    }

    expect(stripTransientMedia(draft, saved)).toEqual({
      questions: [
        { id: 'q1', imageUrl: '/mock/dog.png', audioUrl: '/mock/q1.wav' },
        // Câu chưa từng có ảnh thì bỏ hẳn trường.
        { id: 'q2' },
        { id: 'q3', pairs: [{ pairId: 'p1', left: { imageUrl: '/mock/cat.png' } }, { pairId: 'p2', left: {} }] },
      ],
    })
  })

  it('ghép theo mã chứ không theo vị trí: đổi thứ tự câu vẫn lấy đúng ảnh cũ của từng câu', () => {
    const draft = { questions: [{ id: 'q2', imageUrl: 'blob:a' }, { id: 'q1', imageUrl: 'blob:b' }] }

    expect(stripTransientMedia(draft, saved)).toEqual({ questions: [{ id: 'q2' }, { id: 'q1', imageUrl: '/mock/dog.png' }] })
  })

  it('bản đã lưu cũng chỉ là blob: thì không dùng làm giá trị thay thế; đường dẫn thường không bị đổi', () => {
    const odd = { questions: [{ id: 'q1', imageUrl: 'blob:old' }] }
    const draft = { questions: [{ id: 'q1', imageUrl: 'blob:new', audioUrl: '/mock/keep.wav' }] }

    expect(stripTransientMedia(draft, odd)).toEqual({ questions: [{ id: 'q1', audioUrl: '/mock/keep.wav' }] })
  })
})
