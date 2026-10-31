import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { TeacherRoomClient } from './RoomClient'
import { initialTeacherRoomState, teacherRoomReducer } from './teacherRoomReducer'

/**
 * Nối màn tivi với `TeacherRoomClient`. `run` bọc lệnh của giáo viên: lệnh thất bại thì bật `actionFailed` thay vì im lặng.
 * `command` là lệnh điều khiển ván: chạy một lệnh một lúc, vì bấm "Câu tiếp" hai lần nhanh sẽ nhảy mất một câu.
 */
export function useTeacherRoom(client: TeacherRoomClient) {
  const [state, dispatch] = useReducer(teacherRoomReducer, initialTeacherRoomState)
  const [actionFailed, setActionFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)

  const connect = useCallback(() => {
    client.connect().catch(() => dispatch({ type: 'connection', status: 'disconnected' }))
  }, [client])

  useEffect(() => {
    dispatch({ type: 'reset' })
    setActionFailed(false)

    const unsubscribeEvents = client.subscribe(dispatch)
    const unsubscribeConnection = client.subscribeConnection((status) => dispatch({ type: 'connection', status }))

    connect()

    return () => {
      unsubscribeEvents()
      unsubscribeConnection()
      client.disconnect()
    }
  }, [client, connect])

  const run = useCallback((action: () => Promise<void>) => {
    setActionFailed(false)

    return action().catch(() => setActionFailed(true))
  }, [])

  const command = useCallback(
    (action: () => Promise<void>) => {
      if (running.current) return

      running.current = true
      setBusy(true)
      void run(action).finally(() => {
        running.current = false
        setBusy(false)
      })
    },
    [run],
  )

  return { state, actionFailed, busy, run, command, connect }
}
