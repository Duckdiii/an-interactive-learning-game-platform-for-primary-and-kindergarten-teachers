import { useRef, useState } from 'react'
import { viText } from '../../../constants/viText'
import type { MemoryCardQuestion, MemoryPair } from '../../../types/game-dsl.types'
import { QUESTION_LIMITS, TYPE_LIMITS } from '../../../utils/questionSpecs'
import { resolveAssetUrl } from '../../../utils/assetResolver'
import { cardStyleOf } from '../../../utils/presentation'
import { usePresentation } from '../../../player/theme/PresentationContext'
import MemoryCardFaces from '../../../player/renderers/MemoryCardFaces'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { cleanMessage, fieldMessage } from './issueText'
import { firstUnusedPairNumber } from './matchingEditing'
import { addPair, canAddPair, canRemovePair, removePairById, setContentFieldById } from './memoryEditing'

const LIMITS = TYPE_LIMITS.MEMORY_CARD

const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// Tiền tố id của các ô trong một cặp, theo MÃ CẶP (không theo vị trí) để tiêu điểm sau thêm/xóa tìm đúng ô.
const idPrefix = (pairId: string) => `memory-${pairId}`

// Form sửa câu MEMORY_CARD: 2 đến 8 cặp thẻ (giới hạn DSL), mỗi cặp là HAI thẻ giống nhau nên chỉ có một mặt thẻ: CHỮ hoặc MÔ TẢ HÌNH (cần ít nhất
// một), không trùng với cặp khác. Cùng cách làm với MatchingForm: bản vá áp lên câu HIỆN HÀNH, cặp nhận diện bằng MÃ CẶP (vừa là `key` vừa là cách
// bản vá tìm lại cặp), mã mới tăng dần và không dùng lại trong phiên. Dùng được hoàn toàn bằng bàn phím và ở màn hình hẹp (một cột).
export default function MemoryCardForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as MemoryCardQuestion
  const nextNumber = useRef(firstUnusedPairNumber(question.pairs))
  const canAdd = canAddPair(question)
  const canRemove = canRemovePair(question)
  // Lỗi cấp danh sách (số cặp, mã cặp, nội dung trùng nhau...) có thể có nhiều dòng.
  const listMessages = issues.filter((issue) => issue.field === 'pairs').map((issue) => cleanMessage(issue.message))
  const countHint = text.memoryPairsHint.replace('{min}', String(LIMITS.pairs.min)).replace('{max}', String(LIMITS.pairs.max))
  const limitNote = !canAdd
    ? text.maxPairsReached.replace('{max}', String(LIMITS.pairs.max))
    : !canRemove
      ? text.minPairsReached.replace('{min}', String(LIMITS.pairs.min))
      : ''
  const describedBy = ['memory-pairs-hint', listMessages.length > 0 ? 'memory-pairs-errors' : ''].filter(Boolean).join(' ')

  const handleAdd = () => {
    // Phòng thủ: nút đã bị khóa khi đủ số cặp nên thường không tới đây; giữ để không cấp mã cặp và đưa tiêu điểm vào ô không tồn tại nếu sau này đổi cách khóa nút.
    if (!canAdd) return

    const pairId = `p${nextNumber.current++}`

    onUpdate((current) => addPair(current as MemoryCardQuestion, pairId))
    focusLater(`${idPrefix(pairId)}-text`)
  }

  const handleRemove = (pairId: string) => {
    // Phòng thủ (như nút Thêm): nút Xóa đã khóa khi chỉ còn số cặp tối thiểu.
    if (!canRemove) return

    const index = question.pairs.findIndex((pair) => pair.pairId === pairId)
    const neighbour = question.pairs[index + 1] ?? question.pairs[index - 1]

    onUpdate((current) => removePairById(current as MemoryCardQuestion, pairId))
    // Nút Xóa vừa bị gỡ khỏi trang: đưa tiêu điểm về cặp kế cận để người dùng bàn phím không mất vị trí.
    if (neighbour) focusLater(`${idPrefix(neighbour.pairId)}-text`)
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.memoryPairsLegend}</legend>
        <p id="memory-pairs-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {question.pairs.map((pair, index) => (
            <li key={pair.pairId}>
              <fieldset className="rounded-2xl border-2 border-brand/20 bg-surface p-4 shadow-xs transition hover:border-brand/40">
                <legend className="px-2 text-base font-extrabold text-ink">
                  {text.pairLabel} {index + 1}
                </legend>
                <div className="mb-3 -mt-2 flex items-center justify-between border-b border-ink/5 pb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink-soft">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-xs font-black text-brand-strong">
                      {index + 1}
                    </span>
                    <span>Cặp thẻ nhớ #{index + 1}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 h-8 w-8 !p-0 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                    disabled={!canRemove}
                    aria-describedby={canRemove ? undefined : 'memory-pairs-limit'}
                    aria-label={`${text.removePair} ${index + 1}`}
                    onClick={() => handleRemove(pair.pairId)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>
                <CardFields
                  pair={pair}
                  index={index}
                  issues={issues}
                  onCommit={(field, value) => onUpdate((current) => setContentFieldById(current as MemoryCardQuestion, pair.pairId, field, value))}
                />
              </fieldset>
            </li>
          ))}
        </ol>

        {listMessages.length > 0 ? (
          <ul id="memory-pairs-errors" className="space-y-1">
            {listMessages.map((message, position) => (
              <li key={`${position}-${message}`} className="flex items-start gap-2 text-sm font-semibold text-rose-800">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} aria-describedby={canAdd ? undefined : 'memory-pairs-limit'} onClick={handleAdd}>
            {text.addPair}
          </Button>
          <span id="memory-pairs-limit" className="text-sm text-ink-soft">
            {limitNote}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="memory" />
    </div>
  )
}

interface CardFieldsProps {
  pair: MemoryPair
  index: number
  issues: QuestionFormProps['issues']
  onCommit: (field: 'text' | 'visualPrompt', value: string) => void
}

// Mặt thẻ của một cặp: chữ HOẶC mô tả hình (cần ít nhất một). Lỗi "cần chữ hoặc mô tả hình" hiện ngay dưới tiêu đề và cả hai ô được đánh dấu
// không hợp lệ (aria-invalid) để trình đọc màn hình biết ô nào cần điền.
function CardFields({ pair, index, issues, onCommit }: CardFieldsProps) {
  const text = viText.editor.form
  const base = `pairs[${index}].content`
  const needError = fieldMessage(issues, base)
  const prefix = idPrefix(pair.pairId)
  const assetUrl = pair.content.imageUrl || resolveAssetUrl(pair.content.text, pair.content.visualPrompt)
  const cardStyle = cardStyleOf(usePresentation()?.world)
  // Thẻ mẫu mở sẵn mặt ngửa; giáo viên bấm để xem mặt úp như bé thấy khi bắt đầu.
  const [faceUp, setFaceUp] = useState(true)
  const hasFace = Boolean(pair.content.text || assetUrl)

  return (
    <fieldset
      className="space-y-3 rounded-xl border border-purple-200/70 bg-purple-50/25 p-3.5 transition"
      aria-describedby={needError ? `${prefix}-need` : undefined}
    >
      <legend className="px-1 text-sm font-bold text-ink flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-purple-500" />
        <span>{text.cardFace}</span>
      </legend>
      {needError ? (
        <p id={`${prefix}-need`} className="flex items-start gap-2 text-sm font-semibold text-rose-800">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{needError}</span>
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckedTextField
          id={`${prefix}-text`}
          label={`${text.cardTextLabel} (${text.pairLabel.toLowerCase()} ${index + 1})`}
          required={false}
          invalid={Boolean(needError)}
          value={pair.content.text ?? ''}
          limits={LIMITS.sideText}
          error={fieldMessage(issues, `${base}.text`)}
          onCommit={(next) => onCommit('text', next)}
        />
        <CheckedTextField
          id={`${prefix}-image`}
          label={`${text.cardImageLabel} (${text.pairLabel.toLowerCase()} ${index + 1})`}
          required={false}
          invalid={Boolean(needError)}
          value={pair.content.visualPrompt ?? ''}
          limits={QUESTION_LIMITS.visualPrompt}
          error={fieldMessage(issues, `${base}.visualPrompt`)}
          onCommit={(next) => onCommit('visualPrompt', next)}
        />
      </div>
      {hasFace ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFaceUp((up) => !up)}
            aria-pressed={!faceUp}
            aria-label={text.flipCard}
            className="flip-card relative aspect-[4/5] w-20 shrink-0 select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-brand"
            style={{ borderRadius: cardStyle.radius }}
          >
            <MemoryCardFaces content={pair.content} cardStyle={cardStyle} flipped={faceUp} showContent={faceUp} />
          </button>
          <p className="text-sm text-ink-soft">{text.cardPreviewHint}</p>
        </div>
      ) : null}
      {assetUrl ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-purple-200/70 bg-white/90 p-2 shadow-2xs">
          <img src={assetUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg bg-surface object-contain p-0.5 border border-ink/5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-ink">Hình minh họa mặt thẻ</span>
            <span className="block truncate text-2xs text-ink-soft">{pair.content.imageUrl ? 'Đã gán vector' : 'Nhận diện từ khóa'}</span>
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
