import { gradeLevelLabel, subjectLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import type { GameResponse } from '../../types/game-response.types'
import Mascot from '../theme/Mascot'

const text = viText.present.lobby
const chip = 'rounded-full bg-play-surface px-5 py-2 text-2xl font-extrabold text-play-ink ring-2 ring-play-outline'

// Tv-Lobby (SPEC A1): màn chờ trước khi chơi, cả lớp nhìn lên tivi. Nút của giáo viên nằm ở thanh dưới (PresentShell).
export default function PresentLobby({ game }: { game: GameResponse }) {
  return (
    <div className="m-auto flex flex-col items-center gap-8 px-16 text-center">
      <div className="flex flex-wrap justify-center gap-3">
        <span className={chip}>{subjectLabel(game.metadata.subject)}</span>
        <span className={chip}>{gradeLevelLabel(game.metadata.gradeLevel)}</span>
        <span className={chip}>{text.questionCount.replace('{n}', String(game.questions.length))}</span>
      </div>
      {/* Tối đa 2 dòng: tên dài hơn sẽ đẩy chip và nhân vật ra khỏi khung 720px. */}
      <h1 className="line-clamp-2 break-words text-7xl font-extrabold leading-tight">{game.metadata.title}</h1>
      <Mascot state="greet" className="text-8xl" />
      <p className="text-4xl font-bold text-play-ink-soft">{text.ready}</p>
    </div>
  )
}
