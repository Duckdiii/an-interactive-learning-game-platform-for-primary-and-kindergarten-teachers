import { viText } from '../../constants/viText'
import type { GameMetadata } from '../../types/game-dsl.types'
import type { ValidationIssue } from '../../utils/gameValidation'
import FormField from '../ui/FormField'
import { describedBy, inputClass } from '../ui/formStyles'

interface GameInfoFormProps {
  metadata: GameMetadata
  issues: ReadonlyArray<ValidationIssue>
  // Đang hỏi khôi phục bản sao lưu: chưa cho sửa để không ghi đè lên bản đang chờ quyết định.
  disabled?: boolean
  onTitleChange: (title: string) => void
  onTopicChange: (topic: string) => void
}

// Lời nhắn của lỗi theo trường (bỏ tiền tố "Trò chơi: " vì đã nằm ngay dưới ô).
const errorOf = (issues: ReadonlyArray<ValidationIssue>, field: string) => {
  const message = issues
    .find((issue) => issue.questionIndex === null && issue.field === field)
    ?.message.replace(/^Trò chơi:\s*/, '')

  return message ? message.charAt(0).toUpperCase() + message.slice(1) : undefined
}

// Tên và chủ đề của trò chơi, hai trường sửa được ở bước này. Lỗi hiện ngay dưới ô sau lần bấm Lưu đầu tiên.
export default function GameInfoForm({ metadata, issues, disabled = false, onTitleChange, onTopicChange }: GameInfoFormProps) {
  const text = viText.editor
  const titleError = errorOf(issues, 'metadata.title')
  const topicError = errorOf(issues, 'metadata.topic')

  return (
    <section aria-labelledby="game-info-title" className="space-y-4 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <h2 id="game-info-title" className="text-lg font-extrabold">
        {text.infoHeading}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField id="game-title" label={text.titleLabel} required error={titleError}>
          <input
            id="game-title"
            type="text"
            value={metadata.title}
            disabled={disabled}
            onChange={(event) => onTitleChange(event.target.value)}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={describedBy('game-title', { error: Boolean(titleError) })}
            className={inputClass(Boolean(titleError))}
          />
        </FormField>
        <FormField id="game-topic" label={text.topicLabel} required error={topicError}>
          <input
            id="game-topic"
            type="text"
            value={metadata.topic}
            disabled={disabled}
            onChange={(event) => onTopicChange(event.target.value)}
            aria-invalid={topicError ? true : undefined}
            aria-describedby={describedBy('game-topic', { error: Boolean(topicError) })}
            className={inputClass(Boolean(topicError))}
          />
        </FormField>
      </div>
    </section>
  )
}
