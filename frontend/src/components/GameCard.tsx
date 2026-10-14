import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  gameStatusLabel,
  gameTypeLabel,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { ROUTES } from '../routes/paths'
import type { GameSummary } from '../types/game-summary.types'
import { formatRelativeTime } from '../utils/relativeTime'
import { buttonClass } from './buttonStyles'
import Icon from './ui/Icon'
import GameTypeCover from './ui/GameTypeCover'
import { subjectTheme } from './ui/subjectTheme'

interface GameCardProps {
  game: GameSummary
  // Mốc "bây giờ" do trang truyền xuống để mọi thẻ cùng một mốc và test không phụ thuộc đồng hồ.
  now: number
}

// Điện thoại: thẻ nằm ngang gọn (ô môn học nhỏ bên trái) để xem được nhiều game trong một màn hình.
// Máy tính bảng trở lên: thẻ dọc có hình bìa lớn.
export default function GameCard({ game, now }: GameCardProps) {
  const theme = subjectTheme(game.subject)
  const isPublished = game.status === 'PUBLISHED'
  const { copiedValue, copy } = useCopyToClipboard()
  const [copyFailed, setCopyFailed] = useState(false)
  const justCopied = Boolean(game.shareCode) && copiedValue === game.shareCode

  return (
    <article className="flex overflow-hidden rounded-2xl border-2 border-ink/10 bg-white transition hover:border-brand/40 hover:shadow-md sm:flex-col">
      <div className="w-24 shrink-0 sm:w-auto">
        {game.thumbnailUrl ? (
          <div className="aspect-[16/9] h-full bg-paper sm:h-auto">
            <img src={game.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <>
            <div className="h-full sm:hidden">
              <GameTypeCover gameType={game.gameType} subject={game.subject} compact />
            </div>
            <div className="hidden sm:block">
              <GameTypeCover gameType={game.gameType} subject={game.subject} />
            </div>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${theme.chip}`}>
            {subjectLabel(game.subject)} · {gradeLevelLabel(game.gradeLevel)}
          </span>
          <span
            className={[
              'rounded-full px-3 py-1 text-sm font-bold',
              isPublished
                ? 'bg-brand-soft text-brand-strong'
                : 'bg-sun-soft text-ink ring-1 ring-sun',
            ].join(' ')}
          >
            {gameStatusLabel(game.status)}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-ink sm:text-xl">
            {game.title}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {gameTypeLabel(game.gameType)}
          </p>
        </div>

        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="clock" className="h-4 w-4 shrink-0" />
          {viText.gameCard.updated} {formatRelativeTime(game.updatedAt, now)}
        </p>

        {isPublished && game.shareCode ? (
          <div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-paper py-1 pl-3 pr-1">
              <div>
                <p className="text-xs font-semibold text-ink-soft">{viText.gameCard.shareCode}</p>
                <p className="font-mono text-lg font-extrabold leading-tight tracking-widest text-ink">
                  {game.shareCode}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copy(game.shareCode as string)
                  setCopyFailed(!ok)
                }}
                aria-label={`${viText.gameCard.copyCode} ${game.shareCode}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-strong transition hover:bg-brand-soft"
              >
                <Icon name={justCopied ? 'check' : 'copy'} className="h-4 w-4" />
                {justCopied ? viText.gameCard.copied : viText.gameCard.copyShort}
              </button>
            </div>
            {/* Trình duyệt chặn clipboard (trang không an toàn...): nói rõ để cô tự chép mã, không im lặng. */}
            <p role="status" className={copyFailed ? 'mt-1 text-sm text-ink' : 'text-sm'}>
              {copyFailed ? viText.gameCard.copyFailed : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">{viText.gameCard.notPublished}</p>
        )}

        <div className="mt-auto pt-1">
          <Link
            to={`${ROUTES.workspaceEditor}?gameId=${encodeURIComponent(game.gameId)}`}
            className={`${buttonClass('secondary')} min-h-11 w-full gap-2 sm:w-auto`}
            aria-label={`${viText.gameCard.edit}: ${game.title}`}
          >
            <Icon name="pencil" className="h-4 w-4" />
            {viText.gameCard.edit}
          </Link>
        </div>
      </div>
    </article>
  )
}
