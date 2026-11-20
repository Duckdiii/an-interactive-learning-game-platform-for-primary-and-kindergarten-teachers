import type { Client } from '@stomp/stompjs'

/**
 * Registry quản lý instance STOMP client đang hoạt động theo sessionId.
 * Giúp chia sẻ kết nối duy nhất giữa useLiveArenaSocket và useStompPublish,
 * tránh tạo 2 kết nối WebSocket trùng lặp trên cùng một thiết bị.
 */
const activeClients = new Map<string, Client>()

export function registerStompClient(sessionId: string, client: Client): void {
  if (sessionId && client) {
    activeClients.set(sessionId, client)
  }
}

export function unregisterStompClient(sessionId: string, client?: Client): void {
  if (!sessionId) return
  const current = activeClients.get(sessionId)
  if (!client || current === client) {
    activeClients.delete(sessionId)
  }
}

export function getActiveStompClient(sessionId: string): Client | undefined {
  return activeClients.get(sessionId)
}

export function clearStompClientRegistry(): void {
  activeClients.clear()
}
