import { useId, useState } from 'react'
import { viText } from '../../constants/viText'
import { PARENT_MESSAGE_MAX_LENGTH, buildParentMessage } from '../../utils/parentMessage'
import Button from '../Button'
import CopyField from './CopyField'

interface ParentMessageProps {
  title: string
  shareCode: string
  shareUrl: string | null | undefined
}

const text = viText.editor.publish.parent

// Tin nhắn mẫu gửi phụ huynh: điền sẵn tên trò chơi, liên kết, mã; giáo viên sửa tự do rồi sao chép (cùng phương án dự phòng clipboard như mã và liên kết).
// KHÔNG gửi qua dịch vụ nào và không lưu nội dung.
export default function ParentMessage({ title, shareCode, shareUrl }: ParentMessageProps) {
  const template = buildParentMessage({ title, shareCode, shareUrl })
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(template)
  const panelId = useId()

  return (
    <div className="rounded-xl border-2 border-ink/10 p-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="min-h-12 w-full text-left text-base font-bold text-brand-strong"
      >
        {open ? text.hide : text.show}
      </button>
      <div id={panelId} hidden={!open} className="mt-2 space-y-3">
        <p id={`${panelId}-privacy`} role="note" className="rounded-xl bg-sun-soft px-4 py-3 text-base text-ink ring-1 ring-sun">
          {text.privacy}
        </p>
        <CopyField id={`${panelId}-text`} label={text.label} value={message} onChange={setMessage} maxLength={PARENT_MESSAGE_MAX_LENGTH} describedBy={`${panelId}-privacy`} />
        <Button type="button" variant="secondary" disabled={message === template} onClick={() => setMessage(template)}>
          {text.reset}
        </Button>
      </div>
    </div>
  )
}
