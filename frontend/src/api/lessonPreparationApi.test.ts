import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { LESSON_PREPARATION_TIMEOUT_MS, postPrepareLesson } from './lessonPreparationApi'

vi.mock('./axiosInstance', () => ({ default: { post: vi.fn() } }))

const mockedPost = vi.mocked(axiosInstance.post)

describe('postPrepareLesson', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the lesson file and selected context to the separate preparation endpoint', async () => {
    mockedPost.mockResolvedValue({ data: { data: { idea: 'Dạy học sinh lớp 1 đếm số từ 1 đến 5.' } } } as never)
    const file = new File(['lesson'], 'lesson.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const controller = new AbortController()

    const result = await postPrepareLesson({ subject: 'MATH', gradeLevel: 'GRADE_1', idea: 'Đếm số', file }, controller.signal)

    const [path, body, options] = mockedPost.mock.calls[0]
    expect(path).toBe('/games/prepare')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('subject')).toBe('MATH')
    expect((body as FormData).get('gradeLevel')).toBe('GRADE_1')
    expect((body as FormData).get('idea')).toBe('Đếm số')
    expect((body as FormData).get('file')).toBe(file)
    expect(options).toEqual({ timeout: LESSON_PREPARATION_TIMEOUT_MS, signal: controller.signal })
    expect(result.idea).toContain('lớp 1')
  })
})
