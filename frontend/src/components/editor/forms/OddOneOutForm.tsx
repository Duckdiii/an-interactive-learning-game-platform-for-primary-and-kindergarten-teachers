import { viText } from '../../../constants/viText'
import type { OddOneOutQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'
import { addItem, canAddItem, canRemoveItem, oddIndexOf, positionId, removeItem, setItemText, setOddItem } from './oddOneOutEditing'
import { useStableKeys } from './useStableKeys'

const LIMITS = TYPE_LIMITS.ODD_ONE_OUT

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// Form sửa câu ODD_ONE_OUT: 3 đến 5 mục chữ (giới hạn DSL), không trùng nhau, và đúng MỘT mục khác loại (chọn bằng nút chọn một). Mã mục (a đến e) đổi theo
// vị trí khi thêm/xóa, nên mỗi mục có thêm một KHÓA ỔN ĐỊNH (chỉ nằm trong form này) làm `key` của React và để bản vá đang chờ tìm lại đúng mục (như QuizForm).
// Mọi lỗi hiện ngay dưới ô tương ứng; dùng được hoàn toàn bằng bàn phím và ở màn hình hẹp (một cột).
export default function OddOneOutForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as OddOneOutQuestion
  const itemKeys = useStableKeys(question.items.length)
  const oddIndex = oddIndexOf(question)
  const canAdd = canAddItem(question)
  const canRemove = canRemoveItem(question)
  const itemsError = fieldMessage(issues, 'items')
  const oddError = fieldMessage(issues, 'oddOneOutId')
  const countHint = text.oddItemsHint.replace('{min}', String(LIMITS.items.min)).replace('{max}', String(LIMITS.items.max))
  const limitNote = !canAdd
    ? text.maxItemsReached.replace('{max}', String(LIMITS.items.max))
    : !canRemove
      ? text.minItemsReached.replace('{min}', String(LIMITS.items.min))
      : ''
  const describedBy = ['odd-items-hint', oddError ? 'odd-choice-error' : '', itemsError ? 'odd-items-error' : ''].filter(Boolean).join(' ')

  // Vị trí HIỆN TẠI của mục có khóa `key` (tính lúc bản vá chạy, không phải lúc bấm); -1 nếu mục đã bị xóa.
  const indexOfKey = itemKeys.indexOf

  const handleAdd = () => {
    // Phòng thủ: nút đã khóa khi đủ số mục nên thường không tới đây; giữ để không cấp khóa và đưa tiêu điểm vào ô không tồn tại.
    if (!canAdd) return

    const newIndex = itemKeys.count()

    itemKeys.append()
    onUpdate((current) => addItem(current as OddOneOutQuestion))
    focusLater(`odd-item-${newIndex}`)
  }

  const handleRemove = (key: string) => {
    // Phòng thủ (như nút Thêm): nút Xóa đã khóa khi chỉ còn số mục tối thiểu.
    if (!canRemove) return

    const index = indexOfKey(key)

    if (index < 0) return

    itemKeys.remove(key)
    onUpdate((current) => removeItem(current as OddOneOutQuestion, index))
    // Nút Xóa vừa bị gỡ khỏi trang: đưa tiêu điểm về mục kế cận để người dùng bàn phím không mất vị trí.
    focusLater(`odd-item-${Math.max(0, Math.min(index, itemKeys.count() - 1))}`)
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.oddItemsLegend}</legend>
        <p id="odd-items-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="space-y-3">
          {question.items.map((item, index) => {
            const key = itemKeys.keys[index] ?? item.id
            const letter = positionId(index).toUpperCase()

            return (
              <li key={key} className="rounded-xl border-2 border-ink/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="odd-one-out-choice"
                      checked={index === oddIndex}
                      onChange={() =>
                        onUpdate((current) => {
                          const position = indexOfKey(key)

                          return position < 0 ? current : setOddItem(current as OddOneOutQuestion, position)
                        })
                      }
                      className="h-6 w-6 accent-[var(--color-brand)]"
                    />
                    <span>{text.oddChoice}</span>
                    <span className="sr-only">{`${text.itemLabel} ${letter}`}</span>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={!canRemove}
                    aria-describedby={canRemove ? undefined : 'odd-items-limit'}
                    aria-label={`${text.removeItem} ${letter}`}
                    onClick={() => handleRemove(key)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>
                <CheckedTextField
                  id={`odd-item-${index}`}
                  label={`${text.itemLabel} ${letter}`}
                  value={item.text}
                  limits={LIMITS.itemText}
                  error={fieldMessage(issues, `items[${index}].text`)}
                  onCommit={(value) =>
                    onUpdate((current) => {
                      const position = indexOfKey(key)

                      return position < 0 ? current : setItemText(current as OddOneOutQuestion, position, value)
                    })
                  }
                />
              </li>
            )
          })}
        </ol>

        {oddError ? (
          <p id="odd-choice-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{oddError}</span>
          </p>
        ) : null}
        {itemsError ? (
          <p id="odd-items-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{itemsError}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} aria-describedby={canAdd ? undefined : 'odd-items-limit'} onClick={handleAdd}>
            {text.addItem}
          </Button>
          <span id="odd-items-limit" className="text-sm text-ink-soft">
            {limitNote}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="odd" />
    </div>
  )
}
