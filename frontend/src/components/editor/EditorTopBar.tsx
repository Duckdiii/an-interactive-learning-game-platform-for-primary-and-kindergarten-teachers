import { Link } from 'react-router-dom'
import { gameStatusLabel, gameTypeLabel, gradeLevelLabel, subjectLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import { ROUTES } from '../../routes/paths'
import type { AutosaveStatus } from '../../hooks/useGameEditor'
import Button from '../Button'
import Icon from '../ui/Icon'
import LetterTiles from '../ui/LetterTiles'
import MockBadge from '../ui/MockBadge'
import SubjectChip from '../ui/SubjectChip'
import { subjectTheme } from '../ui/subjectTheme'

interface EditorTopBarProps {
  title: string
  subject: string
  gradeLevel: string
  gameType: string
  questionCount: number
  gameStatus: string
  isPublished: boolean
  mock: boolean
  autosave: AutosaveStatus
  // Số lỗi kiểm tra còn lại khi autosave = 'blocked'.
  issueCount: number
  // Còn chữ vừa gõ chưa vào bản đang soạn (đang kiểm tra từ ngữ): chưa cho Chơi thử trên bản cũ.
  applying: boolean
  // Đang xuất bản (đã gồm lưu).
  publishing: boolean
  saving: boolean
  // Đang chơi thử: ẩn nhãn tự lưu và hai nút (như thanh lưu cũ), chỉ còn phần nhận diện game.
  playing: boolean
  // Lưu lỗi nhưng thử lại vô ích (ví dụ phòng chơi chưa kết thúc): chỉ báo, không mời thử lại.
  canRetry: boolean
  onViewIssues: () => void
  onRetry: () => void
  onPublish: () => void
  onPlayTest: () => void
}

// Thanh trên cùng của trình soạn thảo: tên game, nhãn tự lưu (chữ + chấm, không chỉ màu; nằm trong role="status" để đọc to khi đổi) và hai nút Chơi thử / Xuất bản.
export default function EditorTopBar({
  title,
  subject,
  gradeLevel,
  gameType,
  questionCount,
  gameStatus,
  isPublished,
  mock,
  autosave,
  issueCount,
  applying,
  publishing,
  saving,
  playing,
  canRetry,
  onViewIssues,
  onRetry,
  onPublish,
  onPlayTest,
}: EditorTopBarProps) {
  const text = viText.editor.save
  const theme = subjectTheme(subject)
  const tile = [{ glyph: theme.tiles[0], className: `bg-white border-2 ${theme.chipBorder} ${theme.ink}` }]

  // Chấm màu: brand = đã lưu, sun = đang chờ/chưa lưu, warn = lỗi (không dùng đỏ gắt).
  let label: string
  let dot = 'bg-sun'
  let tone = 'text-ink'

  if (publishing) {
    label = viText.editor.publish.publishing
  } else if (applying) {
    label = text.applying
  } else if (autosave === 'saved') {
    label = text.autosaved
    dot = 'bg-brand'
    tone = 'text-brand-strong'
  } else if (autosave === 'saving') {
    label = text.autosaving
  } else if (autosave === 'blocked') {
    label = text.autosaveBlocked(issueCount)
    dot = 'bg-warn-ink'
    tone = 'text-warn-ink'
  } else if (autosave === 'error') {
    label = text.autosaveFailed
    dot = 'bg-warn-ink'
    tone = 'text-warn-ink'
  } else if (autosave === 'waitingRestore') {
    label = text.autosaveWaitingRestore
  } else {
    label = text.autosavePending
  }

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <Link
        to={ROUTES.workspace}
        aria-label={text.backToGamesLabel}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface text-xl font-extrabold text-ink shadow-sm hover:bg-brand-soft"
      >
        <span aria-hidden="true">‹</span>
      </Link>
      <LetterTiles tiles={tile} className="shrink-0 pb-1" />
      <div className="min-w-0 flex-1 basis-56">
        <h1 className="text-2xl font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-3xl">{title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SubjectChip subject={subject} label={`${subjectLabel(subject)} · ${gradeLevelLabel(gradeLevel)}`} />
          <span className="rounded-full bg-paper px-3 py-1 text-sm font-bold text-ink">
            {text.questionsOf(gameTypeLabel(gameType), questionCount)}
          </span>
          <span
            className={[
              'rounded-full px-3 py-1 text-sm font-bold',
              isPublished ? 'bg-brand-soft text-brand-strong' : 'bg-sun-soft text-ink ring-1 ring-sun',
            ].join(' ')}
          >
            {gameStatusLabel(gameStatus)}
          </span>
          {mock ? <MockBadge /> : null}
        </div>
      </div>
      {playing ? null : (
        <>
      <div className={`flex min-h-11 flex-wrap items-center gap-2 text-sm font-bold ${tone}`}>
        {/* Chỉ nhãn nằm trong vùng đọc to; hai nút để ngoài để trình đọc màn hình không đọc lại tên nút mỗi lần nhãn đổi. */}
        <p role="status" className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
          <span>{label}</span>
        </p>
        {!publishing && !applying && autosave === 'blocked' ? (
          <button type="button" onClick={onViewIssues} className="min-h-11 px-2 font-bold underline">
            {text.showIssues}
          </button>
        ) : null}
        {!publishing && !applying && autosave === 'error' && canRetry ? (
          <button type="button" onClick={onRetry} className="min-h-11 px-2 font-bold underline">
            {text.retry}
          </button>
        ) : null}
      </div>
      <div className="flex gap-3 sm:ml-auto">
        <Button id="play-test-button" type="button" variant="secondary" disabled={applying} onClick={onPlayTest}>
          <Icon name="play" className="mr-2 h-4 w-4" />
          {viText.editor.play.button}
        </Button>
        <Button id="publish-button" type="button" onClick={onPublish} disabled={saving || applying}>
          {publishing ? viText.editor.publish.publishing : isPublished ? viText.editor.publish.buttonAgain : viText.editor.publish.button}
        </Button>
      </div>
        </>
      )}
    </header>
  )
}
