import { useCallback } from 'react'
import { getActiveStompClient } from './stompClientRegistry'

/**
 * Hook trợ giúp gửi message STOMP qua các destination /app/...
 * Dùng chung cho các hành động điều khiển (start, next question, kick participant...)
 */
export function useStompPublish(sessionId: string) {
  const publish = useCallback(
    (destination: string, body: unknown = {}) => {
      const client = getActiveStompClient(sessionId)
      if (client && client.connected) {
        client.publish({
          destination,
          body: JSON.stringify(body),
        })
      }
    },
    [sessionId],
  )

  return { publish }
}
