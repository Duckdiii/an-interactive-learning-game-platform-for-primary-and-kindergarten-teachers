import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from './useAuth'
import type { LiveArenaHandlers } from '../player/presentation/presentationTypes'

export function resolveLiveArenaWsUrl(accessToken?: string | null): string {
  const envWs = import.meta.env.VITE_WS_BASE_URL
  const envApi = import.meta.env.VITE_API_BASE_URL
  const base =
    envWs ||
    (envApi ? envApi.replace(/\/api\/?$/, '') : '') ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8088')
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''
  return `${base.replace(/\/+$/, '')}/ws/live-arena${tokenQuery}`
}

/**
 * Hook quản lý kết nối WebSocket STOMP dùng chung cho Live Arena
 * (Màn hình chiếu Presentation Screen + Màn hình điều khiển giáo viên đều dùng lại hook này)
 */
export function useLiveArenaSocket(sessionId: string, handlers: LiveArenaHandlers) {
  const { token: accessToken } = useAuth()
  const clientRef = useRef<Client | null>(null)
  const handlersRef = useRef<LiveArenaHandlers>(handlers)
  handlersRef.current = handlers
  const [connected, setConnected] = useState(false)
  const hasConnectedOnce = useRef(false)

  useEffect(() => {
    if (!sessionId) return

    const wsUrl = resolveLiveArenaWsUrl(accessToken)

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        if (hasConnectedOnce.current) {
          handlersRef.current.onReconnect?.()
        }
        hasConnectedOnce.current = true

        client.subscribe(`/topic/session/${sessionId}/participants`, (msg) => {
          try {
            const data = JSON.parse(msg.body)
            handlersRef.current.onParticipantsUpdate?.(data)
          } catch {
            // Bỏ qua gói tin không đúng định dạng JSON
          }
        })

        client.subscribe(`/topic/session/${sessionId}/state`, (msg) => {
          try {
            const data = JSON.parse(msg.body)
            handlersRef.current.onStateChange?.(data)
          } catch {
            // Bỏ qua gói tin không đúng định dạng JSON
          }
        })

        client.subscribe(`/topic/session/${sessionId}/question`, (msg) => {
          try {
            const data = JSON.parse(msg.body)
            handlersRef.current.onQuestion?.(data)
          } catch {
            // Bỏ qua gói tin không đúng định dạng JSON
          }
        })

        client.subscribe(`/topic/session/${sessionId}/leaderboard`, (msg) => {
          try {
            const data = JSON.parse(msg.body)
            handlersRef.current.onLeaderboard?.(data)
          } catch {
            // Bỏ qua gói tin không đúng định dạng JSON
          }
        })
      },
      onDisconnect: () => {
        setConnected(false)
      },
      onStompError: () => {
        setConnected(false)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [sessionId, accessToken])

  return { connected, client: clientRef.current }
}
