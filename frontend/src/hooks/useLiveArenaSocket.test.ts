import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { resolveLiveArenaWsUrl, useLiveArenaSocket } from './useLiveArenaSocket'
import { getActiveStompClient, clearStompClientRegistry } from './stompClientRegistry'

// Mock stompjs & sockjs
const mockSubscribe = vi.fn()
const mockActivate = vi.fn()
const mockDeactivate = vi.fn()
let lastConfig: any = null

vi.mock('@stomp/stompjs', () => {
  return {
    Client: class {
      connected = true
      constructor(config: any) {
        lastConfig = config
      }
      activate = mockActivate
      deactivate = mockDeactivate
      subscribe = mockSubscribe
    },
  }
})

vi.mock('sockjs-client', () => {
  return {
    default: vi.fn(),
  }
})

vi.mock('./useAuth', () => ({
  useAuth: () => ({ token: 'mock-token' }),
}))

describe('useLiveArenaSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearStompClientRegistry()
    lastConfig = null
  })

  describe('resolveLiveArenaWsUrl', () => {
    it('ghép đúng endpoint ws/live-arena, không đưa token lên URL', () => {
      const url = resolveLiveArenaWsUrl()
      expect(url.endsWith('/ws/live-arena')).toBe(true)
      expect(url).not.toContain('?token=')
    })
  })

  describe('WebSocket lifecycle & subscriptions', () => {
    it('đăng ký client vào registry và subscribe 5 topic bao gồm answer-status', () => {
      const handlers = {
        onParticipantsUpdate: vi.fn(),
        onStateChange: vi.fn(),
        onQuestion: vi.fn(),
        onLeaderboard: vi.fn(),
        onAnswerStatus: vi.fn(),
      }

      const { unmount } = renderHook(() => useLiveArenaSocket('session-999', handlers))

      expect(mockActivate).toHaveBeenCalledTimes(1)
      expect(getActiveStompClient('session-999')).toBeDefined()

      // Giả lập onConnect
      act(() => {
        lastConfig.onConnect()
      })

      expect(mockSubscribe).toHaveBeenCalledWith(
        '/topic/session/session-999/participants',
        expect.any(Function),
      )
      expect(mockSubscribe).toHaveBeenCalledWith(
        '/topic/session/session-999/state',
        expect.any(Function),
      )
      expect(mockSubscribe).toHaveBeenCalledWith(
        '/topic/session/session-999/question',
        expect.any(Function),
      )
      expect(mockSubscribe).toHaveBeenCalledWith(
        '/topic/session/session-999/leaderboard',
        expect.any(Function),
      )
      expect(mockSubscribe).toHaveBeenCalledWith(
        '/topic/session/session-999/answer-status',
        expect.any(Function),
      )

      // Kích hoạt callback answer-status
      const answerStatusCall = mockSubscribe.mock.calls.find(
        (call: any[]) => call[0] === '/topic/session/session-999/answer-status',
      )
      expect(answerStatusCall).toBeDefined()
      act(() => {
        answerStatusCall?.[1]({
          body: JSON.stringify({ participantId: 'p-1', answered: true }),
        })
      })
      expect(handlers.onAnswerStatus).toHaveBeenCalledWith({
        participantId: 'p-1',
        answered: true,
      })

      // Unmount -> hủy đăng ký khỏi registry và deactivate
      unmount()
      expect(mockDeactivate).toHaveBeenCalledTimes(1)
      expect(getActiveStompClient('session-999')).toBeUndefined()
    })
  })
})
