import { useCallback, useEffect, useRef, useState } from 'react'
import { CHAT_MAX_TURNS } from '../constants/aiLimits'
import { viText } from '../constants/viText'
import { understandGame } from '../services/understandingService'
import type { ChatTurn, ClarifyingQuestion, GameUnderstanding } from '../types/understanding.types'
import { parseApiError } from '../utils/apiError'

export interface RequestChatState {
  messages: ChatTurn[]
  understanding: GameUnderstanding | null
  question: ClarifyingQuestion | null
  pending: boolean
  error: string | null
}

const EMPTY: RequestChatState = { messages: [], understanding: null, question: null, pending: false, error: null }

/** Lời của trợ lý trong khung chat: lời đáp kèm câu hỏi lại (nếu có), để lịch sử gửi lên máy chủ có đủ ngữ cảnh. */
const assistantText = (reply: string, question: ClarifyingQuestion | null) => (question ? `${reply}\n${question.text}` : reply)

/**
 * Trạng thái khung chat tạo game: gửi lịch sử + thẻ hiện tại lên `POST /games/understand`, nhận lời đáp và thẻ mới. Gọi lỗi thì giữ tin của
 * giáo viên để bấm "Thử lại" gửi lại đúng lịch sử đó.
 */
export function useRequestChat(lesson: { subject: string; gradeLevel: string }) {
  const [state, setState] = useState<RequestChatState>(EMPTY)
  const controller = useRef<AbortController | null>(null)
  // Bản mới nhất cho send/retry (không đưa state vào deps để hàm giữ nguyên danh tính giữa các lần vẽ).
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
  }, [state])
  useEffect(() => () => controller.current?.abort(), [])

  const request = useCallback(
    async (messages: ChatTurn[], understanding: GameUnderstanding | null) => {
      controller.current?.abort()
      const current = new AbortController()
      controller.current = current
      // Gán ngay (không đợi effect) để lần send() bấm liền sau thấy pending và bị chặn, không gửi trùng.
      latest.current = { ...latest.current, messages, pending: true, error: null }
      setState((previous) => ({ ...previous, messages, pending: true, error: null }))

      try {
        const result = await understandGame(
          { subject: lesson.subject, gradeLevel: lesson.gradeLevel, messages, ...(understanding ? { understanding } : {}) },
          { signal: current.signal },
        )
        if (current.signal.aborted) return
        setState({
          messages: [...messages, { role: 'ASSISTANT', text: assistantText(result.reply, result.question) }],
          understanding: result.understanding,
          question: result.question,
          pending: false,
          error: null,
        })
      } catch (error) {
        if (current.signal.aborted) return
        setState((previous) => ({ ...previous, pending: false, error: parseApiError(error, viText.chat.errorFallback).message }))
      }
    },
    [lesson.subject, lesson.gradeLevel],
  )

  /** Gửi một tin của giáo viên. Trả false khi không gửi được (đang chờ, rỗng, hoặc hết lượt). */
  const send = useCallback(
    (text: string) => {
      const { messages, understanding, pending } = latest.current
      const trimmed = text.trim()
      if (pending || !trimmed || messages.length + 1 > CHAT_MAX_TURNS) return false
      void request([...messages, { role: 'TEACHER', text: trimmed }], understanding)
      return true
    },
    [request],
  )

  const retry = useCallback(() => {
    const { messages, understanding } = latest.current
    if (messages.at(-1)?.role === 'TEACHER') void request(messages, understanding)
  }, [request])

  /** Giáo viên tự sửa thẻ: lần gửi sau mang theo bản đã sửa để AI giữ nguyên. */
  const editCard = useCallback((next: GameUnderstanding) => setState((previous) => ({ ...previous, understanding: next })), [])

  const reset = useCallback(() => {
    controller.current?.abort()
    // Gán ngay để send() gọi liền sau reset() (bắt đầu cuộc chat mới) không mang theo lịch sử cũ.
    latest.current = EMPTY
    setState(EMPTY)
  }, [])

  const canSend = !state.pending && state.messages.length + 1 <= CHAT_MAX_TURNS

  return { ...state, canSend, send, retry, editCard, reset }
}
