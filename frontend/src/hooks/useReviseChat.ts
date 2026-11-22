import { useRef, useState } from 'react'
import { CHAT_MAX_TURNS } from '../constants/aiLimits'
import { viText } from '../constants/viText'
import { reviseGame } from '../services/reviseService'
import type { AnyGameResponse } from '../types/game-response.types'
import type { ChatTurn } from '../types/understanding.types'
import { parseApiError } from '../utils/apiError'

const text = viText.reviseChat
// openapi ReviseGameRequest.history tối đa 10 lượt.
const MAX_HISTORY = 10

/**
 * Cuộc chat "Sửa bằng trò chuyện" trong trình soạn: mỗi tin của giáo viên gọi POST /games/{gameId}/revise với các lượt trước;
 * thành công thì giao game đã sửa cho `onRevised` (trình soạn áp vào bản nháp hoặc hỏi giữ/bỏ với game CPF).
 */
export function useReviseChat(
  gameId: string,
  /** Nhận game đã sửa; trả về câu trợ lý nhắn lại (ví dụ "chưa áp vì cô đã sửa tay"), bỏ trống thì dùng câu mặc định. */
  onRevised: (game: AnyGameResponse) => string | void,
  /** Gọi ngay trước mỗi lần gọi AI (gửi mới hoặc Thử lại), ví dụ để chụp lại bản nháp lúc gửi. */
  onSending?: () => void,
) {
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const failed = useRef<string | null>(null)
  // Chặn bấm gửi liền hai lần trước khi giao diện kịp vẽ lại (state `pending` chưa kịp đổi).
  const busy = useRef(false)
  const history = useRef<ChatTurn[]>([])

  const run = async (instruction: string, previous: ChatTurn[]) => {
    onSending?.()
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const game = await reviseGame(gameId, { instruction, history: previous.slice(-MAX_HISTORY) })
      failed.current = null
      const reply = onRevised(game) || text.applied
      history.current = [...history.current, { role: 'ASSISTANT', text: reply }]
      setMessages(history.current)
    } catch (caught) {
      failed.current = instruction
      setError(parseApiError(caught, text.errorFallback).message)
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return {
    messages,
    pending,
    error,
    canSend: !pending && messages.length < CHAT_MAX_TURNS,
    /** Gửi một yêu cầu sửa; false nếu không gửi (trống, đang chờ, quá dài). */
    send: (value: string): boolean => {
      const instruction = value.trim()
      if (!instruction || busy.current || history.current.length >= CHAT_MAX_TURNS) return false
      const previous = history.current
      history.current = [...previous, { role: 'TEACHER', text: instruction }]
      setMessages(history.current)
      void run(instruction, previous)
      return true
    },
    /** Gửi lại đúng yêu cầu vừa lỗi (không thêm tin mới vào cuộc chat). */
    retry: () => {
      if (failed.current && !busy.current) void run(failed.current, history.current.slice(0, -1))
    },
  }
}
