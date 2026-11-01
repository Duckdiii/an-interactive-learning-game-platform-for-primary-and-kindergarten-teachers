import { useState } from 'react'
import { viText } from '../../constants/viText'
import Icon from './Icon'
import { inputClass } from './formStyles'

interface PasswordInputProps {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  placeholder?: string
  invalid?: boolean
  required?: boolean
  describedBy?: string
  // Thêm vào tên nút hiện/ẩn khi một form có nhiều ô mật khẩu ("xác nhận"), để mỗi nút có tên khác nhau.
  toggleSuffix?: string
}

// Ô mật khẩu có nút hiện/ẩn: giáo viên gõ trên điện thoại dễ sai nên cần xem lại được trước khi gửi.
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid,
  required,
  describedBy,
  toggleSuffix = '',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const toggleLabel = `${visible ? viText.auth.hidePassword : viText.auth.showPassword}${toggleSuffix}`

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${inputClass(invalid)} pr-14`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-ink-soft transition hover:bg-brand-soft hover:text-brand-strong"
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  )
}
