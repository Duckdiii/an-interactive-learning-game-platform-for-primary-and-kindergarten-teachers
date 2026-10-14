import { Suspense, lazy, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import LoadingSpinner from '../components/LoadingSpinner'
import DraftRestoreNotice from '../components/editor/DraftRestoreNotice'
import EditorLayout from '../components/editor/EditorLayout'
import type { EditorPane } from '../components/editor/EditorLayout'
import GameInfoForm from '../components/editor/GameInfoForm'
import PlayTestBoundary from '../components/editor/PlayTestBoundary'
import QuestionList from '../components/editor/QuestionList'
import SaveBar from '../components/editor/SaveBar'
import ErrorNotice from '../components/ui/ErrorNotice'
import GameTypeCover from '../components/ui/GameTypeCover'
import LetterTiles from '../components/ui/LetterTiles'
import MockBadge from '../components/ui/MockBadge'
import { MIXED_TILES } from '../components/ui/tileSets'
import { subjectTheme } from '../components/ui/subjectTheme'
import {
  gameStatusLabel,
  gameTypeLabel,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { isMock } from '../config/mockMode'
import { useGame } from '../hooks/useGame'
import { useGameEditor } from '../hooks/useGameEditor'
import { usePageTitle } from '../hooks/usePageTitle'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { ROUTES } from '../routes/paths'
import type { GameResponse } from '../types/game-response.types'
import { parseApiError } from '../utils/apiError'
import { summarizeQuestions } from '../utils/questionSummary'
import { formatRelativeTime } from '../utils/relativeTime'

const text = viText.editor

// Màn chơi thử kéo theo renderer Canvas (react-konva): chỉ tải khi giáo viên bấm "Chơi thử" để trang soạn thảo mở nhanh.
const loadPlayTestPanel = () => import('../components/editor/PlayTestPanel')

// Thẻ thông báo cho các trạng thái không có game để soạn (chưa chọn, không tìm thấy): tiêu đề h1 + lối về.
function EditorMessage({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-3xl border-2 border-dashed border-ink/20 bg-white p-6 sm:p-10">
      <LetterTiles tiles={MIXED_TILES} />
      <h1 className="mt-8 text-2xl font-extrabold sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">{description}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to={ROUTES.workspace}>{text.backToGames}</ButtonLink>
        <ButtonLink to={ROUTES.createGame} variant="secondary">
          {text.createInstead}
        </ButtonLink>
      </div>
    </section>
  )
}

// Khung giữ chỗ khi đang tải: hai khối cùng bố cục với trang thật để trang không giật khi dữ liệu về.
function EditorSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <LoadingSpinner label={text.loading} />
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-ink/10 motion-reduce:animate-none" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-ink/10 motion-reduce:animate-none" />
      </div>
    </div>
  )
}

function EditorWorkspace({ game }: { game: GameResponse }) {
  const editor = useGameEditor(game)
  const { draft } = editor
  const [selected, setSelected] = useState(0)
  const [pane, setPane] = useState<EditorPane>('list')
  const [playing, setPlaying] = useState(false)
  // `lazy` ghi nhớ cả lần tải LỖI: muốn thử lại sau khi mạng ổn lại phải dựng `lazy` mới, nên tạo lại mỗi lần thoát khỏi màn chơi thử.
  const [PlayTestPanel, setPlayTestPanel] = useState(() => lazy(loadPlayTestPanel))
  // Đã bấm "Chơi thử" mà dữ liệu chưa đủ: lỗi được tính lại theo từng lần sửa để sửa xong là hết.
  const [playAttempted, setPlayAttempted] = useState(false)
  const summaries = useMemo(() => summarizeQuestions(draft), [draft])
  const questionsWithIssues = useMemo(
    () => new Set(editor.issues.map((issue) => issue.questionIndex).filter((value) => value !== null)),
    [editor.issues],
  )
  const items = draft.questions.map((question, position) => ({
    summary: summaries[position],
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    hasIssue: questionsWithIssues.has(position),
  }))
  const index = Math.min(selected, Math.max(0, items.length - 1))
  const current = items[index]
  const theme = subjectTheme(game.metadata.subject)
  const isPublished = game.status === 'PUBLISHED'
  const title = draft.metadata.title.trim() || text.untitled
  const saveText = text.save
  const conflict = editor.saveError?.code === 'CONFLICT'

  useUnsavedChangesGuard(editor.dirty, saveText.leaveConfirm)

  // Đưa tiêu điểm tới ô cần chú ý (sau khi khôi phục hoặc khi lưu bị chặn) để người dùng bàn phím và trình đọc màn hình không mất vị trí.
  const focusField = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

  const handleSave = () => {
    const first = editor.save().find((issue) => issue.questionIndex === null)

    if (first) focusField(first.field === 'metadata.topic' ? 'game-topic' : 'game-title')
  }

  const playIssues = playAttempted ? editor.validate() : []

  const startPlay = () => {
    setPlayAttempted(true)

    // UC-03 luồng 2a: dữ liệu chưa đủ thì không mở màn chơi thử, giữ giáo viên ở màn soạn thảo.
    const found = editor.validate()

    if (found.length > 0) {
      const first = found.find((issue) => issue.questionIndex === null)

      if (first) focusField(first.field === 'metadata.topic' ? 'game-topic' : 'game-title')

      return
    }

    setPlaying(true)
  }

  const exitPlay = () => {
    setPlaying(false)
    setPlayTestPanel(() => lazy(loadPlayTestPanel))
    setPlayAttempted(false)
    // Trở về đúng nút đã bấm để người dùng bàn phím không mất vị trí.
    focusField('play-test-button')
  }

  const choose = (next: number) => {
    setSelected(next)
    // Điện thoại chỉ hiện một khung: chọn câu xong thì chuyển sang xem câu đó.
    setPane('preview')
  }

  const preview = (
    <div className="space-y-4 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-extrabold">{text.previewHeading}</h2>
      {current ? (
        <div aria-live="polite">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
            {text.questionLabel} {index + 1}
          </p>
          <p className="mt-1 text-xl font-bold leading-8">{current.summary}</p>
          <p className="mt-2 text-base text-ink-soft">
            {current.timeLimitSeconds} {text.seconds} · {current.points} {text.points}
          </p>
        </div>
      ) : (
        <p className="text-base text-ink-soft">{text.emptyQuestions}</p>
      )}
      <div className="max-w-sm overflow-hidden rounded-xl">
        <GameTypeCover gameType={game.gameType} subject={game.metadata.subject} />
      </div>
      <p className="flex items-start gap-2 rounded-xl bg-sun-soft px-4 py-3 text-base">
        <span className="shrink-0 font-bold">{text.comingTag}.</span>
        <span>{text.previewNote}</span>
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">{text.kicker}</p>
          {isMock('editor') ? <MockBadge /> : null}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${theme.chip}`}>
            {subjectLabel(game.metadata.subject)} · {gradeLevelLabel(game.metadata.gradeLevel)}
          </span>
          <span className="rounded-full bg-paper px-3 py-1 text-sm font-bold text-ink">
            {gameTypeLabel(game.gameType)}
          </span>
          <span
            className={[
              'rounded-full px-3 py-1 text-sm font-bold',
              isPublished ? 'bg-brand-soft text-brand-strong' : 'bg-sun-soft text-ink ring-1 ring-sun',
            ].join(' ')}
          >
            {gameStatusLabel(game.status)}
          </span>
          <span className="text-sm text-ink-soft">
            {items.length} {text.questionCount} · {text.updatedPrefix}{' '}
            {formatRelativeTime(game.updatedAt).toLowerCase()}
          </span>
        </div>
      </header>

      {playing ? (
        <PlayTestBoundary onExit={exitPlay}>
          <Suspense
            fallback={
              <div role="status">
                <LoadingSpinner label={text.play.loading} />
              </div>
            }
          >
            <PlayTestPanel game={editor.draft} onExit={exitPlay} />
          </Suspense>
        </PlayTestBoundary>
      ) : (
        <>
          {editor.pendingRestore ? (
            <DraftRestoreNotice
              draft={editor.pendingRestore}
              serverUpdatedAt={game.updatedAt}
              onRestore={() => {
                editor.restore()
                focusField('game-title')
              }}
              onDiscard={() => {
                editor.discardRestore()
                focusField('game-title')
              }}
            />
          ) : null}

          <SaveBar
            dirty={editor.dirty}
            saving={editor.saving}
            saved={editor.savedNotice}
            isPublished={isPublished}
            onSave={handleSave}
            onPlayTest={startPlay}
          />

          {playIssues.length > 0 ? (
            <ErrorNotice
              title={text.play.invalidTitle}
              message={text.play.invalidData}
              action={
                <ul className="list-disc space-y-1 pl-5 text-base">
                  {playIssues.map((issue) => (
                    <li key={`${issue.questionIndex}-${issue.field}-${issue.code}`}>{issue.message}</li>
                  ))}
                </ul>
              }
            />
          ) : null}

          {editor.issues.length > 0 ? (
            <ErrorNotice
              title={saveText.invalidTitle}
              message={editor.issueSummary ?? ''}
              action={
                <ul className="list-disc space-y-1 pl-5 text-base">
                  {editor.issues.map((issue) => (
                    <li key={`${issue.questionIndex}-${issue.field}-${issue.code}`}>{issue.message}</li>
                  ))}
                </ul>
              }
            />
          ) : null}

          {editor.saveError ? (
            <ErrorNotice
              title={saveText.saveErrorTitle}
              message={conflict ? saveText.conflict : `${editor.saveError.message} ${saveText.keptNote}`}
              action={
                conflict ? null : (
                  <Button type="button" onClick={editor.save} disabled={editor.saving}>
                    {saveText.retry}
                  </Button>
                )
              }
            />
          ) : null}

          <GameInfoForm
            metadata={draft.metadata}
            issues={editor.issues}
            disabled={Boolean(editor.pendingRestore)}
            onTitleChange={editor.setTitle}
            onTopicChange={editor.setTopic}
          />

          <EditorLayout
            pane={pane}
            onPaneChange={setPane}
            questionCount={items.length}
            list={<QuestionList items={items} selectedIndex={index} onSelect={choose} />}
            preview={preview}
          />
        </>
      )}
    </div>
  )
}

export default function WorkspaceEditor() {
  usePageTitle(text.kicker)
  const [params] = useSearchParams()
  const gameId = params.get('gameId')
  const query = useGame(gameId)

  if (!gameId) {
    return <EditorMessage title={text.noGameTitle} description={text.noGameDescription} />
  }

  if (query.isPending) return <EditorSkeleton />

  // Chỉ báo lỗi khi CHƯA có game để hiện: lần tải lại nền thất bại (đổi tab rồi quay lại, mất mạng thoáng qua) không được
  // thay game đang xem, và sau này là nội dung đang soạn dở, bằng một màn lỗi.
  if (query.data === undefined) {
    const parsed = parseApiError(query.error, text.loadErrorTitle)

    if (parsed.code === 'NOT_FOUND') {
      return <EditorMessage title={text.notFoundTitle} description={text.notFoundDescription} />
    }

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{text.kicker}</h1>
        <ErrorNotice
          title={text.loadErrorTitle}
          message={parsed.message}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
                {text.retry}
              </Button>
              <ButtonLink to={ROUTES.workspace} variant="secondary">
                {text.backToGames}
              </ButtonLink>
            </div>
          }
        />
      </div>
    )
  }

  // `key` theo gameId: đổi sang game khác thì câu đang chọn và khung đang xem được đặt lại.
  return <EditorWorkspace key={query.data.gameId} game={query.data} />
}
