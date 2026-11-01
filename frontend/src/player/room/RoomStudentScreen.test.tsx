import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerPayload, StudentGame } from '../../types/game-student.types'
import { createMockRoom } from './mockRoom'
import RoomStudentScreen, { RoomJoinErrorScreen } from './RoomStudentScreen'

vi.mock('../renderers', () => ({
  // Renderer thật vẽ bằng Canvas, jsdom không có; bản giả giữ đúng hợp đồng `onSubmit`.
  getPlayableRenderer: () =>
    function FakeRenderer({ question, onSubmit }: { question: { questionText: string }; onSubmit: (answer: AnswerPayload) => Promise<unknown> }) {
      return (
        <button type="button" onClick={() => void onSubmit({ selectedOptionId: 'a' } as AnswerPayload).catch(() => undefined)}>
          {question.questionText}
        </button>
      )
    },
}))

const GAME = {
  gameType: 'QUIZ',
  metadata: { title: 'Đếm', subject: 'MATH' },
  questions: [
    { id: 'q1', questionText: 'Một cộng một?', options: [{ id: 'a', text: 'Hai' }] },
    { id: 'q2', questionText: 'Hai cộng một?', options: [{ id: 'a', text: 'Ba' }] },
  ],
} as unknown as StudentGame

const setup = async (virtualStudents = 0, grade = true) => {
  const room = createMockRoom({ questionIds: ['q1', 'q2'], virtualStudents, questionMs: 10_000, grade: () => grade, correctAnswerOf: () => ({ selectedOptionId: 'a' }) })
  const joined = room.join('Mít')
  let view!: ReturnType<typeof render>

  await act(async () => {
    view = render(<RoomStudentScreen client={joined.client} nickname="Mít" game={GAME} />)
  })
  await room.teacher.connect()

  return { room, joined, view }
}

const teacher = (action: () => Promise<void>) =>
  act(async () => {
    await action()
  })

const answer = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RoomStudentScreen', () => {
  it('phòng chờ: hiện biệt danh và số bạn đang chờ cùng, không tính mình', async () => {
    await setup(24)

    expect(screen.getByText('Mít')).toBeInTheDocument()
    expect(screen.getByText('24 bạn đang chờ cùng bạn')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Chờ thầy cô/ })).toBeInTheDocument()
  })

  it('câu mới hiện trên máy, nộp xong báo đã trả lời chứ chưa báo đúng sai', async () => {
    const { room } = await setup(1)

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
    })
    expect(screen.getByRole('button', { name: 'Một cộng một?' })).toBeInTheDocument()

    await answer('Một cộng một?')

    expect(screen.getByRole('status')).toHaveTextContent('Đã trả lời')
    expect(screen.queryByText('Chính xác!')).not.toBeInTheDocument()
  })

  it('đúng: màn xanh có điểm, tổng điểm; không có hạng', async () => {
    const { room } = await setup()

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
    })
    await answer('Một cộng một?')

    expect(screen.getByRole('heading', { name: 'Chính xác!' })).toBeInTheDocument()
    expect(screen.getByText('+100 điểm')).toBeInTheDocument()
    expect(screen.queryByText(/Hạng/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chính xác!' }).parentElement).toHaveClass('bg-play-feedback-correct')
  })

  it('sai: nền cam dịu, không đỏ, không trừ điểm', async () => {
    const { room } = await setup(0, false)

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
    })
    await answer('Một cộng một?')

    const heading = screen.getByRole('heading', { name: 'Chưa đúng, cố lên!' })

    expect(heading.parentElement).toHaveClass('bg-play-feedback-try')
    expect(screen.getByText('+0 điểm')).toBeInTheDocument()
  })

  it('không trả lời kịp vẫn sang màn sau mỗi câu', async () => {
    const { room } = await setup()

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getByRole('heading', { name: 'Chưa đúng, cố lên!' })).toBeInTheDocument()
  })

  it('cô bấm xem đáp án thì hiện đáp án đúng; câu tiếp thì xóa', async () => {
    const { room } = await setup()

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
    })
    await answer('Một cộng một?')
    await teacher(() => room.teacher.reveal())
    expect(screen.getByText('Đáp án đúng: Hai')).toBeInTheDocument()

    await teacher(() => room.teacher.next())
    await answer('Hai cộng một?')
    expect(screen.queryByText(/Đáp án đúng/)).not.toBeInTheDocument()
  })

  it('kết thúc hiện hạng riêng; đóng phòng thì kết quả biến mất', async () => {
    const { room } = await setup(3)

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
    })
    await answer('Một cộng một?')
    await teacher(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
      await room.teacher.finish()
    })

    expect(screen.getByRole('heading', { name: 'Kết thúc!' })).toBeInTheDocument()
    expect(screen.getByText(/^Hạng \d\/4$/)).toBeInTheDocument()
    expect(screen.getByText('chỉ bạn nhìn thấy trên máy này')).toBeInTheDocument()

    await teacher(() => room.teacher.close())

    expect(screen.getByRole('heading', { name: /Phòng đã đóng/ })).toBeInTheDocument()
    expect(screen.queryByText(/^Hạng/)).not.toBeInTheDocument()
  })

  it('bị xóa biệt danh thì báo và không còn thông báo nối lại', async () => {
    const { room, joined } = await setup()

    await teacher(() => room.teacher.kick(joined.participantId))

    expect(screen.getByRole('heading', { name: /đổi biệt danh/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mất kết nối giữa câu: báo đang nối lại, nối xong về đúng câu', async () => {
    const { room, joined } = await setup()

    await teacher(() => room.teacher.start())
    act(() => joined.dropConnection())
    expect(screen.getByRole('status')).toHaveTextContent('Đang nối lại')

    await teacher(() => room.teacher.next())
    await teacher(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(screen.getByRole('button', { name: 'Một cộng một?' })).toBeInTheDocument()
    expect(screen.queryByText('Đang nối lại…')).not.toBeInTheDocument()
  })

  it('tạm dừng thì khóa câu và đứng đồng hồ', async () => {
    const { room, view } = await setup()

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
      await room.teacher.pause()
    })

    expect(screen.getByText('Cô đang tạm dừng')).toBeInTheDocument()
    expect(view.container.querySelector('[inert]')).not.toBeNull()

    await teacher(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('10')

    await teacher(() => room.teacher.resume())
    await teacher(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('7')
  })

  it('nộp lỗi thì báo, chọn lại được', async () => {
    const { room, joined } = await setup(1)

    await teacher(async () => {
      await room.teacher.start()
      await room.teacher.next()
    })
    vi.spyOn(joined.client, 'answer').mockRejectedValueOnce(new Error('mạng'))
    await answer('Một cộng một?')
    expect(screen.getByRole('status')).toHaveTextContent('Chưa gửi được')

    await answer('Một cộng một?')
    expect(screen.getByRole('status')).toHaveTextContent('Đã trả lời')
  })

  it.each([
    ['SESSION_CLOSED', /đã đóng/],
    ['SESSION_ALREADY_STARTED', /đã bắt đầu/],
    ['SESSION_FULL', /đủ người/],
  ] as const)('lỗi vào phòng %s có lời nhắn riêng', (code, message) => {
    render(<RoomJoinErrorScreen code={code} />)

    expect(screen.getByRole('heading', { name: message })).toBeInTheDocument()
  })
})
