import { useState } from 'react'
import { viText } from '../../../constants/viText'
import { useGameDefaults } from './GameDefaultsContext'
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
  const text = viText.editor.form
  const defaults = useGameDefaults()
  // Câu theo đúng mặc định của game thì thu gọn thành một dòng; "Đặt riêng" mở hai ô để ghi đè cho riêng câu này.
  const followsDefault = question.timeLimitSeconds === defaults.timeLimitSeconds && question.points === defaults.points
  const [own, setOwn] = useState(false)
  // Ô có lỗi thì luôn mở để lỗi hiện ngay dưới ô.
  const timingError = Boolean(fieldMessage(issues, 'timeLimitSeconds') || fieldMessage(issues, 'points'))

  return (
    <div className="space-y-4">
      <details
        className="group rounded-2xl border-2 border-brand/15 bg-surface shadow-xs transition hover:border-brand/30"
        open
      >
        <summary className="flex cursor-pointer select-none items-center justify-between p-4 font-bold text-ink">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-sm">
              🔊
            </span>
            <span className="text-base font-extrabold">Lời đọc & Giọng đọc AI</span>
          </div>
          <span className="text-xs text-ink-soft transition group-open:rotate-180">▼</span>
        </summary>
        <div className="space-y-4 border-t border-ink/5 p-4 pt-3">
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
        </div>
      </details>

      <details
        className="group rounded-2xl border-2 border-brand/15 bg-surface shadow-xs transition hover:border-brand/30"
        open
      >
        <summary className="flex cursor-pointer select-none items-center justify-between p-4 font-bold text-ink">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-sm">
              🖼️
            </span>
            <span className="text-base font-extrabold">Hình ảnh minh họa câu hỏi</span>
          </div>
          <span className="text-xs text-ink-soft transition group-open:rotate-180">▼</span>
        </summary>
        <div className="space-y-4 border-t border-ink/5 p-4 pt-3">
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
        </div>
      </details>

      <div className="rounded-2xl border-2 border-brand/15 bg-surface p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-sm">
            ⏱️
          </span>
          <h3 className="text-base font-extrabold text-ink">Thời gian trả lời & Điểm số</h3>
        </div>
        {followsDefault && !own && !timingError ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-paper px-4 py-2 text-base text-ink-soft">
            <span>
              <span className="font-bold text-ink">
                {text.timingSummary(question.timeLimitSeconds, question.points)}
              </span>{' '}
              {text.followsDefault}
            </span>
            <button
              type="button"
              onClick={() => {
                setOwn(true)
                requestAnimationFrame(() => document.getElementById(`${idPrefix}-time-limit`)?.focus())
              }}
              className="min-h-11 px-1 font-bold text-brand-strong underline">
              {text.setOwnTiming}
            </button>
          </p>
        ) : (
          <div className="space-y-2">
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
            {followsDefault || defaults.timeLimitSeconds === undefined || defaults.points === undefined ? null : (
              <button
                type="button"
                onClick={() => {
                  const { timeLimitSeconds, points } = defaults as Required<typeof defaults>

                  onUpdate((current) => setPoints(setTimeLimit(current, timeLimitSeconds), points))
                  setOwn(false)
                }}
                className="min-h-11 px-1 text-base font-bold text-brand-strong underline"
              >
                {text.backToDefault(defaults.timeLimitSeconds, defaults.points)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
