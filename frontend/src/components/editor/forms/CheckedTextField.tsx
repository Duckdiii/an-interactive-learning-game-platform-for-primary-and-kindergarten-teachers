import { useCallback, useEffect, useRef, useState } from 'react'
import { viText } from '../../../constants/viText'
import { checkTextSafety } from '../../../services/safetyService'
import type { Range } from '../../../utils/questionSpecs'
import Button from '../../Button'
import { usePendingEdits } from './PendingEditsContext'
import { withTimeout } from './safetyTimeout'
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
  // Đánh dấu ô không hợp lệ (viền, aria-invalid) khi lời nhắn lỗi nằm ở chỗ khác (ví dụ lỗi chung của cả một bên của cặp).
  invalid?: boolean
  hint?: string
  multiline?: boolean
  // Trường bắt buộc thì hiện dấu sao; trường tùy chọn cho phép để trống (nội dung rỗng được áp như "bỏ trường").
  required?: boolean
  disabled?: boolean
  onCommit: (text: string) => void
}

type Verdict = 'idle' | 'checking' | 'unsafe' | 'unavailable'

// Thời gian chờ sau lần gõ cuối rồi mới áp nội dung vào game (để màn xem cập nhật ngay mà không kiểm tra từng phím).
const COMMIT_DELAY_MS = 350

// Ô chữ của form sửa tay (UC-05). Giáo viên gõ thì chữ nằm ở ô; ngừng gõ (hoặc rời ô) thì chữ được KIỂM TRA TỪ NGỮ rồi mới áp
// vào cấu hình game. Từ ngữ chưa phù hợp thì dừng cập nhật, GIỮ NGUYÊN nội dung cũ trong game, hiện đúng câu của SRS, và để
// nguyên chữ vừa gõ trong ô cho giáo viên sửa lại.
export default function CheckedTextField({ id, label, value, limits, error, invalid = false, hint, multiline = false, required = true, disabled = false, onCommit }: CheckedTextFieldProps) {
  const text = viText.editor.form
  const [typed, setTyped] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict>('idle')
  const requestRef = useRef(0)
  // Nội dung ĐÃ gửi đi kiểm tra: hẹn giờ và sự kiện rời ô không được gửi lại đúng nội dung đó (nếu không, lần kiểm tra chạy chậm sẽ bị
  // lần kiểm tra thứ hai xóa kết quả giữa chừng và màn hình nhấp nháy). Gõ thêm thì xóa mốc này.
  const submittedRef = useRef<string | null>(null)
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

      submittedRef.current = next
      setVerdict('checking')

      try {
        // Quá thời gian thì coi như chưa kiểm tra được (nhánh `catch`), để không khóa Lưu và Chơi thử mãi.
        const result = await withTimeout(checkTextSafety([next]))

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
        if (request === requestRef.current) {
          // Chưa kiểm tra được: cho phép rời ô lần sau thử lại (không chỉ nút "Kiểm tra lại").
          submittedRef.current = null
          setVerdict('unavailable')
        }
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

    const timer = setTimeout(() => {
      if (submittedRef.current !== typed) void commitRef.current(typed)
    }, COMMIT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [typed])

  useEffect(() => {
    if (!applying) return

    return begin()
  }, [applying, begin])

  const handleChange = (next: string) => {
    requestRef.current += 1
    submittedRef.current = null
    setVerdict('idle')
    setTyped(next === value ? null : next)
  }

  // Rời ô thì áp ngay (không đợi hẹn giờ); chữ đã bị từ chối thì không kiểm tra lại cùng một nội dung.
  const handleBlur = () => {
    if (typed !== null && submittedRef.current !== typed) void commit(typed)
  }

  const size = [...shown.trim().normalize('NFC')].length
  const safetyMessage =
    verdict === 'unsafe' ? `${text.unsafe} ${text.unsafeKept}` : verdict === 'unavailable' ? text.safetyUnavailable : undefined
  const shownError = safetyMessage ?? error
  const isInvalid = Boolean(shownError) || invalid
  const common = {
    id,
    value: shown,
    disabled,
    onChange: (event: { target: { value: string } }) => handleChange(event.target.value),
    onBlur: handleBlur,
    'aria-invalid': isInvalid ? (true as const) : undefined,
    'aria-describedby': describedBy(id, { hint: Boolean(hint), error: Boolean(shownError) }),
  }

  return (
    <div>
      <FormField
        id={id}
        label={label}
        hint={hint}
        error={shownError}
        required={required}
        aside={
          <span className={['text-sm', size > limits.max ? 'font-bold text-rose-800' : 'text-ink-soft'].join(' ')}>
            {size}/{limits.max} {text.characters}
          </span>
        }
      >
        {multiline ? (
          <textarea {...common} rows={3} className={textareaClass(isInvalid)} />
        ) : (
          <input {...common} type="text" className={inputClass(isInvalid)} />
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
