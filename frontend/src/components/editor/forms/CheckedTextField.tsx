import { useCallback, useEffect, useRef, useState } from 'react'
import { viText } from '../../../constants/viText'
import { checkTextSafety } from '../../../services/safetyService'
import type { Range } from '../../../utils/questionSpecs'
import Button from '../../Button'
import { usePendingEdits } from './PendingEditsContext'
import FormField from '../../ui/FormField'
import { describedBy, inputClass, textareaClass } from '../../ui/formStyles'

interface CheckedTextFieldProps {
  id: string
  label: string
  // Nội dung đang có trong cấu hình game.
  value: string
  limits: Range
  // Lỗi từ bộ kiểm tra dữ liệu (độ dài, trùng...), đã ở dạng câu hiển thị.
  error?: string
  hint?: string
  multiline?: boolean
  disabled?: boolean
  onCommit: (text: string) => void
}

type Verdict = 'idle' | 'checking' | 'unsafe' | 'unavailable'

// Thời gian chờ sau lần gõ cuối rồi mới áp nội dung vào game (để màn xem cập nhật ngay mà không kiểm tra từng phím).
const COMMIT_DELAY_MS = 350

// Ô chữ của form sửa tay (UC-05). Giáo viên gõ thì chữ nằm ở ô; ngừng gõ (hoặc rời ô) thì chữ được KIỂM TRA TỪ NGỮ rồi mới áp
// vào cấu hình game. Từ ngữ chưa phù hợp thì dừng cập nhật, GIỮ NGUYÊN nội dung cũ trong game, hiện đúng câu của SRS, và để
// nguyên chữ vừa gõ trong ô cho giáo viên sửa lại.
export default function CheckedTextField({ id, label, value, limits, error, hint, multiline = false, disabled = false, onCommit }: CheckedTextFieldProps) {
  const text = viText.editor.form
  const [typed, setTyped] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict>('idle')
  const requestRef = useRef(0)
  const { begin } = usePendingEdits()
  const shown = typed ?? value
  // Chữ đã gõ nhưng chưa vào game (đang chờ hẹn giờ hoặc đang kiểm tra): trang phải biết để không Lưu/Chơi thử trên bản cũ.
  // Chữ bị từ chối hoặc chưa kiểm tra được thì KHÔNG tính (nó sẽ không bao giờ vào game nếu giáo viên không làm gì).
  const applying = typed !== null && (verdict === 'idle' || verdict === 'checking')

  const commit = useCallback(
    async (next: string) => {
      requestRef.current += 1

      const request = requestRef.current

      if (next === value) {
        setTyped(null)
        setVerdict('idle')

        return
      }

      setVerdict('checking')

      try {
        const result = await checkTextSafety([next])

        // Có lần gõ hoặc lần kiểm tra mới hơn thì bỏ kết quả cũ.
        if (request !== requestRef.current) return

        if (!result.safe) {
          setVerdict('unsafe')

          return
        }

        onCommit(next)
        setTyped(null)
        setVerdict('idle')
      } catch {
        if (request === requestRef.current) setVerdict('unavailable')
      }
    },
    [value, onCommit],
  )

  // Bản `commit` mới nhất cho bộ hẹn giờ (tránh dựng lại bộ hẹn giờ mỗi lần cha vẽ lại).
  const commitRef = useRef(commit)

  useEffect(() => {
    commitRef.current = commit
  })

  useEffect(() => {
    if (typed === null) return

    const timer = setTimeout(() => void commitRef.current(typed), COMMIT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [typed])

  useEffect(() => {
    if (!applying) return

    return begin()
  }, [applying, begin])

  const handleChange = (next: string) => {
    requestRef.current += 1
    setVerdict('idle')
    setTyped(next === value ? null : next)
  }

  // Rời ô thì áp ngay (không đợi hẹn giờ); chữ đã bị từ chối thì không kiểm tra lại cùng một nội dung.
  const handleBlur = () => {
    if (typed !== null && verdict !== 'unsafe') void commit(typed)
  }

  const size = [...shown.trim()].length
  const safetyMessage =
    verdict === 'unsafe' ? `${text.unsafe} ${text.unsafeKept}` : verdict === 'unavailable' ? text.safetyUnavailable : undefined
  const shownError = safetyMessage ?? error
  const common = {
    id,
    value: shown,
    disabled,
    onChange: (event: { target: { value: string } }) => handleChange(event.target.value),
    onBlur: handleBlur,
    'aria-invalid': shownError ? (true as const) : undefined,
    'aria-describedby': describedBy(id, { hint: Boolean(hint), error: Boolean(shownError) }),
  }

  return (
    <div>
      <FormField
        id={id}
        label={label}
        hint={hint}
        error={shownError}
        required
        aside={
          <span className={['text-sm', size > limits.max ? 'font-bold text-rose-800' : 'text-ink-soft'].join(' ')}>
            {size}/{limits.max} {text.characters}
          </span>
        }
      >
        {multiline ? (
          <textarea {...common} rows={3} className={textareaClass(Boolean(shownError))} />
        ) : (
          <input {...common} type="text" className={inputClass(Boolean(shownError))} />
        )}
      </FormField>
      <p role="status" className="sr-only">
        {verdict === 'checking' ? text.checking : (safetyMessage ?? '')}
      </p>
      {verdict === 'unavailable' && typed !== null ? (
        <Button type="button" variant="secondary" className="mt-2" onClick={() => void commit(typed)}>
          {text.recheck}
        </Button>
      ) : null}
    </div>
  )
}
