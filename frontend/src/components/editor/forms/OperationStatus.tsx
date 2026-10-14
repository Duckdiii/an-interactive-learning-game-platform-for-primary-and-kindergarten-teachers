import { useEffect, useId } from 'react'
import Button from '../../Button'

interface OperationStatusProps {
  // Chữ mô tả việc đang làm (không kèm phần trăm: phần trăm hiện riêng và không được đọc lại mỗi lần đổi).
  label: string
  // 0 đến 100, hoặc null khi không biết tiến độ.
  progress: number | null
  cancelLabel: string
  onCancel: () => void
}

// Thanh tiến trình kèm nút Hủy cho thao tác chạy lâu (tải tệp, tạo giọng đọc). Trình đọc màn hình chỉ nghe việc đang làm một lần;
// tiến độ nằm ở thanh `progressbar`.
export default function OperationStatus({ label, progress, cancelLabel, onCancel }: OperationStatusProps) {
  const id = useId()

  // Nút Hủy nhận tiêu điểm ngay khi thanh tiến trình hiện (nút bấm trước đó vừa bị thay mất): giáo viên dùng bàn phím hủy được ngay.
  useEffect(() => document.getElementById(`${id}-cancel`)?.focus(), [id])

  return (
    <div className="space-y-2 rounded-xl bg-brand-soft/50 p-3">
      <p id={`${id}-status`} role="status" className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ink">
        <span>{label}</span>
        {progress !== null ? (
          <span aria-hidden="true" className="tabular-nums">
            {progress}%
          </span>
        ) : null}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress ?? undefined}
        className="h-2.5 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className={['h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none', progress === null ? 'w-1/3 animate-pulse motion-reduce:animate-none' : ''].join(' ')}
          style={progress === null ? undefined : { width: `${progress}%` }}
        />
      </div>
      <Button id={`${id}-cancel`} type="button" variant="secondary" aria-describedby={`${id}-status`} onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  )
}
