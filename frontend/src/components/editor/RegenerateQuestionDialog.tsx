import { useEffect, useRef, useState } from 'react'
import { REGENERATE_FEEDBACK_MAX } from '../../constants/aiLimits'
import { viText } from '../../constants/viText'
import type { RegenerateFailure } from '../../utils/regenerateErrors'
import Button from '../Button'
import Dialog from '../ui/Dialog'
import Icon from '../ui/Icon'
import MockBadge from '../ui/MockBadge'
import { textareaClass } from '../ui/formStyles'
import OperationStatus from './forms/OperationStatus'

const text = viText.editor.regenerate
const FEEDBACK_ID = 'regenerate-feedback'
const CONFIRM_ID = 'regenerate-confirm'
const CLOSE_ID = 'regenerate-close'

interface RegenerateQuestionDialogProps {
  questionNumber: number
  working: boolean
  failure: RegenerateFailure | null
  // Kết quả do AI mô phỏng: gắn nhãn "Dữ liệu mô phỏng".
  mock: boolean
  // Giọng đọc đang chọn (chỉ hiện ở chế độ mô phỏng, vì yêu cầu thật chưa có trường giọng đọc), hoặc null để không hiện.
  voiceLabel: string | null
  onSubmit: (feedback: string) => void
  // Hủy yêu cầu đang chạy (hộp thoại vẫn mở).
  onCancelRequest: () => void
  onClose: () => void
}

// Lỗi mà giáo viên có thể bấm "Thử lại" ngay; 404 (chưa lưu) và 409 (có phòng chơi) phải xử lý chỗ khác trước nên chỉ còn nút Đóng.
const RETRYABLE: ReadonlyArray<RegenerateFailure['kind']> = ['busy', 'rateLimited', 'invalid', 'other']
const NOT_RETRYABLE: ReadonlyArray<RegenerateFailure['kind']> = ['notSaved', 'locked']

// Hộp thoại "Yêu cầu AI làm lại" (UC-06 bước 2, 3): nhập gợi ý điều chỉnh rồi "Xác nhận tạo lại". Các nhánh lỗi 5a, 5b hiện ngay trong hộp, câu cũ luôn giữ nguyên.
export default function RegenerateQuestionDialog({ questionNumber, working, failure, mock, voiceLabel, onSubmit, onCancelRequest, onClose }: RegenerateQuestionDialogProps) {
  const [feedback, setFeedback] = useState('')
  const size = [...feedback].length
  const tooLong = size > REGENERATE_FEEDBACK_MAX
  const retryable = failure !== null && RETRYABLE.includes(failure.kind)
  const blocked = failure !== null && NOT_RETRYABLE.includes(failure.kind)
  const errorId = `${FEEDBACK_ID}-error`
  const wasWorking = useRef(false)

  // Nội dung không an toàn (5a): đưa tiêu điểm về ô gợi ý để giáo viên sửa lại gợi ý ngay.
  const failureKind = failure?.kind

  useEffect(() => {
    if (failureKind === 'unsafe') document.getElementById(FEEDBACK_ID)?.focus()
  }, [failureKind])

  // Hủy yêu cầu (hoặc kết thúc) thì thanh tiến trình và nút Hủy biến mất: đưa tiêu điểm về nút xác nhận để người dùng bàn phím không bị rơi ra ngoài hộp.
  useEffect(() => {
    if (wasWorking.current && !working && failureKind !== 'unsafe') (document.getElementById(CONFIRM_ID) ?? document.getElementById(CLOSE_ID))?.focus()
    wasWorking.current = working
  }, [working, failureKind])

  const submit = () => {
    if (!working && !tooLong) onSubmit(feedback)
  }

  return (
    <Dialog title={`${text.dialogTitle} ${questionNumber}`} initialFocusId={FEEDBACK_ID} onEscape={working ? onCancelRequest : onClose}>
      <div className="mt-3 space-y-4">
        <div className="space-y-2 text-base text-ink-soft">
          <p>{text.intro}</p>
          <p>{text.replaces}</p>
          {voiceLabel ? (
            <p>
              {text.voiceLine}: <strong className="text-ink">{voiceLabel}</strong>
            </p>
          ) : null}
          {mock ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <MockBadge />
              <span>{text.mockNote}</span>
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={FEEDBACK_ID} className="text-base font-semibold text-ink">
              {text.feedbackLabel}
            </label>
            <span className={['text-sm', tooLong ? 'font-bold text-rose-800' : 'text-ink-soft'].join(' ')}>
              {size}/{REGENERATE_FEEDBACK_MAX} {viText.editor.form.characters}
            </span>
          </div>
          <p id={`${FEEDBACK_ID}-hint`} className="mt-1 text-sm text-ink-soft">
            {text.feedbackHint}
          </p>
          <textarea
            id={FEEDBACK_ID}
            rows={3}
            value={feedback}
            readOnly={working}
            onChange={(event) => setFeedback(event.target.value)}
            aria-invalid={tooLong || failure?.kind === 'unsafe' ? true : undefined}
            aria-describedby={[`${FEEDBACK_ID}-hint`, tooLong ? `${FEEDBACK_ID}-long` : '', failure ? errorId : ''].filter(Boolean).join(' ')}
            className={`mt-2 ${textareaClass(tooLong || failure?.kind === 'unsafe')}`}
          />
          {tooLong ? (
            <p id={`${FEEDBACK_ID}-long`} className="mt-2 flex items-start gap-2 text-sm font-semibold text-rose-800">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{text.tooLong.replace('{max}', String(REGENERATE_FEEDBACK_MAX))}</span>
            </p>
          ) : null}
        </div>

        {failure ? (
          <p id={errorId} role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-base font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{failure.message}</span>
          </p>
        ) : null}

        {working ? (
          <OperationStatus label={text.working} progress={null} cancelLabel={text.cancelRequest} onCancel={onCancelRequest} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {blocked ? null : (
              <Button id={CONFIRM_ID} type="button" onClick={submit} disabled={tooLong}>
                {retryable ? text.retry : text.confirm}
              </Button>
            )}
            <Button id={CLOSE_ID} type="button" variant="secondary" onClick={onClose}>
              {blocked ? text.close : text.cancel}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
