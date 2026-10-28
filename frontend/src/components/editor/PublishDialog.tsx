import { QRCodeSVG } from 'qrcode.react'
import type { ReactNode } from 'react'
import { isMock } from '../../config/mockMode'
import { resolveShareUrl } from '../../config/studentApp'
import { viText } from '../../constants/viText'
import { usePublishSettings } from '../../hooks/usePublishSettings'
import { resolveAgeBand } from '../../player/profile/resolveUiProfile'
import type { AgeBand } from '../../player/profile/types'
import type { PublishResult } from '../../types/publish.types'
import { safeHttpUrl } from '../../utils/safeUrl'
import Button from '../Button'
import { buttonClass } from '../buttonStyles'
import Dialog from '../ui/Dialog'
import MockBadge from '../ui/MockBadge'
import QrCode from '../ui/QrCode'
import CopyField from './CopyField'
import ParentMessage from './ParentMessage'
import PublishSettingsRow from './PublishSettingsRow'

interface PublishDialogProps {
  result: PublishResult
  // Tên trò chơi để điền sẵn vào tin nhắn mẫu gửi phụ huynh.
  gameTitle: string
  // Khối lớp của game, để gợi ý thẻ hợp với lớp.
  gradeLevel: string
  // Giáo viên đã sửa thêm trong lúc chờ xuất bản (phần đó chưa lưu).
  hasUnsavedAfter: boolean
  onClose: () => void
}

type CardId = 'present' | 'room' | 'home'

const text = viText.editor.publish
// Khung Bé (Mầm non, lớp 1) hợp trình chiếu cả lớp; khung Học sinh hợp thi đấu mỗi bạn một máy.
const RECOMMENDED: Record<AgeBand, CardId> = { be: 'present', hocSinh: 'room' }
const TONES: Record<CardId, string> = { present: 'bg-brand-soft text-brand-strong', room: 'bg-math-soft text-math-ink', home: 'bg-viet-soft text-viet-ink' }
const ICONS: Record<CardId, ReactNode> = {
  present: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  room: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
}

function OptionCard({ id, recommended, children }: { id: CardId; recommended: boolean; children: ReactNode }) {
  const card = text.cards[id]

  return (
    <section aria-labelledby={`publish-card-${id}`} className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line ${recommended ? 'outline-4 outline-brand' : ''}`}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TONES[id]}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[id]}
        </svg>
      </span>
      <h2 id={`publish-card-${id}`} className="font-display text-xl font-extrabold text-ink">
        {card.title}
      </h2>
      {recommended ? <p className="text-sm font-extrabold text-brand-strong">{text.recommended}</p> : null}
      {'body' in card ? <p className="text-sm font-semibold leading-relaxed text-ink">{card.body}</p> : null}
      {children}
    </section>
  )
}

// Hộp thoại sau khi xuất bản: 3 cách cho trẻ chơi (trình chiếu, mở phòng, giao về nhà) và cài đặt khi chơi. Liên kết và mã QR CHỈ hiện khi địa chỉ là http/https (kể cả khi Backend trả về).
export default function PublishDialog({ result, gameTitle, gradeLevel, hasUnsavedAfter, onClose }: PublishDialogProps) {
  const url = safeHttpUrl(resolveShareUrl(result.shareCode, result.shareUrl))
  const settings = usePublishSettings(result.gameId)
  const recommended = RECOMMENDED[resolveAgeBand({ gradeLevel, uiOverride: settings.settings?.uiOverride })]
  const { present, room, home } = text.cards

  return (
    <Dialog title={text.panelTitle} initialFocusId="share-code" describedById="share-intro" onEscape={onClose} wide hideTitle>
      <div className="relative space-y-5">
        <button type="button" aria-label={text.close} onClick={onClose} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl bg-paper text-xl font-bold text-ink hover:bg-brand-soft">
          <span aria-hidden="true">×</span>
        </button>
        <div className="flex items-center gap-4 pr-12">
          <div aria-hidden="true" className="relative h-20 w-28 shrink-0">
            <span className="absolute left-0 top-4 flex h-14 w-14 -rotate-12 items-center justify-center rounded-2xl border-4 border-math-mark bg-math-soft font-display text-3xl font-extrabold text-math-ink">1</span>
            <span className="absolute left-14 top-0 flex h-14 w-14 rotate-[10deg] items-center justify-center rounded-2xl border-4 border-sun bg-sun-soft font-display text-3xl font-extrabold text-sun-ink">✓</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{text.ready.replace('{title}', gameTitle)}</h1>
            <p id="share-intro" className="mt-1 text-base font-bold text-ink-soft">
              {text.howToPlay}
            </p>
            {isMock('editor') ? <MockBadge className="mt-2" /> : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <OptionCard id="present" recommended={recommended === 'present'}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" aria-describedby="present-note" className={`${buttonClass('primary')} mt-auto`}>
                {present.action}
                <span className="sr-only"> {present.opensNew}</span>
              </a>
            ) : null}
            <p id="present-note" className="text-sm text-ink-soft">
              {url ? present.temporary : present.noLink}
            </p>
          </OptionCard>

          <OptionCard id="room" recommended={recommended === 'room'}>
            {/* aria-disabled (không dùng disabled) để nút còn nhận tiêu điểm và đọc được lý do. */}
            <Button type="button" variant="secondary" aria-disabled="true" aria-describedby="room-reason" onClick={(event) => event.preventDefault()} className="mt-auto cursor-not-allowed opacity-70">
              {room.action}
              <span className="ml-2 rounded-full bg-sun-soft px-2 py-0.5 text-sm text-ink ring-1 ring-sun">{text.soon}</span>
            </Button>
            <p id="room-reason" className="text-sm text-ink-soft">
              {room.reason}
            </p>
          </OptionCard>

          <OptionCard id="home" recommended={false}>
            <div className="flex items-center gap-3">
              <div className="w-24 shrink-0">
                <QrCode value={url} label={viText.qr.shareLabel} fileName={`qr-${result.shareCode}`} />
              </div>
              <p aria-hidden="true" className="font-display text-3xl font-extrabold tracking-widest text-ink">
                {result.shareCode}
              </p>
            </div>
            <CopyField id="share-code" label={text.codeLabel} value={result.shareCode} />
            {url ? <CopyField id="share-link" label={text.linkLabel} value={url} /> : null}
            {url && isMock('editor') ? <p className="text-sm text-ink-soft">{viText.qr.mockNote}</p> : null}
            <Button type="button" variant="accent" onClick={() => window.print()} className="mt-auto">
              {home.print}
            </Button>
            <ParentMessage key={`${result.shareCode}|${url}|${gameTitle}`} title={gameTitle} shareCode={result.shareCode} shareUrl={url} />
          </OptionCard>
        </div>

        <PublishSettingsRow state={settings} />

        <p className="text-sm text-ink-soft">{text.studentPagePending}</p>
        {hasUnsavedAfter ? (
          <p role="note" className="rounded-xl bg-sun-soft px-4 py-3 text-base text-ink ring-1 ring-sun">
            {text.unsavedAfter}
          </p>
        ) : null}
      </div>

      {/* Chỉ hiện khi in (CSS @media print trong index.css chỉ in vùng này). Thuộc tính hidden để trình đọc màn hình bỏ qua. */}
      <div data-print-sheet hidden className="print:block">
        <h1 className="text-3xl font-extrabold">{home.printHeading}</h1>
        <p className="mt-2 text-xl font-bold">{gameTitle}</p>
        <p className="mt-2 text-lg">{home.printSteps}</p>
        {url ? <QRCodeSVG value={url} size={256} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" className="my-4" /> : null}
        <p className="font-mono text-5xl font-extrabold tracking-widest">{result.shareCode}</p>
        {url ? <p className="mt-2 break-all text-base">{url}</p> : null}
      </div>
    </Dialog>
  )
}
