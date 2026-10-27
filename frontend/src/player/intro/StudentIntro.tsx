import { viText } from '../../constants/viText'
import { gradeLevelLabel, subjectLabel } from '../../constants/labels'
import PlayButton from '../components/PlayButton'
import type { IntroProps } from './types'

const text = viText.player.intro

// Hs-Intro: tên game, môn/lớp, số câu, cách chơi và công tắc tự đọc đề.
export default function StudentIntro({ info, playable, autoRead, onAutoReadChange, onStart }: IntroProps) {
  return (
    <main data-band="hocSinh" className="grid min-h-screen place-items-start bg-play-page play-safe-x play-safe-y text-play-ink md:place-items-center">
      <div className="w-full min-w-0 md:max-w-md md:rounded-2xl md:border md:border-play-outline md:bg-play-surface md:p-8">
        <h1 className="text-3xl font-bold">{info.gameTitle}</h1>
        <p className="mt-1 text-play-ink-soft">{text.meta(subjectLabel(info.metadata.subject), gradeLevelLabel(info.metadata.gradeLevel))}</p>
        <p className="text-play-ink-soft">{text.questionCount(info.questionCount)}</p>
        <h2 className="mt-6 text-lg font-bold">{text.howToTitle}</h2>
        <ul className="mt-2 list-disc pl-6">
          {text.howTo.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {playable ? (
          <>
            <label className="mt-6 flex min-h-[var(--play-min-touch)] cursor-pointer items-center gap-3 text-lg">
              <input type="checkbox" role="switch" checked={autoRead} onChange={(event) => onAutoReadChange(event.target.checked)} className="size-6" />
              {text.autoRead}
            </label>
            <PlayButton className="mt-6 w-full" onClick={onStart}>
              {viText.player.startButton}
            </PlayButton>
          </>
        ) : (
          <p role="alert" className="mt-6 text-lg text-play-ink-soft">
            {viText.player.unsupported}
          </p>
        )}
      </div>
    </main>
  )
}
