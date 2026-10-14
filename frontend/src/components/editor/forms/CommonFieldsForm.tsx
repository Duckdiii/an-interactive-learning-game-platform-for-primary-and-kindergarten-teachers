import { viText } from '../../../constants/viText'
import { validationText } from '../../../constants/validationText'
import type { GameType } from '../../../types/game-dsl.types'
import { REQUIRED_COMMON_FIELDS } from '../../../utils/gameValidation'
import { QUESTION_LIMITS } from '../../../utils/questionSpecs'
import { mediaToolsAvailable } from '../../../services/mediaService'
import CheckedTextField from './CheckedTextField'
import { setOptionalText, setPoints, setTimeLimit } from './commonEditing'
import type { QuestionFormProps } from './formTypes'
import ImageSuggestions from './ImageSuggestions'
import { fieldMessage } from './issueText'
import MediaField from './MediaField'
import NumberField from './NumberField'
import SpeechGenerator from './SpeechGenerator'
import TimeLimitField from './TimeLimitField'

type CommonFieldsFormProps = Pick<QuestionFormProps, 'question' | 'issues' | 'onUpdate'> & {
  gameType: GameType
  idPrefix: string
}

// Trường CHUNG của mọi loại game: lời đọc (audioText), mô tả hình ảnh (visualPrompt), thời gian trả lời (FLD-07) và điểm. Lời đọc và
// mô tả hình là tùy chọn, trừ loại game coi chúng là bắt buộc (bảng `REQUIRED_COMMON_FIELDS`). Mỗi trường chữ đi kèm ô tải tệp tương ứng
// (lời đọc -> âm thanh thuyết minh, mô tả hình -> ảnh minh họa), kèm công cụ gợi ý ảnh và tạo giọng đọc khi có (hiện chỉ ở chế độ mô phỏng).
export default function CommonFieldsForm({ question, issues, onUpdate, gameType, idPrefix }: CommonFieldsFormProps) {
  const required = REQUIRED_COMMON_FIELDS[gameType]
  const labels = validationText.labels
  const tools = mediaToolsAvailable()

  return (
    <div className="space-y-4">
      <CheckedTextField
        id={`${idPrefix}-audio-text`}
        label={labels.audioText}
        required={required.includes('audioText')}
        value={question.audioText ?? ''}
        limits={QUESTION_LIMITS.audioText}
        error={fieldMessage(issues, 'audioText')}
        onCommit={(value) => onUpdate((current) => setOptionalText(current, 'audioText', value))}
      />
      <MediaField
        kind="audio"
        idPrefix={idPrefix}
        url={question.audioUrl}
        onUpdate={onUpdate}
        tools={tools ? (api) => <SpeechGenerator idPrefix={idPrefix} audioText={question.audioText} tools={api} /> : undefined}
      />
      <CheckedTextField
        id={`${idPrefix}-visual-prompt`}
        label={labels.visualPrompt}
        required={required.includes('visualPrompt')}
        value={question.visualPrompt ?? ''}
        limits={QUESTION_LIMITS.visualPrompt}
        error={fieldMessage(issues, 'visualPrompt')}
        onCommit={(value) => onUpdate((current) => setOptionalText(current, 'visualPrompt', value))}
      />
      <MediaField
        kind="image"
        idPrefix={idPrefix}
        url={question.imageUrl}
        onUpdate={onUpdate}
        tools={tools ? (api) => <ImageSuggestions idPrefix={idPrefix} visualPrompt={question.visualPrompt} tools={api} /> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TimeLimitField
          id={`${idPrefix}-time-limit`}
          value={question.timeLimitSeconds}
          error={fieldMessage(issues, 'timeLimitSeconds')}
          onCommit={(seconds) => onUpdate((current) => setTimeLimit(current, seconds))}
        />
        <NumberField
          id={`${idPrefix}-points`}
          label={viText.editor.form.pointsLabel}
          value={question.points}
          limits={QUESTION_LIMITS.points}
          defaultValue={QUESTION_LIMITS.points.default}
          error={fieldMessage(issues, 'points')}
          onCommit={(points) => onUpdate((current) => setPoints(current, points))}
        />
      </div>
    </div>
  )
}
