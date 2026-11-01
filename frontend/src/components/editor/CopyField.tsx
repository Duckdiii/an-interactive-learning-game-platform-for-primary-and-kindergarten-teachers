import { useId, useRef, useState } from 'react'
import { viText } from '../../constants/viText'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import Button from '../Button'

interface CopyFieldProps {
  label: string
  value: string
  id?: string
  // Có `onChange` thì là ô soạn nhiều dòng (văn bản mẫu sửa được); không có thì là ô một dòng chỉ đọc (mã, liên kết).
  onChange?: (value: string) => void
  maxLength?: number
  // Id đoạn mô tả có sẵn (ví dụ lời nhắc quyền riêng tư) để trình đọc màn hình đọc kèm khi vào ô.
  describedBy?: string
}

const text = viText.editor.publish
const inputClass = 'min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-paper px-3 text-base text-ink'

// Ô chứa văn bản kèm nút "Sao chép". navigator.clipboard có thể thất bại (trang không an toàn, bị chặn quyền): khi đó CHỌN SẴN toàn bộ văn bản
// trong ô và báo rõ để người dùng tự nhấn Ctrl+C, không để họ không biết làm gì tiếp.
export default function CopyField({ label, value, id, onChange, maxLength, describedBy }: CopyFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const noteId = `${inputId}-note`
  const inputRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const { copiedValue, copy } = useCopyToClipboard()
  const [manual, setManual] = useState(false)
  const copied = copiedValue === value
  const editable = onChange !== undefined
  const described = [describedBy, manual ? noteId : undefined].filter(Boolean).join(' ') || undefined

  const selectAll = () => {
    const field = editable ? areaRef.current : inputRef.current

    field?.focus()
    field?.select()
  }

  const handleCopy = async () => {
    const ok = await copy(value)

    setManual(!ok)
    if (!ok) selectAll()
  }

  const button = (
    <Button type="button" variant="secondary" aria-label={`${text.copy} ${label.toLowerCase()}`} onClick={() => void handleCopy()}>
      {copied ? text.copied : text.copy}
    </Button>
  )

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-bold text-ink-soft">
        {label}
      </label>
      {editable ? (
        <div className="mt-1 space-y-2">
          <textarea
            id={inputId}
            ref={areaRef}
            rows={9}
            value={value}
            maxLength={maxLength}
            aria-describedby={described}
            onChange={(event) => {
              setManual(false)
              onChange(event.target.value)
            }}
            className={`${inputClass} block w-full py-2 leading-7`}
          />
          <div className="flex justify-end">{button}</div>
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            ref={inputRef}
            readOnly
            value={value}
            aria-describedby={manual ? noteId : undefined}
            onFocus={(event) => event.currentTarget.select()}
            className={`${inputClass} min-h-12 font-mono`}
          />
          {button}
        </div>
      )}
      <p role="status" id={noteId} className={manual ? 'mt-2 text-sm text-ink' : 'sr-only'}>
        {copied ? text.copied : manual ? text.copyManual : ''}
      </p>
    </div>
  )
}
