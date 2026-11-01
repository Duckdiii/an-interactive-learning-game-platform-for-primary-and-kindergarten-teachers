import type { ReactNode } from 'react'

interface ErrorNoticeProps {
  // Câu nói rõ chuyện gì đã xảy ra và nên làm gì (xem constants/errorMessages.ts).
  message: string
  title?: string
  // Nút hành động (ví dụ "Thử lại"), đặt dưới thông báo.
  action?: ReactNode
  className?: string
}

// Hộp thông báo lỗi dùng chung cho giáo viên: đọc được bằng trình đọc màn hình (role="alert"), không dựa vào màu.
export default function ErrorNotice({
  message,
  title,
  action,
  className = '',
}: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={[
        'rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-base text-rose-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? <p className="font-bold">{title}</p> : null}
      <p className={title ? 'mt-1' : ''}>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
