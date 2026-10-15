import { useId, useRef, useState } from 'react'
import { viText } from '../../constants/viText'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import Button from '../Button'

interface CopyFieldProps {
  label: string
  value: string
  id?: string
}

const text = viText.editor.publish

// Ô chỉ đọc chứa văn bản kèm nút "Sao chép". navigator.clipboard có thể thất bại (trang không an toàn, bị chặn quyền): khi đó CHỌN SẴN toàn bộ văn bản
// trong ô và báo rõ để người dùng tự nhấn Ctrl+C, không để họ không biết làm gì tiếp.
export default function CopyField({ label, value, id }: CopyFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const noteId = `${inputId}-note`
  const inputRef = useRef<HTMLInputElement>(null)
  const { copiedValue, copy } = useCopyToClipboard()
  const [manual, setManual] = useState(false)
  const copied = copiedValue === value

  const selectAll = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  const handleCopy = async () => {
    const ok = await copy(value)

    setManual(!ok)
    if (!ok) selectAll()
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-bold text-ink-soft">
        {label}
      </label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          ref={inputRef}
          readOnly
          value={value}
          aria-describedby={manual ? noteId : undefined}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-paper px-3 font-mono text-base text-ink"
        />
        <Button type="button" variant="secondary" aria-label={`${text.copy} ${label.toLowerCase()}`} onClick={() => void handleCopy()}>
          {copied ? text.copied : text.copy}
        </Button>
      </div>
      <p role="status" id={noteId} className={manual ? 'mt-2 text-sm text-ink' : 'sr-only'}>
        {copied ? text.copied : manual ? text.copyManual : ''}
      </p>
    </div>
  )
}
