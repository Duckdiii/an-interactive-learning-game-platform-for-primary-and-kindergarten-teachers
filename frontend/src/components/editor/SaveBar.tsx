import { viText } from '../../constants/viText'
import Button from '../Button'
import Icon from '../ui/Icon'

interface SaveBarProps {
  dirty: boolean
  saving: boolean
  // Vừa lưu xong và chưa sửa thêm: hiện câu xác nhận.
  saved: boolean
  isPublished: boolean
  // Còn chữ vừa gõ chưa vào bản đang soạn (đang kiểm tra từ ngữ): chưa cho Lưu và Chơi thử trên bản cũ.
  applying: boolean
  onSave: () => void
  onPlayTest: () => void
}

// Thanh lưu: trạng thái bằng chữ (không chỉ bằng màu) và nút Lưu bản nháp. Câu xác nhận nằm trong vùng role="status" để
// trình đọc màn hình đọc ra khi vừa lưu xong.
export default function SaveBar({ dirty, saving, saved, isPublished, applying, onSave, onPlayTest }: SaveBarProps) {
  const text = viText.editor.save
  const status = saving ? text.saving : applying ? text.applying : dirty ? text.unsaved : text.allSaved

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p
          className={[
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold',
            dirty || applying ? 'bg-sun-soft text-ink ring-1 ring-sun' : 'bg-brand-soft text-brand-strong',
          ].join(' ')}
        >
          <Icon name={dirty || applying ? 'pencil' : 'check'} className="h-4 w-4" />
          {status}
        </p>
        <p role="status" className="mt-2 min-h-6 text-base font-semibold text-brand-strong">
          {saved ? (isPublished ? text.savedPublished : text.savedDraft) : ''}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button id="play-test-button" type="button" variant="secondary" disabled={applying} onClick={onPlayTest}>
          <Icon name="play" className="mr-2 h-4 w-4" />
          {viText.editor.play.button}
        </Button>
        <Button type="button" onClick={onSave} disabled={saving || applying || !dirty} className="sm:min-w-44">
          {saving ? text.saving : text.button}
        </Button>
      </div>
    </div>
  )
}
