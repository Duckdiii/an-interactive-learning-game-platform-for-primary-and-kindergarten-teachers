import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postPrepareLesson } from '../api/lessonPreparationApi'
import { usePrepareLesson } from './usePrepareLesson'

vi.mock('../api/lessonPreparationApi', () => ({ postPrepareLesson: vi.fn() }))

const mockedPrepare = vi.mocked(postPrepareLesson)

describe('usePrepareLesson', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not publish an old response after the teacher resets the form', async () => {
    let resolveRequest!: (value: { idea: string }) => void
    mockedPrepare.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    const { result } = renderHook(() => usePrepareLesson())
    const pending = result.current.prepare({
      subject: 'MATH',
      gradeLevel: 'GRADE_1',
      file: new File(['lesson'], 'lesson.pdf', { type: 'application/pdf' }),
    })

    act(() => result.current.reset())
    await act(async () => {
      resolveRequest({ idea: 'Dạy đếm số từ một đến năm.' })
      await pending
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.lesson).toBeNull()
  })
})
