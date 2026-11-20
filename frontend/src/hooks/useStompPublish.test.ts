import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { Client } from '@stomp/stompjs'
import { useStompPublish } from './useStompPublish'
import { registerStompClient, clearStompClientRegistry } from './stompClientRegistry'

describe('useStompPublish', () => {
  beforeEach(() => {
    clearStompClientRegistry()
  })

  it('gửi message qua client.publish khi client đang kết nối', () => {
    const mockPublish = vi.fn()
    const mockClient = {
      connected: true,
      publish: mockPublish,
    } as unknown as Client

    registerStompClient('session-abc', mockClient)

    const { result } = renderHook(() => useStompPublish('session-abc'))
    result.current.publish('/app/session/session-abc/kick/p1', { reason: 'spam' })

    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/session/session-abc/kick/p1',
      body: JSON.stringify({ reason: 'spam' }),
    })
  })

  it('không ném lỗi nếu client chưa kết nối hoặc không tồn tại', () => {
    const { result } = renderHook(() => useStompPublish('session-none'))
    expect(() => {
      result.current.publish('/app/test', {})
    }).not.toThrow()
  })
})
