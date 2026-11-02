import { viText } from '../../constants/viText'
import Button from '../Button'
import type { StoredDraft } from '../../utils/draftStorage'

interface DraftRestoreNoticeProps {
  draft: StoredDraft
  // `updatedAt` hiện tại của game trên máy chủ: mới hơn lúc bắt đầu soạn nghĩa là đã được lưu ở nơi khác.
  serverUpdatedAt: string
  onRestore: () => void
  onDiscard: () => void
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

// Hỏi giáo viên có muốn tiếp tục từ bản chỉnh sửa còn sao lưu trong trình duyệt hay không. Không tự khôi phục: bản đó có thể
// cũ hơn bản trên máy chủ.
export default function DraftRestoreNotice({ draft, serverUpdatedAt, onRestore, onDiscard }: DraftRestoreNoticeProps) {
  const text = viText.editor.restore
  const newerOnServer = Date.parse(serverUpdatedAt) > Date.parse(draft.baseUpdatedAt)

  return (
    <section aria-labelledby="restore-title" className="rounded-2xl border-2 border-sun bg-sun-soft p-4 sm:p-5">
      <h2 id="restore-title" className="text-lg font-extrabold">
        {text.title}
      </h2>
      <p className="mt-1 text-base">{text.description.replace('{time}', formatTime(draft.savedAt))}</p>
      {newerOnServer ? <p className="mt-1 text-base font-semibold">{text.newerOnServer}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onRestore}>
          {text.accept}
        </Button>
        <Button type="button" variant="secondary" onClick={onDiscard}>
          {text.discard}
        </Button>
      </div>
    </section>
  )
}
