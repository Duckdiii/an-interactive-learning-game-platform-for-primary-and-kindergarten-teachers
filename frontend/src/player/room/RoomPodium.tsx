import Dialog from '../../components/ui/Dialog'
import { viText } from '../../constants/viText'
import type { RoomFinished } from './RoomClient'

const text = viText.room.podium

// Thứ tự vẽ theo wireframe: hạng nhì, nhất, ba, tính theo vị trí vì bằng điểm thì hai bạn cùng `rank`.
const SPOTS = [
  { position: 1, width: 'w-60', dot: 'size-[70px] border-4 border-white bg-play-dot-yellow', name: 'text-2xl', score: 'text-lg text-play-night-soft', step: 'h-[150px] bg-play-night-track text-6xl' },
  { position: 0, width: 'w-64', dot: 'size-[84px] border-[5px] border-play-dot-yellow bg-play-dot-blue', name: 'text-3xl', score: 'text-xl text-play-dot-yellow', step: 'h-[220px] bg-play-accent text-play-ink text-7xl' },
  { position: 2, width: 'w-60', dot: 'size-[70px] border-4 border-white bg-play-dot-green', name: 'text-2xl', score: 'text-lg text-play-night-soft', step: 'h-[110px] bg-play-night-track text-5xl' },
]

/** D4 Room-Podium trên tivi. Lớp ít hơn 3 bạn thì chỉ vẽ các bậc có bạn. */
export default function RoomPodium({ finished }: { finished: RoomFinished }) {
  return (
    <div className="flex h-full flex-col items-center gap-2.5 bg-play-night pt-10 text-white">
      <h1 className="text-5xl font-black">{text.title}</h1>
      <p className="text-2xl font-extrabold text-play-night-soft">{text.average(Math.round(finished.averageCorrect), finished.total)}</p>
      <ol className="mt-auto flex items-end justify-center gap-4 pb-28">
        {SPOTS.map(({ position, width, dot, name, score, step }) => {
          const row = finished.top[position]

          return row ? (
            <li key={position} className={`flex ${width} flex-col items-center gap-2`}>
              <span aria-hidden="true" className={`rounded-full ${dot}`} />
              <span className={`w-full truncate text-center font-black ${name}`}>{row.nickname}</span>
              <span className={`font-extrabold ${score}`}>{text.points(row.score)}</span>
              <span className={`flex w-full items-center justify-center rounded-t-2xl font-black ${step}`}>{row.rank}</span>
            </li>
          ) : null
        })}
      </ol>
    </div>
  )
}

export function CloseRoomDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog title={text.closeTitle} onEscape={onCancel}>
      <p className="my-4">{text.closeNote}</p>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-lg bg-play-ink/10 px-4 font-extrabold hover:bg-play-ink/20">
          {text.cancel}
        </button>
        <button type="button" onClick={onConfirm} className="min-h-11 flex-1 rounded-lg bg-play-ink px-4 font-extrabold text-white">
          {text.close}
        </button>
      </div>
    </Dialog>
  )
}
