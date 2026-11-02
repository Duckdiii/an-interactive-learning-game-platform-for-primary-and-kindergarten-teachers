import { useCallback, useRef, useState } from 'react'
import { regenerateQuestion } from '../services/aiService'
import type { VoiceGender } from '../services/mediaService'
import type { GameType, QuestionDsl } from '../types/game-dsl.types'
import { viText } from '../constants/viText'
import { describeRegenerateError } from '../utils/regenerateErrors'
import type { RegenerateFailure, RegenerateFailureKind } from '../utils/regenerateErrors'
import type { ApplyRegeneratedResult } from './useGameEditor'
import { useCancellableOperation } from './useCancellableOperation'

export type RegenerateOutcome = 'applied' | 'failed' | 'canceled'

interface Options {
  gameId: string
  gameType: GameType
  voice: VoiceGender
  // Câu HIỆN HÀNH của thẻ (từ bản đang soạn), hoặc undefined nếu thẻ không còn.
  getQuestion: (index: number, questionId: string) => QuestionDsl | undefined
  // Đưa câu mới vào bản đang soạn (xem `useGameEditor.applyRegenerated`): tự kiểm tra, không hợp lệ thì không áp.
  applyRegenerated: (index: number, questionId: string, question: QuestionDsl) => ApplyRegeneratedResult
}

const text = viText.editor.regenerate

/**
 * UC-06: yêu cầu AI làm lại MỘT câu. Gửi yêu cầu (hủy được, khóa Lưu/Chơi thử trong lúc chờ), rồi đưa câu mới vào bản đang soạn bằng
 * `applyRegenerated` (bản vá trên trạng thái hiện hành). Mọi nhánh lỗi, hủy và kết quả không hợp lệ đều KHÔNG đụng tới câu cũ.
 * Không tự thử lại: Backend đã thử lại tối đa 2 lần; lỗi thì giao diện cho giáo viên bấm "Thử lại" (gọi `regenerate` lần nữa).
 */
export function useRegenerateQuestion({ gameId, gameType, voice, getQuestion, applyRegenerated }: Options) {
  const op = useCancellableOperation()
  const [rejected, setRejected] = useState<RegenerateFailure | null>(null)
  const canceledRef = useRef(false)
  const { run, cancel: cancelOperation, clearError } = op

  const regenerate = useCallback(
    async (index: number, questionId: string, feedback: string): Promise<RegenerateOutcome> => {
      const current = getQuestion(index, questionId)

      canceledRef.current = false
      setRejected(null)

      if (!current) {
        setRejected({ kind: 'other', message: text.fallback })

        return 'failed'
      }

      const result = await run(({ signal }) => regenerateQuestion({ gameId, questionId, gameType, current, feedback, voice }, { signal }), {
        describeError: describeRegenerateError,
      })

      if (!result) return canceledRef.current ? 'canceled' : 'failed'

      // Câu AI trả về phải đúng thẻ và đúng loại game: nếu không thì không tin.
      if (result.gameType !== gameType || result.question.id !== questionId) {
        setRejected({ kind: 'invalid', message: text.invalidResult })

        return 'failed'
      }

      const applied = applyRegenerated(index, questionId, result.question)

      if (!applied.ok) {
        setRejected(applied.reason === 'invalid' ? { kind: 'invalid', message: text.invalidResult } : { kind: 'other', message: text.fallback })

        return 'failed'
      }

      return 'applied'
    },
    [applyRegenerated, gameId, gameType, getQuestion, run, voice],
  )

  const cancel = useCallback(() => {
    canceledRef.current = true
    cancelOperation()
  }, [cancelOperation])

  const clearFailure = useCallback(() => {
    setRejected(null)
    clearError()
  }, [clearError])

  const failure: RegenerateFailure | null =
    rejected ?? (op.state.status === 'error' ? { kind: (op.state.kind ?? 'other') as RegenerateFailureKind, message: op.state.message } : null)

  return { working: op.busy, failure, regenerate, cancel, clearFailure }
}
