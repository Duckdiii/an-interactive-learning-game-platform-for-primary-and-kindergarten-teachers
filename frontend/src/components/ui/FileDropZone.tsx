import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { viText } from '../../constants/viText'
import { LESSON_FILE_ACCEPT, formatFileSize } from '../../utils/lessonFile'
import Icon from './Icon'

interface FileDropZoneProps {
  id: string
  file: File | null
  describedBy?: string
  invalid?: boolean
  // Nhận tệp vừa chọn hoặc vừa thả; việc kiểm tra loại và dung lượng do nơi gọi quyết định.
  onSelect: (file: File) => void
  onRemove: () => void
}

// Vùng tải giáo án: bấm để chọn tệp hoặc kéo thả (UC-02 bước 3). Dùng <input type="file"> thật nên bàn phím,
// trình đọc màn hình và hộp thoại chọn tệp của hệ điều hành hoạt động như thường.
export default function FileDropZone({
  id,
  file,
  describedBy,
  invalid,
  onSelect,
  onRemove,
}: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const removeRef = useRef<HTMLButtonElement>(null)
  const hadFile = useRef(file !== null)

  // Chọn/bỏ tệp làm ô đang giữ tiêu điểm biến mất: đưa tiêu điểm sang điều khiển thay thế để người dùng bàn phím và
  // trình đọc màn hình không bị rơi về đầu trang.
  useEffect(() => {
    const hasFile = file !== null

    if (hasFile === hadFile.current) return

    hadFile.current = hasFile

    // Điều khiển đang giữ tiêu điểm vừa bị gỡ thì tiêu điểm rơi về <body>; nếu tiêu điểm đang ở ô khác (cha tự đặt lại
    // tệp ở chỗ khác) thì không kéo đi.
    if (document.activeElement && document.activeElement !== document.body) return

    if (hasFile) removeRef.current?.focus()
    else inputRef.current?.focus()
  }, [file])

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-brand/40 bg-brand-soft p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-brand-strong">
          <Icon name="file" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-ink">{file.name}</p>
          <p className="text-sm text-ink-soft">{formatFileSize(file.size)}</p>
        </div>
        <button
          ref={removeRef}
          type="button"
          onClick={onRemove}
          aria-label={`${viText.generator.fileRemove}: ${file.name}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-soft transition hover:bg-white hover:text-rose-800"
        >
          <Icon name="close" />
        </button>
      </div>
    )
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]

    if (dropped) onSelect(dropped)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="block"
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={LESSON_FILE_ACCEPT}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const chosen = event.target.files?.[0]

          // Đặt lại để chọn lại đúng tệp cũ vẫn kích hoạt sự kiện sau khi đã bỏ.
          event.target.value = ''
          if (chosen) onSelect(chosen)
        }}
        className="peer sr-only"
      />
      <span
        className={[
          'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
          dragging
            ? 'border-brand bg-brand-soft'
            : invalid
              ? 'border-rose-500 bg-rose-50'
              : 'border-ink/30 bg-paper hover:border-brand hover:bg-brand-soft',
        ].join(' ')}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-strong shadow-sm">
          <Icon name="upload" className="h-6 w-6" />
        </span>
        <span className="text-base font-bold text-ink">
          {viText.generator.fileDrop}
        </span>
      </span>
    </label>
  )
}
