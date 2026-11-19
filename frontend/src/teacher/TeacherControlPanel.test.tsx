import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TeacherControlPanel } from './TeacherControlPanel'
import type { LiveArenaHandlers } from '../player/presentation/presentationTypes'

let capturedHandlers: LiveArenaHandlers = {}
const mockPublish = vi.fn()

vi.mock('../hooks/useLiveArenaSocket', () => ({
  useLiveArenaSocket: (_sessionId: string, handlers: LiveArenaHandlers) => {
    capturedHandlers = handlers
    return { connected: true, client: null }
  },
}))

vi.mock('../hooks/useStompPublish', () => ({
  useStompPublish: (_sessionId: string) => ({
    publish: mockPublish,
  }),
}))

describe('TeacherControlPanel', () => {
  beforeEach(() => {
    capturedHandlers = {}
    mockPublish.mockClear()
  })

  it('hiển thị thông báo khi chưa có học sinh nào tham gia', () => {
    render(<TeacherControlPanel sessionId="session-demo" />)
    expect(screen.getByText('Học sinh tham gia (0)')).toBeInTheDocument()
    expect(screen.getByText('Chưa có học sinh nào tham gia...')).toBeInTheDocument()
  })

  it('cập nhật danh sách học sinh realtime và hiển thị trạng thái kết nối', () => {
    render(<TeacherControlPanel sessionId="session-demo" />)

    act(() => {
      capturedHandlers.onParticipantsUpdate?.({
        participants: [
          { id: 'p1', name: 'Bé Lan', connected: true },
          { id: 'p2', name: 'Bé Hùng', connected: false },
        ],
      })
    })

    expect(screen.getByText('Học sinh tham gia (2)')).toBeInTheDocument()
    expect(screen.getByText('Bé Lan')).toBeInTheDocument()
    expect(screen.getByText('Bé Hùng')).toBeInTheDocument()

    // Trạng thái online/offline
    expect(screen.getByTitle('Đang kết nối')).toBeInTheDocument()
    expect(screen.getByTitle('Mất kết nối')).toBeInTheDocument()
  })

  it('hiển thị trạng thái "✓ Đã trả lời" và số lượng trong phase QUESTION', () => {
    render(<TeacherControlPanel sessionId="session-demo" />)

    // Cập nhật danh sách
    act(() => {
      capturedHandlers.onParticipantsUpdate?.({
        participants: [
          { id: 'p1', name: 'Bé Lan', connected: true },
          { id: 'p2', name: 'Bé Hùng', connected: true },
        ],
      })
    })

    // Chuyển sang phase QUESTION
    act(() => {
      capturedHandlers.onStateChange?.({ phase: 'QUESTION' })
    })

    expect(screen.getByText('Đã trả lời: 0/2')).toBeInTheDocument()
    expect(screen.queryByText('✓ Đã trả lời')).not.toBeInTheDocument()

    // Học sinh p1 nộp câu trả lời
    act(() => {
      capturedHandlers.onAnswerStatus?.({ participantId: 'p1', answered: true })
    })

    expect(screen.getByText('Đã trả lời: 1/2')).toBeInTheDocument()
    expect(screen.getByText('✓ Đã trả lời')).toBeInTheDocument()

    // Chuyển sang câu hỏi mới (trigger lại QUESTION) -> tự reset đã trả lời
    act(() => {
      capturedHandlers.onStateChange?.({ phase: 'QUESTION' })
    })

    expect(screen.getByText('Đã trả lời: 0/2')).toBeInTheDocument()
    expect(screen.queryByText('✓ Đã trả lời')).not.toBeInTheDocument()
  })

  it('nhấn "Loại khỏi phiên" gửi đúng message STOMP /app/session/{sessionId}/kick/{participantId}', () => {
    render(<TeacherControlPanel sessionId="sess-777" />)

    act(() => {
      capturedHandlers.onParticipantsUpdate?.({
        participants: [{ id: 'bad-actor', name: 'Phá Game', connected: true }],
      })
    })

    const kickBtn = screen.getByText('Loại khỏi phiên')
    fireEvent.click(kickBtn)

    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith('/app/session/sess-777/kick/bad-actor', {})
  })
})
