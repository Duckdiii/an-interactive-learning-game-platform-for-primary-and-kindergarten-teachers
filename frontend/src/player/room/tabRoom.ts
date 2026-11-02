import type { AnswerPayload, PublishInfo, StudentGame } from '../../types/game-student.types'
import { RoomJoinError } from './RoomClient'
import type { RoomConnection, RoomJoinErrorCode, StudentRoomClient, StudentRoomEvent } from './RoomClient'

/**
 * Nối phòng mô phỏng giữa các tab CÙNG máy bằng `BroadcastChannel`: tab tivi giữ `createMockRoom`, tab học sinh gọi qua kênh.
 * Chỉ dùng ở bản dev. shortcut: không đi qua được máy khác, tải lại tab là mất phòng; thay bằng client STOMP khi Backend có WebSocket.
 */

/** Đủ để tab cùng máy trả lời; không có tab nào giữ PIN này thì coi như không có phòng. */
const REPLY_TIMEOUT_MS = 800

export interface TabRoomContent {
  info: PublishInfo
  /** Dạng học sinh, không có đáp án: dữ liệu này đi qua kênh. */
  game: StudentGame
}

export interface TabRoomSource extends TabRoomContent {
  join(nickname: string): { participantId: string; client: StudentRoomClient }
  kick(participantId: string): Promise<void>
}

type Action =
  | { type: 'lookup' }
  | { type: 'join'; nickname: string }
  | { type: 'connect'; participantId: string }
  | { type: 'answer'; participantId: string; questionId: string; payload: AnswerPayload }

type Message =
  | { kind: 'request'; requestId: string; action: Action }
  | { kind: 'reply'; requestId: string; ok: true; value: unknown }
  | { kind: 'reply'; requestId: string; ok: false; code?: RoomJoinErrorCode }
  | { kind: 'disconnect' | 'leave'; participantId: string }
  | { kind: 'event'; participantId: string; event: StudentRoomEvent }
  | { kind: 'connection'; participantId: string; status: RoomConnection }
  | { kind: 'hostGone' }

const channelName = (pin: string) => `ai-game-room-${pin}`
const newRequestId = () => `${Date.now()}-${Math.random()}`

function request<T>(channel: BroadcastChannel, action: Action): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = newRequestId()
    const finish = () => {
      clearTimeout(timer)
      channel.removeEventListener('message', onMessage)
    }
    const onMessage = ({ data }: MessageEvent<Message>) => {
      if (data.kind !== 'reply' || data.requestId !== requestId) return

      finish()
      if (data.ok) resolve(data.value as T)
      else reject(data.code ? new RoomJoinError(data.code) : new Error('Phòng từ chối yêu cầu'))
    }
    const timer = setTimeout(() => {
      finish()
      reject(new Error('Phòng không trả lời'))
    }, REPLY_TIMEOUT_MS)

    channel.addEventListener('message', onMessage)
    channel.postMessage({ kind: 'request', requestId, action } satisfies Message)
  })
}

/** Tab tivi: phục vụ các tab học sinh. Gọi hàm trả về khi đóng phòng. */
export function hostTabRoom(pin: string, room: TabRoomSource): () => void {
  const channel = new BroadcastChannel(channelName(pin))
  const players = new Map<string, { client: StudentRoomClient; stop: () => void }>()
  let closed = false
  // `closed`: yêu cầu đang xử lý dở lúc đóng phòng thì không gửi vào kênh đã đóng.
  const post = (message: Message) => {
    if (!closed) channel.postMessage(message)
  }

  const clientOf = (participantId: string) => {
    const player = players.get(participantId)

    if (!player) throw new Error('Biệt danh không còn trong phòng')

    return player.client
  }

  const handle = async (action: Action): Promise<unknown> => {
    switch (action.type) {
      case 'lookup':
        return { info: room.info, game: room.game } satisfies TabRoomContent
      case 'join': {
        const { participantId, client } = room.join(action.nickname)
        const stopEvents = client.subscribe((event) => post({ kind: 'event', participantId, event }))
        const stopConnection = client.subscribeConnection((status) => post({ kind: 'connection', participantId, status }))

        players.set(participantId, { client, stop: () => (stopEvents(), stopConnection()) })

        return participantId
      }
      case 'connect':
        return clientOf(action.participantId).connect()
      case 'answer':
        return clientOf(action.participantId).answer(action.questionId, action.payload)
    }
  }

  const onMessage = ({ data }: MessageEvent<Message>) => {
    if (data.kind === 'request') {
      handle(data.action).then(
        (value) => post({ kind: 'reply', requestId: data.requestId, ok: true, value }),
        (error: unknown) => post({ kind: 'reply', requestId: data.requestId, ok: false, code: error instanceof RoomJoinError ? error.code : undefined }),
      )
    } else if (data.kind === 'disconnect') {
      players.get(data.participantId)?.client.disconnect()
    } else if (data.kind === 'leave') {
      players.get(data.participantId)?.stop()
      players.delete(data.participantId)
      void room.kick(data.participantId)
    }
  }

  channel.addEventListener('message', onMessage)

  return () => {
    if (closed) return

    post({ kind: 'hostGone' })
    closed = true
    players.forEach((player) => player.stop())
    players.clear()
    channel.close()
  }
}

/** Không có `BroadcastChannel` hoặc không tab nào giữ PIN thì trả `null`. */
export async function findTabRoom(pin: string): Promise<TabRoomContent | null> {
  if (typeof BroadcastChannel === 'undefined') return null

  const channel = new BroadcastChannel(channelName(pin))

  try {
    return await request<TabRoomContent>(channel, { type: 'lookup' })
  } catch {
    return null
  } finally {
    channel.close()
  }
}

/** Sự kiện `disconnect` của `client` không làm rời phòng (StrictMode ngắt rồi nối lại); `leave` mới rời. */
export async function joinTabRoom(pin: string, nickname: string): Promise<{ client: StudentRoomClient; leave: () => void }> {
  const channel = new BroadcastChannel(channelName(pin))
  let participantId: string

  try {
    participantId = await request<string>(channel, { type: 'join', nickname })
  } catch (error) {
    channel.close()
    throw error instanceof RoomJoinError ? error : new RoomJoinError('SESSION_CLOSED')
  }

  const listeners = new Set<(event: StudentRoomEvent) => void>()
  const connectionListeners = new Set<(status: RoomConnection) => void>()
  let hostGone = false
  let left = false

  channel.addEventListener('message', ({ data }: MessageEvent<Message>) => {
    if (data.kind === 'hostGone') {
      hostGone = true
      listeners.forEach((listener) => listener({ type: 'state', data: { status: 'CLOSED', remainingMs: null } }))
      connectionListeners.forEach((listener) => listener('disconnected'))
    } else if (data.kind === 'event' && data.participantId === participantId) {
      listeners.forEach((listener) => listener(data.event))
    } else if (data.kind === 'connection' && data.participantId === participantId) {
      connectionListeners.forEach((listener) => listener(data.status))
    }
  })

  const leave = () => {
    if (left) return

    left = true
    window.removeEventListener('pagehide', leave)
    if (!hostGone) channel.postMessage({ kind: 'leave', participantId } satisfies Message)
    channel.close()
  }

  window.addEventListener('pagehide', leave)

  return {
    leave,
    client: {
      connect: () => request<void>(channel, { type: 'connect', participantId }),
      disconnect: () => {
        if (!left && !hostGone) channel.postMessage({ kind: 'disconnect', participantId } satisfies Message)
      },
      subscribe(listener) {
        listeners.add(listener)

        return () => listeners.delete(listener)
      },
      subscribeConnection(listener) {
        connectionListeners.add(listener)

        return () => connectionListeners.delete(listener)
      },
      answer: (questionId, payload) => request<void>(channel, { type: 'answer', participantId, questionId, payload }),
    },
  }
}
