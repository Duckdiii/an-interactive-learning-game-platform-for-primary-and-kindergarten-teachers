import { useState } from 'react'
import { gameTypeLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import type { GameUnderstanding } from '../../types/understanding.types'
import Button from '../Button'
import Icon from '../ui/Icon'
import { inputClass, textareaClass } from '../ui/formStyles'

interface UnderstandingCardProps {
  understanding: GameUnderstanding | null
  pending: boolean
  // Trợ lý còn câu hỏi chưa được trả lời: chưa cho tạo game để thẻ không thiếu thông tin.
  awaitingAnswer: boolean
  onChange: (next: GameUnderstanding) => void
  onConfirm: () => void
}

const text = viText.chat.card

type TextField = 'learningGoal' | 'childAction' | 'setting'

interface CardFieldProps {
  id: string
  label: string
  value: string
  disabled: boolean
  multiline?: boolean
  hint?: string
  onCommit: (next: string) => void
}

/**
 * Ô chữ của thẻ: sửa tại chỗ, chỉ báo lên khi rời ô để mỗi phím gõ không làm vẽ lại cả thẻ. Nơi dùng đặt `key={value}` nên thẻ mới từ trợ
 * lý dựng lại ô với giá trị mới (không cần đồng bộ bản nháp bằng effect).
 */
function CardField({ id, label, value, disabled, multiline = false, hint, onCommit }: CardFieldProps) {
  const [draft, setDraft] = useState(value)
  const common = {
    id,
    value: draft,
    disabled,
    'aria-describedby': hint ? `${id}-hint` : undefined,
    onBlur: () => draft !== value && onCommit(draft),
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-bold text-ink-soft">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={4} onChange={(event) => setDraft(event.target.value)} className={textareaClass(false)} />
      ) : (
        <input {...common} maxLength={200} onChange={(event) => setDraft(event.target.value)} className={inputClass()} />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const toLines = (text: string) =>
  text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20).map((line) => line.slice(0, 100))

// Thẻ "Hệ thống hiểu như sau" (cột phải): giáo viên sửa thẳng từng dòng, chọn kiểu chơi, xem phần chưa làm được rồi bấm tạo game.
export default function UnderstandingCard({ understanding, pending, awaitingAnswer, onChange, onConfirm }: UnderstandingCardProps) {
  if (!understanding) {
    return (
      <section aria-labelledby="understanding-title" className="space-y-3 rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="understanding-title" className="font-display text-xl font-extrabold">
          {text.title}
        </h2>
        <p className="text-base text-ink-soft">{pending ? text.waiting : text.empty}</p>
      </section>
    )
  }

  const card = understanding
  const options = [...new Set([card.gameType, ...card.alternativeGameTypes])]
  const setField = (field: TextField, value: string) => onChange({ ...card, [field]: value.trim() })
  const contentValue = card.content.join('\n')
  const chooseType = (type: string) =>
    onChange({ ...card, gameType: type, alternativeGameTypes: options.filter((option) => option !== type) })

  return (
    <section aria-labelledby="understanding-title" className="space-y-4 rounded-3xl border-2 border-brand/30 bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="understanding-title" className="font-display text-xl font-extrabold">
        {text.title}
      </h2>

      <CardField key={`goal:${card.learningGoal}`} id="card-goal" label={text.learningGoal} value={card.learningGoal} disabled={pending}
        onCommit={(value) => setField('learningGoal', value)} />
      <CardField key={`action:${card.childAction}`} id="card-action" label={text.childAction} value={card.childAction} disabled={pending}
        onCommit={(value) => setField('childAction', value)} />
      <CardField key={`content:${contentValue}`} id="card-content" label={text.content} value={contentValue} disabled={pending} multiline
        hint={text.contentHint} onCommit={(value) => onChange({ ...card, content: toLines(value) })} />
      <CardField key={`setting:${card.setting}`} id="card-setting" label={text.setting} value={card.setting} disabled={pending}
        onCommit={(value) => setField('setting', value)} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-ink-soft">{text.gameType}</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={type === card.gameType}
              disabled={pending}
              onClick={() => chooseType(type)}
              className={[
                'min-h-11 rounded-xl border-2 px-3 text-base font-bold',
                type === card.gameType ? 'border-brand bg-brand-soft text-brand-strong' : 'border-ink/20 bg-surface text-ink',
              ].join(' ')}
            >
              {type === 'CUSTOM' ? text.customLabel : gameTypeLabel(type)}
            </button>
          ))}
        </div>
      </fieldset>

      {card.unsupported.length > 0 ? (
        <div className="space-y-2 rounded-2xl bg-sun-soft p-3">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {text.unsupported}
          </p>
          <ul className="space-y-1 text-sm">
            {card.unsupported.map((item, index) => (
              <li key={`${index}-${item.need}`}>
                <span className="font-semibold">{item.need}</span> → {item.fallback}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {card.assumptions.length > 0 ? (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-bold text-ink-soft">
            <Icon name="info" className="h-4 w-4 shrink-0" />
            {text.assumptions}
          </p>
          <ul className="list-disc space-y-0.5 pl-6 text-sm text-ink-soft">
            {card.assumptions.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {awaitingAnswer && !pending ? (
        <p id="card-confirm-hint" className="text-sm text-ink-soft">
          {text.answerFirst}
        </p>
      ) : null}
      <Button
        type="button"
        size="lg"
        fullWidth
        disabled={pending || awaitingAnswer}
        aria-describedby={awaitingAnswer && !pending ? "card-confirm-hint" : undefined}
        onClick={onConfirm}
        className="gap-2"
      >
        <Icon name="check" />
        {text.confirm}
      </Button>
    </section>
  )
}
