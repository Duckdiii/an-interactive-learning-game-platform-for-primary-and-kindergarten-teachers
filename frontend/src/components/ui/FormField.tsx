import type { ReactNode } from 'react'
import Icon from './Icon'

interface FormFieldProps {
  // id của ô nhập bên trong; nhãn, gợi ý và lỗi đều gắn theo id này (xem describedBy trong formStyles).
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  // Phần phụ bên phải nhãn (ví dụ bộ đếm ký tự), được gắn vào mô tả của ô.
  aside?: ReactNode
  children: ReactNode
}

// Nhãn luôn hiện (không dùng placeholder thay nhãn), gợi ý ngay dưới nhãn, lỗi ngay dưới ô và nối vào ô bằng
// aria-describedby; ô nhập (children) tự đặt id, aria-invalid và aria-describedby.
export default function FormField({
  id,
  label,
  hint,
  error,
  required,
  aside,
  children,
}: FormFieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-semibold text-ink">
          {label}
          {required ? (
            <span aria-hidden="true" className="text-rose-700">
              {' '}
              *
            </span>
          ) : null}
        </label>
        {aside}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 flex items-start gap-2 text-sm font-semibold text-rose-800"
        >
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
