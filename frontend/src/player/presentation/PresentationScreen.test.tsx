import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationScreen } from './PresentationScreen'
import * as socketHook from '../../hooks/useLiveArenaSocket'
import type { LiveArenaHandlers } from './presentationTypes'

describe('PresentationScreen', () => {
  let capturedHandlers: LiveArenaHandlers = {}

  beforeEach(() => {
    capturedHandlers = {}
    vi.spyOn(socketHook, 'useLiveArenaSocket').mockImplementation(
      (_sessionId: string, handlers: LiveArenaHandlers) => {
        capturedHandlers = handlers
        return { connected: true, client: null }
      }
    )
  })

  it('mặc định hiển thị phòng chờ WAITING_ROOM', () => {
    render(
      <MemoryRouter initialEntries={['/presentation/sess-123?pin=888999']}>
        <PresentationScreen />
      </MemoryRouter>
    )

    expect(screen.getByTestId('pin-display')).toHaveTextContent('888999')
    expect(screen.getByText('Trực tuyến')).toBeInTheDocument()
  })

  it('chuyển trạng thái sang QUESTION khi nhận sự kiện state từ socket', () => {
    render(
      <MemoryRouter initialEntries={['/presentation/sess-123?pin=888999']}>
        <PresentationScreen />
      </MemoryRouter>
    )

    act(() => {
      capturedHandlers.onQuestion?.({
        question: {
          id: 'q1',
          instructionText: 'Đâu là bông hoa màu đỏ?',
        },
      })
      capturedHandlers.onStateChange?.({ phase: 'QUESTION' })
    })

    expect(screen.getByText('Đâu là bông hoa màu đỏ?')).toBeInTheDocument()
  })

  it('chuyển trạng thái sang LEADERBOARD khi nhận sự kiện state từ socket', () => {
    render(
      <MemoryRouter initialEntries={['/presentation/sess-123?pin=888999']}>
        <PresentationScreen />
      </MemoryRouter>
    )

    act(() => {
      capturedHandlers.onLeaderboard?.({
        entries: [{ rank: 1, name: 'Bé Hùng', score: 120 }],
      })
      capturedHandlers.onStateChange?.({ phase: 'LEADERBOARD' })
    })

    expect(screen.getByText('🏆 Bảng xếp hạng')).toBeInTheDocument()
    expect(screen.getByText('Bé Hùng')).toBeInTheDocument()
  })

  it('chuyển sang màn hình kết thúc ENDED', () => {
    render(
      <MemoryRouter initialEntries={['/presentation/sess-123?pin=888999']}>
        <PresentationScreen />
      </MemoryRouter>
    )

    act(() => {
      capturedHandlers.onStateChange?.({ phase: 'ENDED' })
    })

    expect(screen.getByText('🎉 Trò chơi đã kết thúc!')).toBeInTheDocument()
  })
})
