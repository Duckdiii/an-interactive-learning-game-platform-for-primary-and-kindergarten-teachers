import { useId, useState } from 'react'
import { isMock } from '../../../config/mockMode'
import { viText } from '../../../constants/viText'
import type { ApplyRegeneratedResult } from '../../../hooks/useGameEditor'
import { useRegenerateQuestion } from '../../../hooks/useRegenerateQuestion'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import { buttonClass } from '../../buttonStyles'
import RegenerateQuestionDialog from '../RegenerateQuestionDialog'
import { usePendingEdits } from './PendingEditsContext'
import { useVoicePreference } from './VoiceContext'

const text = viText.editor.regenerate
const media = viText.editor.media

interface RegenerateQuestionControlsProps {
  gameId: string
  gameType: GameType
  index: number
  questionId: string
  // Câu này đã có trên máy chủ chưa: endpoint chỉ biết bản đã lưu, câu chưa lưu sẽ bị 404 nên khóa nút và nhắc "Hãy lưu trước".
  saved: boolean
  // Còn bản sao lưu đang chờ hỏi khôi phục: khôi phục sẽ thay cả bản nháp và làm mất kết quả AI vừa áp, nên chờ giáo viên chọn xong.
  restorePending: boolean
  getQuestion: (index: number, questionId: string) => QuestionDsl | undefined
  applyRegenerated: (index: number, questionId: string, question: QuestionDsl) => ApplyRegeneratedResult
  // Đã đưa câu mới vào bản đang soạn (cha hiện thông báo thành công và nút Hoàn tác, vì thẻ sửa câu được dựng lại sau khi áp).
  onApplied: (questionId: string) => void
}

// Nút "Yêu cầu AI làm lại" trên thẻ câu kèm hộp thoại. Dùng `aria-disabled` thay vì `disabled` để người dùng bàn phím và trình đọc màn hình vẫn tới được nút
// và nghe được LÝ DO vì sao chưa bấm được (chữ nằm ngay dưới nút, nối vào nút bằng `aria-describedby`).
export default function RegenerateQuestionControls({ gameId, gameType, index, questionId, saved, restorePending, getQuestion, applyRegenerated, onApplied }: RegenerateQuestionControlsProps) {
  const [open, setOpen] = useState(false)
  const { voice } = useVoicePreference()
  const { pending } = usePendingEdits()
  const hintId = useId()
  const regenerating = useRegenerateQuestion({ gameId, gameType, voice, getQuestion, applyRegenerated })
  const mock = isMock('ai')
  // Còn chữ vừa gõ chưa vào bản đang soạn thì AI sẽ làm lại trên câu cũ: đợi áp xong.
  // (Khóa của chính lần AI đang chạy không tính: lúc đó hộp thoại đang mở và nút nằm phía sau.)
  const hint = !saved ? text.saveFirstHint : restorePending ? text.restoreFirstHint : pending && !regenerating.working ? text.applyingHint : null
  const blocked = hint !== null

  const submit = async (feedback: string) => {
    const outcome = await regenerating.regenerate(index, questionId, feedback)

    if (outcome !== 'applied') return

    setOpen(false)
    onApplied(questionId)
  }

  const close = () => {
    regenerating.clearFailure()
    setOpen(false)
  }

  return (
    <div className="max-w-xs text-right">
      <button
        type="button"
        id="regenerate-question-button"
        aria-disabled={blocked ? true : undefined}
        aria-describedby={blocked ? hintId : undefined}
        title={!saved ? text.saveFirst : undefined}
        onClick={() => {
          if (!blocked) setOpen(true)
        }}
        className={[buttonClass('secondary'), blocked ? 'cursor-not-allowed opacity-60' : ''].filter(Boolean).join(' ')}
      >
        {text.button}
      </button>
      {blocked ? (
        <p id={hintId} className="mt-1 text-sm text-ink-soft">
          {!saved ? <strong className="text-ink">{text.saveFirst}. </strong> : null}
          {hint}
        </p>
      ) : null}

      {open ? (
        <RegenerateQuestionDialog
          questionNumber={index + 1}
          working={regenerating.working}
          failure={regenerating.failure}
          mock={mock}
          voiceLabel={mock ? (voice === 'FEMALE' ? media.voiceFemale : media.voiceMale) : null}
          onSubmit={(feedback) => void submit(feedback)}
          onCancelRequest={regenerating.cancel}
          onClose={close}
        />
      ) : null}
    </div>
  )
}
