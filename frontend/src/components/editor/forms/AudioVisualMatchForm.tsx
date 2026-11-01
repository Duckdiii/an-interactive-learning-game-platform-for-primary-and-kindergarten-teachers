import { viText } from '../../../constants/viText'
import type { AudioVisualMatchQuestion } from '../../../types/game-dsl.types'
import { QUESTION_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import { addDistractor, canAddDistractor, canRemoveDistractor, DISTRACTOR_LIMITS, hasImage, removeDistractor, setCorrectPrompt, setDistractorPrompt } from './avmEditing'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'
import { useStableKeys } from './useStableKeys'

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// Form sửa câu AUDIO_VISUAL_MATCH: lời đọc (bắt buộc, ở phần trường chung), mô tả hình ĐÚNG và 1 đến 3 mô tả hình SAI (mỗi mô tả 1 đến 100 ký tự, không trùng nhau
// hay trùng hình đúng). Đổi mô tả không xóa ảnh đang có của lựa chọn; chỉ nhắc (nằm trong gợi ý của ô nên trình đọc màn hình nghe được) ảnh có thể không khớp.
// Hình sai có KHÓA ỔN ĐỊNH riêng (như VisualClozeForm). Số hình sai để chặn Thêm/Xóa tính trên danh sách khóa MỚI NHẤT (không trên props cũ): bấm Thêm hai lần
// liền khi chưa vẽ lại không làm khóa lệch khỏi danh sách.
export default function AudioVisualMatchForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as AudioVisualMatchQuestion
  const distractorKeys = useStableKeys(question.distractors.length)
  const canAdd = canAddDistractor(question.distractors.length)
  const canRemove = canRemoveDistractor(question.distractors.length)
  const listError = fieldMessage(issues, 'distractors')
  const countHint = text.avmDistractorsHint.replace('{min}', String(DISTRACTOR_LIMITS.min)).replace('{max}', String(DISTRACTOR_LIMITS.max))
  const limitNote = !canAdd
    ? text.avmMaxDistractorsReached.replace('{max}', String(DISTRACTOR_LIMITS.max))
    : !canRemove
      ? text.avmMinDistractorsReached.replace('{min}', String(DISTRACTOR_LIMITS.min))
      : ''
  const describedBy = ['avm-distractors-hint', listError ? 'avm-distractors-error' : ''].filter(Boolean).join(' ')
  const indexOfKey = distractorKeys.indexOf

  const handleAdd = () => {
    // Đọc số lượng từ danh sách khóa mới nhất: nếu bản vá không thêm được thì khóa cũng không được thêm.
    if (!canAddDistractor(distractorKeys.count())) return

    const newIndex = distractorKeys.count()

    distractorKeys.append()
    onUpdate((current) => addDistractor(current as AudioVisualMatchQuestion))
    focusLater(`avm-distractor-${newIndex}`)
  }

  const handleRemove = (key: string) => {
    if (!canRemoveDistractor(distractorKeys.count())) return

    const index = indexOfKey(key)

    if (index < 0) return

    distractorKeys.remove(key)
    onUpdate((current) => removeDistractor(current as AudioVisualMatchQuestion, index))
    // Nút Xóa vừa bị gỡ khỏi trang: đưa tiêu điểm về hình kế cận để người dùng bàn phím không mất vị trí.
    focusLater(`avm-distractor-${Math.max(0, Math.min(index, distractorKeys.count() - 1))}`)
  }

  return (
    <div className="space-y-5">
      <CheckedTextField
        id="avm-correct"
        label={text.avmCorrectLabel}
        hint={hasImage(question.correct) ? `${text.avmCorrectHint} ${text.avmImageKept}` : text.avmCorrectHint}
        value={question.correct.visualPrompt}
        limits={QUESTION_LIMITS.visualPrompt}
        error={fieldMessage(issues, 'correct.visualPrompt')}
        onCommit={(value) => onUpdate((current) => setCorrectPrompt(current as AudioVisualMatchQuestion, value))}
      />

      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.avmDistractorsLegend}</legend>
        <p id="avm-distractors-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="space-y-3">
          {question.distractors.map((choice, index) => {
            const key = distractorKeys.keys[index] ?? `k${index}`

            return (
              <li key={key} className="rounded-xl border-2 border-ink/10 p-3">
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={!canRemove}
                    aria-describedby={canRemove ? undefined : 'avm-distractors-limit'}
                    aria-label={`${text.avmRemoveDistractor} ${index + 1}`}
                    onClick={() => handleRemove(key)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>
                <CheckedTextField
                  id={`avm-distractor-${index}`}
                  label={`${text.avmDistractorLabel} ${index + 1}`}
                  hint={hasImage(choice) ? text.avmImageKept : undefined}
                  value={choice.visualPrompt}
                  limits={QUESTION_LIMITS.visualPrompt}
                  error={fieldMessage(issues, `distractors[${index}].visualPrompt`)}
                  onCommit={(value) =>
                    onUpdate((current) => {
                      const position = indexOfKey(key)

                      return position < 0 ? current : setDistractorPrompt(current as AudioVisualMatchQuestion, position, value)
                    })
                  }
                />
              </li>
            )
          })}
        </ol>

        {listError ? (
          <p id="avm-distractors-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{listError}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} aria-describedby={canAdd ? undefined : 'avm-distractors-limit'} onClick={handleAdd}>
            {text.avmAddDistractor}
          </Button>
          <span id="avm-distractors-limit" className="text-sm text-ink-soft">
            {limitNote}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="avm" />
    </div>
  )
}
