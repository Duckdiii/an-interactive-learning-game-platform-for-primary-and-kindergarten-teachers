import { useRef, useState } from 'react'
import { isMock } from '../../../config/mockMode'
import { viText } from '../../../constants/viText'
import type { QuizQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import MockBadge from '../../ui/MockBadge'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'
import { addOption, canAddOption, canRemoveOption, correctIndexOf, positionId, removeOption, setCorrectOption, setOptionText, setQuestionText } from './quizEditing'

const LIMITS = TYPE_LIMITS.QUIZ

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// Form sửa câu QUIZ (FLD-05 nội dung, FLD-06 đáp án, FLD-07 thời gian). Giới hạn và nhãn lấy từ bảng `questionSpecs` và
// `validationText`; mọi lỗi hiện trực tiếp ngay dưới ô tương ứng. Không thể có dưới 2 hay quá 4 đáp án (nút bị khóa kèm lời giải thích).
//
// Mã đáp án (a, b, c, d) đổi theo vị trí khi thêm/xóa, nên mỗi đáp án có thêm MỘT KHÓA ỔN ĐỊNH (chỉ nằm trong form này): dùng làm
// `key` của React để chữ đang gõ dở đi theo đúng đáp án, và để các bản vá đang chờ (kết quả kiểm tra từ ngữ về muộn) tìm lại đúng
// đáp án theo khóa thay vì theo vị trí đã cũ.
export default function QuizForm({ question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as QuizQuestion
  const [keys, setKeys] = useState(() => question.options.map((_, index) => `k${index}`))
  const keysRef = useRef(keys)
  const nextKey = useRef(question.options.length)
  const correctIndex = correctIndexOf(question)
  const canAdd = canAddOption(question)
  const canRemove = canRemoveOption(question)
  const optionsError = fieldMessage(issues, 'options')
  const correctError = fieldMessage(issues, 'correctOptionId')
  const countHint = text.optionsHint.replace('{min}', String(LIMITS.options.min)).replace('{max}', String(LIMITS.options.max))
  const limitNote = !canAdd
    ? text.maxOptionsReached.replace('{max}', String(LIMITS.options.max))
    : !canRemove
      ? text.minOptionsReached.replace('{min}', String(LIMITS.options.min))
      : ''
  const describedBy = ['quiz-options-hint', correctError ? 'quiz-correct-error' : '', optionsError ? 'quiz-options-error' : ''].filter(Boolean).join(' ')

  const updateKeys = (next: string[]) => {
    keysRef.current = next
    setKeys(next)
  }

  // Vị trí HIỆN TẠI của đáp án có khóa `key` (tính lúc bản vá chạy, không phải lúc bấm); -1 nếu đáp án đã bị xóa.
  const indexOfKey = (key: string) => keysRef.current.indexOf(key)

  const handleAdd = () => {
    const newIndex = keysRef.current.length

    updateKeys([...keysRef.current, `k${nextKey.current++}`])
    onUpdate((current) => addOption(current as QuizQuestion))
    focusLater(`quiz-option-${newIndex}`)
  }

  const handleRemove = (key: string) => {
    const index = indexOfKey(key)

    if (index < 0) return

    updateKeys(keysRef.current.filter((item) => item !== key))
    onUpdate((current) => removeOption(current as QuizQuestion, index))
    // Nút Xóa vừa bị gỡ khỏi trang: đưa tiêu điểm về đáp án kế cận để người dùng bàn phím không mất vị trí.
    focusLater(`quiz-option-${Math.max(0, Math.min(index, keysRef.current.length - 1))}`)
  }

  return (
    <div className="space-y-5">
      {isMock('editor') ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>{text.safetyNote}</span>
          <MockBadge />
        </p>
      ) : null}

      <CheckedTextField
        id="quiz-question-text"
        label={text.questionTextLabel}
        multiline
        value={question.questionText}
        limits={LIMITS.questionText}
        error={fieldMessage(issues, 'questionText')}
        onCommit={(value) => onUpdate((current) => setQuestionText(current as QuizQuestion, value))}
      />

      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.optionsLegend}</legend>
        <p id="quiz-options-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="space-y-3">
          {question.options.map((option, index) => {
            const key = keys[index] ?? option.id
            const letter = positionId(index).toUpperCase()

            return (
              <li key={key} className="rounded-xl border-2 border-ink/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="quiz-correct-option"
                      checked={index === correctIndex}
                      onChange={() =>
                        onUpdate((current) => {
                          const position = indexOfKey(key)

                          return position < 0 ? current : setCorrectOption(current as QuizQuestion, position)
                        })
                      }
                      className="h-6 w-6 accent-[var(--color-brand)]"
                    />
                    <span>{text.correctChoice}</span>
                    <span className="sr-only">{`${text.optionLabel} ${letter}`}</span>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={!canRemove}
                    aria-describedby={canRemove ? undefined : 'quiz-options-limit'}
                    aria-label={`${text.removeOption} ${letter}`}
                    onClick={() => handleRemove(key)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>
                <CheckedTextField
                  id={`quiz-option-${index}`}
                  label={`${text.optionLabel} ${letter}`}
                  value={option.text}
                  limits={LIMITS.optionText}
                  error={fieldMessage(issues, `options[${index}].text`)}
                  onCommit={(value) =>
                    onUpdate((current) => {
                      const position = indexOfKey(key)

                      return position < 0 ? current : setOptionText(current as QuizQuestion, position, value)
                    })
                  }
                />
              </li>
            )
          })}
        </ol>

        {correctError ? (
          <p id="quiz-correct-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{correctError}</span>
          </p>
        ) : null}
        {optionsError ? (
          <p id="quiz-options-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{optionsError}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} aria-describedby={canAdd ? undefined : 'quiz-options-limit'} onClick={handleAdd}>
            {text.addOption}
          </Button>
          <span id="quiz-options-limit" className="text-sm text-ink-soft">
            {limitNote}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm question={question} issues={issues} onUpdate={onUpdate} idPrefix="quiz" />
    </div>
  )
}
