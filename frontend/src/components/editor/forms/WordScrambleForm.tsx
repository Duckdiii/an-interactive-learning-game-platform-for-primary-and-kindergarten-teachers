import { viText } from '../../../constants/viText'
import type { WordScrambleQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import CheckedTextField from './CheckedTextField'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'
import { canReshuffle, reshuffle, seededRandom, setCorrectWord } from './scrambleEditing'

const LIMITS = TYPE_LIMITS.WORD_SCRAMBLE

// Hạt giống lấy MỘT lần ở nơi bấm/gõ xong (sự kiện của người dùng), rồi bản vá dùng `seededRandom(seed)`: bản vá thuần và lặp lại được, kể cả khi React chạy nó hai lần.
const newSeed = () => Math.floor(Math.random() * 4294967296)

// Form sửa câu WORD_SCRAMBLE: giáo viên chỉ nhập TỪ ĐÁP ÁN (2 đến 10 chữ, không khoảng trắng); các chữ đã xáo được tạo tự động từ từ đó (luôn là hoán vị hợp lệ và khác
// thứ tự gốc) nên không thể lệch với từ. Đổi từ thì xáo lại; nút "Xáo lại" đổi cách xáo. Chữ đã xáo chỉ để xem (không sửa từng chữ). Dùng được bằng bàn phím và ở màn
// hình hẹp (một cột).
export default function WordScrambleForm({ gameType, question: raw, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form
  const question = raw as WordScrambleQuestion
  const wordError = fieldMessage(issues, 'correctWord')
  // Từ đáp án đã sai (quá dài, có khoảng trắng...) thì lỗi của các chữ xáo chỉ là hệ quả: chỉ hiện lỗi của từ để không báo hai lần một chuyện.
  const lettersError = wordError ? undefined : fieldMessage(issues, 'scrambledLetters')
  const reshuffleOk = canReshuffle(question)
  const describedBy = ['scramble-letters-hint', lettersError ? 'scramble-letters-error' : '', reshuffleOk ? '' : 'scramble-reshuffle-note'].filter(Boolean).join(' ')

  const handleReshuffle = () => {
    // Phòng thủ: nút đã khóa khi chỉ có một cách xáo nên thường không tới đây.
    if (!reshuffleOk) return

    const seed = newSeed()

    onUpdate((current) => reshuffle(current as WordScrambleQuestion, seededRandom(seed)))
  }

  return (
    <div className="space-y-5">
      <CheckedTextField
        id="scramble-word"
        label={text.scrambleWordLabel}
        hint={text.scrambleWordHint.replace('{min}', String(LIMITS.correctWord.min)).replace('{max}', String(LIMITS.correctWord.max))}
        value={question.correctWord}
        limits={LIMITS.correctWord}
        error={wordError}
        onCommit={(value) => {
          const seed = newSeed()

          onUpdate((current) => setCorrectWord(current as WordScrambleQuestion, value, seededRandom(seed)))
        }}
      />

      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <legend className="text-base font-semibold text-ink">{text.scrambledLegend}</legend>
        <p id="scramble-letters-hint" className="text-sm text-ink-soft">
          {text.scrambledHint}
        </p>

        {question.scrambledLetters.length > 0 ? (
          <ul aria-label={text.scrambledLegend} className="flex flex-wrap gap-2">
            {question.scrambledLetters.map((letter, index) => (
              <li key={`${index}-${letter}`} className="flex h-14 min-w-14 items-center justify-center rounded-xl border-2 border-ink/20 bg-paper px-3 text-2xl font-extrabold">
                {letter}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{text.scrambledEmpty}</p>
        )}

        {lettersError ? (
          <p id="scramble-letters-error" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lettersError}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={!reshuffleOk} aria-describedby={reshuffleOk ? undefined : 'scramble-reshuffle-note'} onClick={handleReshuffle}>
            {text.reshuffle}
          </Button>
          <span id="scramble-reshuffle-note" className="text-sm text-ink-soft">
            {reshuffleOk ? '' : text.reshuffleUnavailable}
          </span>
        </div>
      </fieldset>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="scramble" />
    </div>
  )
}
