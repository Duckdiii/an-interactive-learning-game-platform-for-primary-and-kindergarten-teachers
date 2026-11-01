import { QRCodeSVG } from 'qrcode.react'
import Dialog from '../../components/ui/Dialog'
import { viText } from '../../constants/viText'
import { safeHttpUrl } from '../../utils/safeUrl'
import type { RoomParticipant } from './RoomClient'

const text = viText.room.lobby
const VISIBLE_NAMES = 12
export const DOT_COLORS =['bg-play-dot-yellow', 'bg-play-dot-pink', 'bg-play-dot-blue', 'bg-play-dot-green', 'bg-play-dot-orange', 'bg-play-dot-purple']

export interface RoomInfo {
  title: string
  /** Ví dụ "Toán · Lớp 2 · 10 câu". */
  subtitle: string
  pin: string
  joinUrl: string
}

interface RoomLobbyProps {
  room: RoomInfo
  participants: RoomParticipant[]
}

/** D1 Room-Lobby trên tivi. Hiện các bạn vào gần nhất để cô thấy ngay biệt danh mới; xem đủ danh sách ở hộp "Xóa biệt danh". */
export default function RoomLobby({ room, participants }: RoomLobbyProps) {
  const joinUrl = safeHttpUrl(room.joinUrl)
  const visible = participants.slice(-VISIBLE_NAMES)
  const hidden = participants.length - visible.length

  return (
    <div className="flex h-full gap-12 bg-play-night px-14 pb-28 pt-12 text-white">
      <div className="flex w-[440px] flex-none flex-col gap-5">
        <p className="break-all text-2xl font-extrabold text-play-night-soft">{joinUrl ? text.joinAt(joinUrl.replace(/^https?:\/\//, '').replace(/\/\d{6}$/, '')) : text.joinWithCode}</p>
        <div className="rounded-3xl bg-white p-4 text-center text-7xl font-black tracking-[8px] text-play-night">{room.pin}</div>
        <div className="flex items-center gap-5">
          {joinUrl ? (
            <div role="img" aria-label={text.qr} className="w-44 flex-none rounded-2xl bg-white p-1">
              <QRCodeSVG value={joinUrl} size={168} level="M" marginSize={4} className="h-auto w-full" aria-hidden="true" />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="line-clamp-3 break-words text-2xl font-black">{room.title}</h1>
            <p className="text-lg font-bold text-play-night-soft">{room.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Giáo viên và trình đọc màn hình biết có bạn mới vào mà không phải nhìn danh sách. */}
        <p aria-live="polite" className="flex items-baseline gap-3">
          <span className="text-6xl font-black">{participants.length}</span>
          <span className="text-2xl font-extrabold text-play-night-soft">{text.joined}</span>
        </p>
        {participants.length === 0 ? (
          <p className="text-2xl font-bold text-play-night-soft">{text.empty}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3">
            {visible.map((participant, position) => (
              <li key={participant.participantId} className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-play-night-panel px-3 py-2.5 text-lg font-extrabold">
                <span aria-hidden="true" className={`size-6 flex-none rounded-full ${DOT_COLORS[(position + hidden) % DOT_COLORS.length]}`} />
                <span className="truncate">{participant.nickname}</span>
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 ? <p className="text-base font-bold text-play-night-soft">{text.more(hidden)}</p> : null}
      </div>
    </div>
  )
}

interface KickDialogProps {
  participants: RoomParticipant[]
  onKick: (participantId: string) => void
  onClose: () => void
}

export function KickDialog({ participants, onKick, onClose }: KickDialogProps) {
  return (
    <Dialog title={text.kickTitle} onEscape={onClose}>
      <p className="text-play-ink-soft">{text.kickNote}</p>
      {participants.length === 0 ? (
        <p className="py-4 font-bold">{text.empty}</p>
      ) : (
        <ul className="my-4 max-h-96 divide-y divide-play-ink/10 overflow-y-auto">
          {participants.map(({ participantId, nickname }) => (
            <li key={participantId} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 break-words font-bold">{nickname}</span>
              <button type="button" aria-label={text.kickOne(nickname)} onClick={() => onKick(participantId)} className="min-h-11 rounded-lg px-3 font-extrabold underline hover:bg-play-ink/5">
                {text.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onClose} className="min-h-11 w-full rounded-lg bg-play-ink/10 px-4 font-extrabold hover:bg-play-ink/20">
        {text.close}
      </button>
    </Dialog>
  )
}
