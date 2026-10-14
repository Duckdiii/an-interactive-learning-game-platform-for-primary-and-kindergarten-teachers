import { useState } from 'react'
import { viText } from '../../../constants/viText'
import type { Range } from '../../../utils/questionSpecs'
import FormField from '../../ui/FormField'
import { describedBy, inputClass } from '../../ui/formStyles'

interface NumberFieldProps {
  id: string
  label: string
  value: number
  limits: Range
  defaultValue?: number
  // Lỗi từ bộ kiểm tra dữ liệu (ngoài khoảng cho phép...), đã ở dạng câu hiển thị.
  error?: string
  disabled?: boolean
  onCommit: (value: number) => void
}

const WHOLE_NUMBER = /^\d{1,6}$/

// Ô nhập số nguyên của form sửa tay. Số hợp lệ về HÌNH THỨC được áp ngay vào game (bộ kiểm tra dữ liệu báo nếu ngoài khoảng
// cho phép, nên giáo viên thấy lỗi ngay khi gõ); chữ không phải số thì giữ trong ô kèm lời nhắc và KHÔNG đổi game.
export default function NumberField({ id, label, value, limits, defaultValue, error, disabled = false, onCommit }: NumberFieldProps) {
  const text = viText.editor.form
  const [typed, setTyped] = useState<string | null>(null)
  const shown = typed ?? String(value)
  const formatError = typed !== null && !WHOLE_NUMBER.test(typed.trim()) ? text.notInteger : undefined
  const shownError = formatError ?? error
  const hint = [
    text.rangeHint.replace('{min}', String(limits.min)).replace('{max}', String(limits.max)),
    defaultValue === undefined ? '' : text.defaultHint.replace('{n}', String(defaultValue)),
  ]
    .filter(Boolean)
    .join(' ')

  const handleChange = (next: string) => {
    if (WHOLE_NUMBER.test(next.trim())) {
      setTyped(null)
      onCommit(Number(next.trim()))

      return
    }

    setTyped(next)
  }

  return (
    <FormField id={id} label={label} hint={hint} error={shownError} required>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={shown}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => setTyped(null)}
        aria-invalid={shownError ? true : undefined}
        aria-describedby={describedBy(id, { hint: true, error: Boolean(shownError) })}
        className={inputClass(Boolean(shownError))}
      />
    </FormField>
  )
}
