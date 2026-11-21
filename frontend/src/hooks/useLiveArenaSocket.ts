import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from './useAuth'
import { registerStompClient, unregisterStompClient } from './stompClientRegistry'
import type { LiveArenaHandlers } from '../player/presentation/presentationTypes'

export function resolveLiveArenaWsUrl(): string {
  const envWs = import.meta.env.VITE_WS_BASE_URL
  const envApi = import.meta.env.VITE_API_BASE_URL
  const base =
    envWs ||
    (envApi ? envApi.replace(/\/api\/?$/, '') : '') ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8088')
  return `${base.replace(/\/+$/, '')}/ws/live-arena`
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

    const wsUrl = resolveLiveArenaWsUrl()

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      // JWT đi qua header STOMP CONNECT (không để lên URL) để backend gán Principal.
      connectHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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

        client.subscribe(`/topic/session/${sessionId}/answer-status`, (msg) => {
          try {
            const data = JSON.parse(msg.body)
            handlersRef.current.onAnswerStatus?.(data)
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

    registerStompClient(sessionId, client)
    client.activate()
    clientRef.current = client

    return () => {
      unregisterStompClient(sessionId, client)
      client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [sessionId, accessToken])

  return { connected, client: clientRef.current }
}
