import { useEffect, useRef } from 'react'
import { viText } from '../../constants/viText'
import type { GameDsl } from '../../types/game-dsl.types'
import { summarizeQuestions } from '../../utils/questionSummary'
import Button from '../Button'
import GameTypeCover from '../ui/GameTypeCover'

interface UnsupportedPlayTestProps {
  game: GameDsl
  onExit: () => void
}

// Loại game chưa có renderer chơi thử: KHÔNG giả lập. Hiện ảnh minh họa tĩnh của loại game đó (không để trống), thông báo rõ và
// nội dung chữ của từng câu để giáo viên vẫn kiểm tra được.
export default function UnsupportedPlayTest({ game, onExit }: UnsupportedPlayTestProps) {
  const text = viText.editor.play
  const headingRef = useRef<HTMLHeadingElement>(null)
  const summaries = summarizeQuestions(game)

  useEffect(() => headingRef.current?.focus(), [])

  return (
    <section aria-labelledby="play-unsupported-title" className="space-y-5 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <div className="max-w-md overflow-hidden rounded-xl">
        <GameTypeCover gameType={game.gameType} subject={game.metadata.subject} />
      </div>
      <div role="status">
        <h2 id="play-unsupported-title" ref={headingRef} tabIndex={-1} className="text-xl font-extrabold focus:outline-none">
          {text.unsupportedTitle}
        </h2>
        <p className="mt-2 text-base leading-7 text-ink-soft">{text.unsupportedDescription}</p>
      </div>
      <ol aria-label={text.unsupportedListLabel} className="space-y-2">
        {summaries.map((summary, index) => (
          <li key={index} className="rounded-xl border-2 border-ink/10 px-3 py-2 text-base">
            <span className="font-bold">
              {viText.editor.questionLabel} {index + 1}:
            </span>{' '}
            {summary}
          </li>
        ))}
      </ol>
      <Button type="button" onClick={onExit}>
        {text.backToEdit}
      </Button>
    </section>
  )
}
