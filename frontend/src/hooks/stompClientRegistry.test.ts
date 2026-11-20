import { describe, it, expect, beforeEach } from 'vitest'
import type { Client } from '@stomp/stompjs'
import {
  registerStompClient,
  unregisterStompClient,
  getActiveStompClient,
  clearStompClientRegistry,
} from './stompClientRegistry'

describe('stompClientRegistry', () => {
  beforeEach(() => {
    clearStompClientRegistry()
  })

  it('đăng ký và lấy đúng client theo sessionId', () => {
    const fakeClient = { id: 'client-1' } as unknown as Client
    registerStompClient('session-1', fakeClient)

    expect(getActiveStompClient('session-1')).toBe(fakeClient)
    expect(getActiveStompClient('unknown-session')).toBeUndefined()
  })

  it('hủy đăng ký client khi unmount hoặc ngắt kết nối', () => {
    const fakeClient = { id: 'client-1' } as unknown as Client
    registerStompClient('session-1', fakeClient)

    unregisterStompClient('session-1', fakeClient)
    expect(getActiveStompClient('session-1')).toBeUndefined()
  })

  it('không hủy đăng ký nếu client truyền vào không khớp với client hiện hành', () => {
    const clientA = { id: 'client-A' } as unknown as Client
    const clientB = { id: 'client-B' } as unknown as Client
    registerStompClient('session-1', clientA)

    unregisterStompClient('session-1', clientB)
    expect(getActiveStompClient('session-1')).toBe(clientA)
  })
})
