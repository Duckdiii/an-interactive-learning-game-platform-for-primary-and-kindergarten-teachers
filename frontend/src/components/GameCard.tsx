import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveShareUrl } from '../config/studentApp'
import { gameStatusLabel, gameTypeLabel, gradeLevelLabel } from '../constants/labels'
import { viText } from '../constants/viText'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { resultsLink } from '../utils/insights'
import { useNewGameIds } from '../utils/newGames'
import { ROUTES } from '../routes/paths'
import type { GameSummary } from '../types/game-summary.types'
import { buttonClass } from './buttonStyles'
import Card from './ui/Card'
import SubjectChip from './ui/SubjectChip'
import { subjectTheme } from './ui/subjectTheme'

interface GameCardProps {
  game: GameSummary
}

const TILE_CLASS = 'grid h-16 w-16 place-items-center rounded-2xl border-2 bg-surface font-display text-4xl font-bold'

export default function GameCard({ game }: GameCardProps) {
  const isPublished = game.status === 'PUBLISHED'
  // Game vừa tạo bằng AI trong phiên này: chỉ nằm trong bộ nhớ của tab, hết khi giáo viên mở game.
  const isNew = useNewGameIds().has(game.gameId)
  const theme = subjectTheme(game.subject)
  const editUrl = `${ROUTES.workspaceEditor}?gameId=${encodeURIComponent(game.gameId)}`
  // Cùng một địa chỉ cho "Trình chiếu" và "Sao chép liên kết": shareUrl của Backend nếu an toàn, nếu không thì ghép từ địa chỉ trang học sinh.
  const shareLink = game.shareCode ? resolveShareUrl(game.shareCode, game.shareUrl) : null

  const { copiedValue, copy } = useCopyToClipboard()
  const [copyFailed, setCopyFailed] = useState(false)
  const justCopied = Boolean(shareLink) && copiedValue === shareLink

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      moreRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const menuItemClass =
    'flex min-h-12 w-full items-center px-4 text-left text-base font-semibold text-ink hover:bg-brand-soft'

  return (
    <Card as="article" padding="none" className="flex flex-col">
      <div className={`relative h-36 overflow-hidden rounded-t-card ${theme.cover}`}>
        {game.thumbnailUrl ? (
          <img src={game.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <div aria-hidden="true" className="flex h-full items-center justify-center gap-3">
              <span className={`-rotate-6 ${TILE_CLASS} ${theme.chipBorder} ${theme.ink}`}>
                {theme.tiles[0]}
              </span>
              <span className={`rotate-3 ${TILE_CLASS} ${theme.chipBorder} ${theme.ink}`}>
                {theme.tiles[1]}
              </span>
            </div>
            <span
              aria-hidden="true"
              className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-current opacity-20 ${theme.mark}`}
            />
          </>
        )}
        <span
          className={[
            'absolute right-3 top-3 rounded-full px-3 py-1 text-sm font-bold',
            isPublished ? 'bg-brand text-white' : 'bg-surface text-warn-ink',
          ].join(' ')}
        >
          {gameStatusLabel(game.status)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SubjectChip subject={game.subject} />
          {isNew ? (
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">
              {viText.gameCard.newBadge}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-ink">
            {game.title}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {gradeLevelLabel(game.gradeLevel)} · {gameTypeLabel(game.gameType)}
          </p>
          {/* Mã chơi để cô đọc to cho học sinh gõ ở trang /join (chọn được để sao chép tay). */}
          {isPublished && game.shareCode ? (
            <p className="mt-1 text-sm text-ink-soft">
              {viText.gameCard.codeLabel}{' '}
              <span className="select-all font-mono text-base font-bold tracking-widest text-ink">{game.shareCode}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          {!isPublished ? (
            <Link to={editUrl} className={`${buttonClass('secondary')} flex-1`}>
              {viText.gameCard.continueEdit}
            </Link>
          ) : shareLink ? (
            // tạm: mở trang chơi; đổi sang /present khi có P4
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonClass('primary')} flex-1`}
            >
              {viText.gameCard.present}{' '}
              <span className="sr-only">({viText.gameCard.presentHint})</span>
            </a>
          ) : (
            <Link to={editUrl} className={`${buttonClass('secondary')} flex-1`}>
              {viText.gameCard.edit}
            </Link>
          )}

          <div
            ref={menuRef}
            className="relative"
            // Tab ra khỏi nút và danh sách thao tác thì đóng (không để danh sách mở treo).
            onBlur={(event) => {
              if (!menuRef.current?.contains(event.relatedTarget as Node | null)) setMenuOpen(false)
            }}
          >
            <button
              ref={moreRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={`more-${game.gameId}`}
              aria-label={viText.gameCard.moreActions.replace('{title}', game.title)}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl border-2 border-line bg-surface text-xl font-bold text-ink hover:bg-brand-soft"
            >
              <span aria-hidden="true">…</span>
            </button>
            {menuOpen ? (
              // Danh sách mở/đóng (disclosure), không dùng role=menu vì không có điều hướng bằng phím mũi tên.
              <div
                id={`more-${game.gameId}`}
                className="absolute bottom-full right-0 z-10 mb-2 w-52 overflow-hidden rounded-2xl border border-line bg-surface shadow-card-hover"
              >
                <Link
                  to={editUrl}
                  onClick={() => setMenuOpen(false)}
                  className={menuItemClass}
                >
                  {viText.gameCard.edit}
                </Link>
                {isPublished ? (
                  <Link
                    to={resultsLink(game.gameId)}
                    onClick={() => setMenuOpen(false)}
                    className={menuItemClass}
                  >
                    {viText.gameCard.viewResults}
                  </Link>
                ) : null}
                {shareLink ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false)
                      moreRef.current?.focus()
                      setCopyFailed(!(await copy(shareLink)))
                    }}
                    className={menuItemClass}
                  >
                    {viText.gameCard.copyLink}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Trình duyệt chặn clipboard (trang không an toàn...): nói rõ để cô tự chép liên kết, không im lặng. */}
        <p role="status" className={copyFailed || justCopied ? 'text-sm text-ink' : 'sr-only'}>
          {copyFailed ? viText.gameCard.copyFailed : justCopied ? viText.gameCard.copied : ''}
        </p>
      </div>
    </Card>
  )
}
