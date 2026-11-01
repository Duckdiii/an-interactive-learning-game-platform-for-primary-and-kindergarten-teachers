import { subjectLabel } from '../../constants/labels'
import { subjectTheme } from './subjectTheme'

interface SubjectChipProps {
  subject: string
  // Mặc định là tên môn; truyền vào khi cần chữ khác (ví dụ "Toán · Lớp 1").
  label?: string
  selected?: boolean
  // Có onClick thì chip là nút bật/tắt, không có thì chỉ là nhãn.
  onClick?: () => void
  className?: string
}

export default function SubjectChip({
  subject,
  label = subjectLabel(subject),
  selected = false,
  onClick,
  className = '',
}: SubjectChipProps) {
  const theme = subjectTheme(subject)
  const base = `inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-bold ${theme.chipBorder}`

  if (!onClick) {
    return <span className={`${base} ${theme.chip} ${className}`}>{label}</span>
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${base} min-h-11 px-4 transition ${selected ? theme.chipSelected : theme.chip} ${className}`}
    >
      {label}
    </button>
  )
}
