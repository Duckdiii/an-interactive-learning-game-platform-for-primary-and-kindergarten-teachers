import { viText } from '../../constants/viText'
import type { RoomQuestion } from './RoomClient'
import { useRoomSeconds } from './useRoomSeconds'

const text = viText.room.question

interface RoomQuestionScreenProps {
  title: string
  question: RoomQuestion
  remainingMs: number | null
  paused: boolean
  answeredCount: number
  participantCount: number
}

const percent = (part: number, whole: number) => (whole > 0 ? Math.min(Math.round((part / whole) * 100), 100) : 0)

/** D2 Room-Question trên tivi: chỉ đồng hồ và tiến độ, nội dung câu nằm trên máy từng bạn (SPEC 1.9). Đồng hồ tính theo `serverNow`, không theo giờ máy tivi; đang tạm dừng thì hiện `remainingMs`. */
export default function RoomQuestionScreen({ title, question, remainingMs, paused, answeredCount, participantCount }: RoomQuestionScreenProps) {
  const seconds = useRoomSeconds(question, remainingMs, paused)
  const durationSeconds = question.durationMs / 1000

  return (
    <div className="flex h-full flex-col items-center gap-6 bg-play-night pt-12 text-white">
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-play-night-panel px-5 py-2 text-2xl font-black">{text.progress(question.index + 1, question.total)}</span>
        <span className="max-w-xl truncate text-2xl font-extrabold text-play-night-soft">{title}</span>
      </div>
      <p className="text-4xl font-black">{paused ? text.paused : text.onDevices}</p>
      <div
        role="timer"
        aria-label={text.secondsLeft(seconds)}
        className="grid size-64 place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--play-accent) 0 ${percent(seconds, durationSeconds)}%, var(--play-night-track) 0 100%)` }}
      >
        <div className="flex size-52 flex-col items-center justify-center rounded-full bg-play-night">
          <span className="text-8xl font-black leading-none">{seconds}</span>
          <span className="text-xl font-extrabold text-play-night-soft">{text.seconds}</span>
        </div>
      </div>
      <div className="flex w-[640px] flex-col gap-2.5">
        <p className="flex justify-between text-2xl font-black">
          <span>{text.answered}</span>
          <span>
            {answeredCount}/{participantCount}
          </span>
        </p>
        <div aria-hidden="true" className="h-5 overflow-hidden rounded-full bg-play-night-track">
          <div className="h-full bg-play-night-progress transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent(answeredCount, participantCount)}%` }} />
        </div>
      </div>
    </div>
  )
}
