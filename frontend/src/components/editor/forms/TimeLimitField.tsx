import { viText } from '../../../constants/viText'
import { QUESTION_LIMITS } from '../../../utils/questionSpecs'
import NumberField from './NumberField'

interface TimeLimitFieldProps {
  id: string
  value: number
  error?: string
  disabled?: boolean
  onCommit: (seconds: number) => void
}

// Thời gian trả lời của một câu (FLD-07): giới hạn và mặc định lấy từ bảng `questionSpecs`, dùng chung cho mọi loại game.
export default function TimeLimitField({ id, value, error, disabled, onCommit }: TimeLimitFieldProps) {
  const spec = QUESTION_LIMITS.timeLimitSeconds

  return (
    <NumberField
      id={id}
      label={viText.editor.form.timeLabel}
      value={value}
      limits={spec}
      defaultValue={spec.default}
      error={error}
      disabled={disabled}
      onCommit={onCommit}
    />
  )
}
