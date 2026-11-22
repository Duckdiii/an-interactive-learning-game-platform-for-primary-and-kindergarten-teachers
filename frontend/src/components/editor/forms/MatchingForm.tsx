import { useRef } from 'react'
import { viText } from '../../../constants/viText'
import type { MatchingPair, MatchingQuestion } from '../../../types/game-dsl.types'
import { QUESTION_LIMITS, TYPE_LIMITS } from '../../../utils/questionSpecs'
import { resolveAssetUrl } from '../../../utils/assetResolver'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { cleanMessage, fieldMessage } from './issueText'
import { addPair, canAddPair, canRemovePair, firstUnusedPairNumber, removePairById, setSideFieldById } from './matchingEditing'
import type { Side } from './matchingEditing'

const LIMITS = TYPE_LIMITS.MATCHING


const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// Form sửa câu MATCHING: 3 đến 6 cặp (giới hạn DSL), mỗi bên của cặp là CHỮ hoặc MÔ TẢ HÌNH (cần ít nhất một), không trùng nhau. Mọi
// thay đổi là một bản vá áp lên câu HIỆN HÀNH (như QuizForm). Cặp được nhận diện bằng MÃ CẶP (`pairId`), vừa là `key` của React (chữ gõ dở
// đi theo đúng cặp) vừa là cách bản vá tìm lại cặp lúc chạy; mã cặp mới do form cấp theo số tăng dần và KHÔNG dùng lại trong phiên, nên
// một bản vá đang chờ (kết quả kiểm tra từ ngữ về muộn) của cặp đã xóa không bao giờ rơi nhầm vào cặp mới. Dùng được hoàn toàn bằng bàn
// phím (mọi ô và nút là thành phần gốc của trình duyệt, thứ tự Tab đi theo thứ tự trên màn hình).
export default function MatchingForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as MatchingQuestion
  const nextNumber = useRef(firstUnusedPairNumber(question.pairs))
  const canAdd = canAddPair(question)
  const canRemove = canRemovePair(question)
  // Lỗi cấp danh sách (số cặp, mã cặp, các bên trùng nhau...) có thể có nhiều dòng.
  const listMessages = issues.filter((issue) => issue.field === 'pairs').map((issue) => cleanMessage(issue.message))
  const countHint = text.pairsHint.replace('{min}', String(LIMITS.pairs.min)).replace('{max}', String(LIMITS.pairs.max))
  const limitNote = !canAdd
    ? text.maxPairsReached.replace('{max}', String(LIMITS.pairs.max))
    : !canRemove
      ? text.minPairsReached.replace('{min}', String(LIMITS.pairs.min))
      : ''
  const describedBy = ['matching-pairs-hint', listMessages.length > 0 ? 'matching-pairs-errors' : ''].filter(Boolean).join(' ')

  const handleAdd = () => {
    // Chốt chặn: nút đã bị khóa khi đủ số cặp, nhưng bàn phím/trình đọc màn hình không được phép vượt giới hạn.
    if (!canAdd) return

    const pairId = `p${nextNumber.current++}`

    onUpdate((current) => addPair(current as MatchingQuestion, pairId))
    focusLater(`${idPrefix(pairId)}-left-text`)
  }

  const handleRemove = (pairId: string) => {
    if (!canRemove) return

    const index = question.pairs.findIndex((pair) => pair.pairId === pairId)
    const neighbour = question.pairs[index + 1] ?? question.pairs[index - 1]

    onUpdate((current) => removePairById(current as MatchingQuestion, pairId))
    // Nút Xóa vừa bị gỡ khỏi trang: đưa tiêu điểm về cặp kế cận để người dùng bàn phím không mất vị trí.
    if (neighbour) focusLater(`${idPrefix(neighbour.pairId)}-left-text`)
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.pairsLegend}</legend>
        <p id="matching-pairs-hint" className="text-sm text-ink-soft">
          {countHint}
        </p>

        <ol className="space-y-3">
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
                    <span>Ghép cặp #{index + 1}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 h-8 w-8 !p-0 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                    disabled={!canRemove}
                    aria-describedby={canRemove ? undefined : 'matching-pairs-limit'}
                    aria-label={`${text.removePair} ${index + 1}`}
                    onClick={() => handleRemove(pair.pairId)}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <SideFields
                    key="left"
                    pair={pair}
                    side="left"
                    index={index}
                    issues={issues}
                    onCommit={(field, value) => onUpdate((current) => setSideFieldById(current as MatchingQuestion, pair.pairId, 'left', field, value))}
                  />
                  <div className="hidden md:flex flex-col items-center justify-center text-brand" aria-hidden="true">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft border border-brand/20 text-sm shadow-xs" title="Nối với nhau">
                      🔗
                    </span>
                  </div>
                  <SideFields
                    key="right"
                    pair={pair}
                    side="right"
                    index={index}
                    issues={issues}
                    onCommit={(field, value) => onUpdate((current) => setSideFieldById(current as MatchingQuestion, pair.pairId, 'right', field, value))}
                  />
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        {listMessages.length > 0 ? (
          <ul id="matching-pairs-errors" className="space-y-1">
            {listMessages.map((message) => (
              <li key={message} className="flex items-start gap-2 text-sm font-semibold text-rose-800">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!canAdd} aria-describedby={canAdd ? undefined : 'matching-pairs-limit'} onClick={handleAdd}>
            {text.addPair}
          </Button>
          <span id="matching-pairs-limit" className="text-sm text-ink-soft">
            {limitNote}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="matching" />
    </div>
  )
}

// Tiền tố id của các ô trong một cặp, theo MÃ CẶP (không theo vị trí) để tiêu điểm sau thêm/xóa tìm đúng ô.
const idPrefix = (pairId: string) => `matching-${pairId}`

interface SideFieldsProps {
  pair: MatchingPair
  side: Side
  index: number
  issues: QuestionFormProps['issues']
  onCommit: (field: 'text' | 'visualPrompt', value: string) => void
}

// Một bên của cặp: chữ HOẶC mô tả hình (cần ít nhất một). Lỗi "cần chữ hoặc mô tả hình" hiện ngay dưới tiêu đề của bên đó và cả hai ô
// được đánh dấu không hợp lệ (aria-invalid) để trình đọc màn hình biết ô nào cần điền.
function SideFields({ pair, side, index, issues, onCommit }: SideFieldsProps) {
  const text = viText.editor.form
  const value = pair[side]
  const base = `pairs[${index}].${side}`
  const needError = fieldMessage(issues, base)
  const title = side === 'left' ? text.leftSide : text.rightSide
  const prefix = `${idPrefix(pair.pairId)}-${side}`
  const assetUrl = value.imageUrl || resolveAssetUrl(value.text, value.visualPrompt)

  return (
    <fieldset
      className={[
        'space-y-2.5 rounded-xl border p-3.5 transition',
        side === 'left' ? 'border-amber-200/70 bg-amber-50/30' : 'border-emerald-200/70 bg-emerald-50/30',
      ].join(' ')}
      aria-describedby={needError ? `${prefix}-need` : undefined}
    >
      <legend className="px-1 text-sm font-bold text-ink flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${side === 'left' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <span>{title}</span>
      </legend>
      {needError ? (
        <p id={`${prefix}-need`} className="flex items-start gap-2 text-sm font-semibold text-rose-800">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{needError}</span>
        </p>
      ) : null}
      <CheckedTextField
        id={`${prefix}-text`}
        label={`${text.sideTextLabel} (${title.toLowerCase()})`}
        required={false}
        invalid={Boolean(needError)}
        value={value.text ?? ''}
        limits={LIMITS.sideText}
        error={fieldMessage(issues, `${base}.text`)}
        onCommit={(next) => onCommit('text', next)}
      />
      <CheckedTextField
        id={`${prefix}-image`}
        label={`${text.sideImageLabel} (${title.toLowerCase()})`}
        required={false}
        invalid={Boolean(needError)}
        value={value.visualPrompt ?? ''}
        limits={QUESTION_LIMITS.visualPrompt}
        error={fieldMessage(issues, `${base}.visualPrompt`)}
        onCommit={(next) => onCommit('visualPrompt', next)}
      />
      {assetUrl ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-ink/10 bg-white/90 p-2 shadow-2xs">
          <img src={assetUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg bg-surface object-contain p-0.5 border border-ink/5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-ink">Hình minh họa</span>
            <span className="block truncate text-2xs text-ink-soft">{value.imageUrl ? 'Đã gán vector' : 'Nhận diện từ khóa'}</span>
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
