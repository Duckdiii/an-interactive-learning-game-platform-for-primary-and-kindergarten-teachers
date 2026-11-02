import { useState } from 'react'
import { viText } from '../../../constants/viText'
import type { VisualClozeQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import { addDistractor, canAddDistractor, canRemoveDistractor, hasBlank, insertBlank, removeDistractor, setCorrectAnswer, setDistractor, setSentence } from './clozeEditing'
import type { QuestionFormProps } from './formTypes'
import { cleanMessage, fieldMessage } from './issueText'
import { useStableKeys } from './useStableKeys'

const LIMITS = TYPE_LIMITS.VISUAL_CLOZE

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// Ghi giá trị vào ô như người dùng gõ (qua bộ cài `value` gốc rồi phát sự kiện `input`) để ô chữ có kiểm tra từ ngữ (CheckedTextField) coi đây là chữ vừa gõ
// và đi qua đúng đường kiểm tra và áp dụng của mọi lần gõ khác.
function typeInto(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set

  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

// Form sửa câu VISUAL_CLOZE: câu có ĐÚNG MỘT chỗ trống "___" (3 đến 200 ký tự, nút "Chèn chỗ trống" đặt chỗ trống vào vị trí con trỏ), từ đúng (1 đến 50 ký tự),
// 1 đến 3 từ nhiễu (1 đến 50 ký tự, không trùng từ đúng hay nhau) và mô tả hình (bắt buộc, ở phần trường chung). Từ nhiễu có KHÓA ỔN ĐỊNH riêng (như QuizForm) để chữ
// gõ dở và bản vá đang chờ tìm lại đúng từ khi thêm/xóa. Dùng được bằng bàn phím và ở màn hình hẹp (một cột).
export default function VisualClozeForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as VisualClozeQuestion
  const distractorKeys = useStableKeys(question.distractors.length)
  const canAdd = canAddDistractor(question)
  const canRemove = canRemoveDistractor(question)
  const sentenceError = issues
    .filter((issue) => issue.field === 'sentenceTemplate')
    .map((issue) => cleanMessage(issue.message))
    .join(' ')
  const listError = fieldMessage(issues, 'distractors')
  // Chữ vừa gõ có thể đã có chỗ trống dù bản đã áp thì chưa (đang chờ kiểm tra từ ngữ): bấm nút lúc đó cũng phải có phản hồi.
  const [typedHasBlank, setTypedHasBlank] = useState(false)
  const blankPresent = hasBlank(question.sentenceTemplate) || typedHasBlank
  const countHint = text.distractorsHint.replace('{min}', String(LIMITS.distractors.min)).replace('{max}', String(LIMITS.distractors.max))
  const limitNote = !canAdd
    ? text.maxDistractorsReached.replace('{max}', String(LIMITS.distractors.max))
    : !canRemove
      ? text.minDistractorsReached.replace('{min}', String(LIMITS.distractors.min))
      : ''
  const describedBy = ['cloze-distractors-hint', listError ? 'cloze-distractors-error' : ''].filter(Boolean).join(' ')
  const indexOfKey = distractorKeys.indexOf

  const handleInsertBlank = () => {
    const area = document.getElementById('cloze-sentence')

    if (!(area instanceof HTMLTextAreaElement)) return

    setTypedHasBlank(false)

    // Chữ vừa gõ có thể chưa vào game: tính trên nội dung đang hiện trong ô, không trên bản đã áp.
    const result = insertBlank(area.value, area.selectionStart ?? area.value.length, area.selectionEnd ?? area.value.length)

    if (!result) {
      setTypedHasBlank(true)
      area.focus()

      return
    }

    typeInto(area, result.text)
    area.focus()
    // Sau khi React vẽ lại ô: đặt con trỏ ngay sau chỗ trống vừa chèn.
    requestAnimationFrame(() => {
      const current = document.getElementById('cloze-sentence')

      if (current instanceof HTMLTextAreaElement) current.setSelectionRange(result.caret, result.caret)
    })
  }

  const handleAdd = () => {
    // Phòng thủ: nút đã khóa khi đủ số từ nhiễu nên thường không tới đây.
    if (!canAdd) return

    const newIndex = distractorKeys.count()

    distractorKeys.append()
    onUpdate((current) => addDistractor(current as VisualClozeQuestion))
    focusLater(`cloze-distractor-${newIndex}`)
  }

  const handleRemove = (key: string) => {
    // Phòng thủ (như nút Thêm): nút Xóa đã khóa khi chỉ còn số từ nhiễu tối thiểu.
    if (!canRemove) return

    const index = indexOfKey(key)

    if (index < 0) return

    distractorKeys.remove(key)
    onUpdate((current) => removeDistractor(current as VisualClozeQuestion, index))
    // Nút Xóa vừa bị gỡ khỏi trang: đưa tiêu điểm về từ kế cận để người dùng bàn phím không mất vị trí.
    focusLater(`cloze-distractor-${Math.max(0, Math.min(index, distractorKeys.count() - 1))}`)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <CheckedTextField
          id="cloze-sentence"
          label={text.clozeSentenceLabel}
          multiline
          hint={text.clozeSentenceHint}
          value={question.sentenceTemplate}
          limits={LIMITS.sentenceTemplate}
          error={sentenceError || undefined}
          onCommit={(value) => onUpdate((current) => setSentence(current as VisualClozeQuestion, value))}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={blankPresent} aria-describedby={blankPresent ? 'cloze-blank-note' : undefined} onClick={handleInsertBlank}>
            {text.insertBlank}
          </Button>
          <span id="cloze-blank-note" role="status" className="text-sm text-ink-soft">
            {blankPresent ? text.blankPresent : ''}
          </span>
        </div>
      </div>

      <CheckedTextField
        id="cloze-correct"
        label={text.clozeCorrectLabel}
        value={question.correctAnswer}
        limits={LIMITS.correctAnswer}
        error={fieldMessage(issues, 'correctAnswer')}
        onCommit={(value) => onUpdate((current) => setCorrectAnswer(current as VisualClozeQuestion, value))}
      />

      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.distractorsLegend}</legend>
        <p id="cloze-distractors-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="space-y-3">
          {question.distractors.map((word, index) => {
            const key = distractorKeys.keys[index] ?? `k${index}`

            return (
              <li key={key} className="rounded-xl border-2 border-ink/10 p-3">
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={!canRemove}
                    aria-describedby={canRemove ? undefined : 'cloze-distractors-limit'}
                    aria-label={`${text.removeDistractor} ${index + 1}`}
                    onClick={() => handleRemove(key)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>
                <CheckedTextField
                  id={`cloze-distractor-${index}`}
                  label={`${text.distractorLabel} ${index + 1}`}
                  value={word}
                  limits={LIMITS.distractorText}
                  error={fieldMessage(issues, `distractors[${index}]`)}
                  onCommit={(value) =>
                    onUpdate((current) => {
                      const position = indexOfKey(key)

                      return position < 0 ? current : setDistractor(current as VisualClozeQuestion, position, value)
                    })
                  }
                />
              </li>
            )
          })}
        </ol>

        {listError ? (
          <p id="cloze-distractors-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{listError}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} aria-describedby={canAdd ? undefined : 'cloze-distractors-limit'} onClick={handleAdd}>
            {text.addDistractor}
          </Button>
          <span id="cloze-distractors-limit" className="text-sm text-ink-soft">
            {limitNote}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="cloze" />
    </div>
  )
}
