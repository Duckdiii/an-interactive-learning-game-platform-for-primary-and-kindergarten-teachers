import { isMock } from '../../config/mockMode'
import { resolveShareUrl } from '../../config/studentApp'
import { viText } from '../../constants/viText'
import type { PublishResult } from '../../types/publish.types'
import { safeHttpUrl } from '../../utils/safeUrl'
import Button from '../Button'
import Dialog from '../ui/Dialog'
import MockBadge from '../ui/MockBadge'
import QrCode from '../ui/QrCode'
import CopyField from './CopyField'

interface SharePanelProps {
  result: PublishResult
  // Giáo viên đã sửa thêm trong lúc chờ xuất bản (phần đó chưa lưu).
  hasUnsavedAfter: boolean
  onClose: () => void
}

const text = viText.editor.publish

// Hộp thoại sau khi xuất bản: mã chia sẻ và liên kết để sao chép. Liên kết và mã QR CHỈ hiện khi địa chỉ là http/https (kể cả khi Backend trả về).
export default function SharePanel({ result, hasUnsavedAfter, onClose }: SharePanelProps) {
  const url = safeHttpUrl(resolveShareUrl(result.shareCode, result.shareUrl))

  return (
    <Dialog title={text.panelTitle} initialFocusId="share-code" describedById="share-intro" onEscape={onClose}>
      <div className="mt-4 space-y-4">
        <p id="share-intro" className="text-base text-ink">{text.panelIntro}</p>
        {isMock('editor') ? <MockBadge /> : null}
        <CopyField id="share-code" label={text.codeLabel} value={result.shareCode} />
        {url ? <CopyField id="share-link" label={text.linkLabel} value={url} /> : null}
        {url ? <QrCode value={url} label={viText.qr.shareLabel} fileName={`qr-${result.shareCode}`} /> : null}
        {url && isMock('editor') ? <p className="text-sm text-ink-soft">{viText.qr.mockNote}</p> : null}
        <p className="text-sm text-ink-soft">{text.studentPagePending}</p>
        {hasUnsavedAfter ? (
          <p role="note" className="rounded-xl bg-sun-soft px-4 py-3 text-base text-ink ring-1 ring-sun">
            {text.unsavedAfter}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            {text.close}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
