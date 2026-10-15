import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import LoadingSpinner from '../components/LoadingSpinner'
import DraftRestoreNotice from '../components/editor/DraftRestoreNotice'
import EditorLayout from '../components/editor/EditorLayout'
import type { EditorPane } from '../components/editor/EditorLayout'
import GameInfoForm from '../components/editor/GameInfoForm'
import PlayTestBoundary from '../components/editor/PlayTestBoundary'
import { playTestPanelLoader } from '../components/editor/playTestPanelLoader'
import { PendingEditsContext } from '../components/editor/forms/PendingEditsContext'
import { buttonClass } from '../components/buttonStyles'
import RegenerateQuestionControls from '../components/editor/forms/RegenerateQuestionControls'
import QuestionEditor from '../components/editor/forms/QuestionEditor'
import { VoiceContext } from '../components/editor/forms/VoiceContext'
import type { VoiceGender } from '../services/mediaService'
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
import { groupByQuestion } from '../utils/gameValidation'
import { summarizeQuestions } from '../utils/questionSummary'
import { formatRelativeTime } from '../utils/relativeTime'

const text = viText.editor

// Màn chơi thử kéo theo renderer Canvas (react-konva): chỉ tải khi giáo viên bấm "Chơi thử" để trang soạn thảo mở nhanh.
const loadPlayTestPanel = () => playTestPanelLoader.load()

// Thẻ thông báo cho các trạng thái không có game để soạn (chưa chọn, không tìm thấy): tiêu đề h1 + lối về.
function EditorMessage({ title, description }: { title: string; description: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Từ khung chờ (role=status) chuyển sang thông báo này thì trình đọc màn hình không nghe gì: đưa tiêu điểm vào tiêu đề.
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), [])

  return (
    <section className="rounded-3xl border-2 border-dashed border-ink/20 bg-white p-6 sm:p-10">
      <LetterTiles tiles={MIXED_TILES} />
      <h1 ref={headingRef} tabIndex={-1} className="mt-8 text-2xl font-extrabold focus:outline-none sm:text-3xl">
        {title}
      </h1>
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
  // Vừa nhờ AI làm lại (hoặc vừa hoàn tác) câu nào: để hiện thông báo kèm nút Hoàn tác. Nằm ở đây vì thẻ sửa câu được dựng lại sau khi áp câu mới.
  const [regenNotice, setRegenNotice] = useState<{ kind: 'applied' | 'undone'; questionId: string } | null>(null)
  // Số ô chữ còn chữ vừa gõ chưa vào bản đang soạn (xem `PendingEditsContext`).
  const [pendingEdits, setPendingEdits] = useState(0)
  const beginEdit = useCallback(() => {
    setPendingEdits((count) => count + 1)

    return () => setPendingEdits((count) => Math.max(0, count - 1))
  }, [])
  const pendingApi = useMemo(() => ({ begin: beginEdit, pending: pendingEdits > 0 }), [beginEdit, pendingEdits])
  // Giọng đọc đang chọn cho các lần tạo giọng đọc (FLD-12): giữ ở đây để đổi sang câu khác vẫn còn nguyên.
  const [voice, setVoice] = useState<VoiceGender>('FEMALE')
  const voiceApi = useMemo(() => ({ voice, setVoice }), [voice])
  const applying = pendingEdits > 0
  // `lazy` ghi nhớ cả lần tải LỖI: muốn thử lại sau khi mạng ổn lại phải dựng `lazy` mới, nên tạo lại mỗi lần thoát khỏi màn chơi thử.
  const [PlayTestPanel, setPlayTestPanel] = useState(() => lazy(loadPlayTestPanel))
  // Đã bấm "Chơi thử" mà dữ liệu chưa đủ: lỗi được tính lại theo từng lần sửa để sửa xong là hết.
  const [playAttempted, setPlayAttempted] = useState(false)
  const summaries = useMemo(() => summarizeQuestions(draft), [draft])
  // Câu nào còn lỗi (tính trực tiếp, không đợi bấm Lưu) thì danh sách đánh dấu "Cần sửa".
  const issuesByQuestion = useMemo(() => groupByQuestion(editor.liveIssues), [editor.liveIssues])
  const items = draft.questions.map((question, position) => ({
    summary: summaries[position],
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    hasIssue: issuesByQuestion.has(position),
  }))
  const index = Math.min(selected, Math.max(0, items.length - 1))

  if (selected !== index) setSelected(index)
  const current = items[index]
  const theme = subjectTheme(game.metadata.subject)
  const isPublished = game.status === 'PUBLISHED'
  const title = draft.metadata.title.trim() || text.untitled
  const saveText = text.save
  const conflict = editor.saveError?.code === 'CONFLICT'

  useUnsavedChangesGuard(editor.dirty || applying, saveText.leaveConfirm)

  // Vừa áp câu AI làm lại (hoặc vừa hoàn tác): nút/hộp thoại đang giữ tiêu điểm vừa bị gỡ, đưa tiêu điểm tới thông báo để người dùng bàn phím và trình đọc màn hình không rơi về đầu trang.
  useEffect(() => {
    if (regenNotice) document.getElementById('regenerate-notice')?.focus()
  }, [regenNotice])

  // Đưa tiêu điểm tới ô cần chú ý (sau khi khôi phục hoặc khi lưu bị chặn) để người dùng bàn phím và trình đọc màn hình không mất vị trí.
  const focusField = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

  const handleSave = () => {
    setRegenNotice((notice) => (notice?.kind === 'undone' ? null : notice))
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
    setRegenNotice(null)
    // Điện thoại chỉ hiện một khung: chọn câu xong thì chuyển sang xem câu đó.
    setPane('preview')
    // Nút vừa bấm nằm trong khung danh sách sắp bị ẩn: đưa tiêu điểm sang khung mới để người dùng bàn phím không rơi về đầu trang.
    // Trên máy tính khung danh sách vẫn hiện nên giữ nguyên tiêu điểm.
    requestAnimationFrame(() => {
      const list = document.getElementById('editor-pane-list')

      if (list && getComputedStyle(list).display === 'none') document.getElementById('editor-pane-preview')?.focus()
    })
  }

  const previewCard = (
    <div className="space-y-4 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-extrabold">{text.previewHeading}</h2>
      {current ? (
        <div>
          {/* Chỉ báo khi ĐỔI CÂU, không đọc lại nội dung mỗi lần gõ. */}
          <p role="status" className="sr-only">
            {text.questionLabel} {index + 1}
          </p>
          <p aria-hidden="true" className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
            {text.questionLabel} {index + 1}
          </p>
          <p className="mt-1 [overflow-wrap:anywhere] text-xl font-bold leading-8">{current.summary}</p>
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

  const currentQuestionId = current ? draft.questions[index]?.id : undefined
  const undoable = currentQuestionId !== undefined && editor.regeneratedIds.includes(currentQuestionId)
  const noticeForCurrent = regenNotice !== null && regenNotice.questionId === currentQuestionId ? regenNotice.kind : null
  const regenText = viText.editor.regenerate

  const undoRegenerated = () => {
    if (currentQuestionId === undefined) return

    if (applying) return

    editor.undoRegenerated(index, currentQuestionId)
    setRegenNotice({ kind: 'undone', questionId: currentQuestionId })
  }

  // Khung sửa (form theo loại game) nằm trên phần xem: sửa xong là phần xem bên dưới và danh sách câu cập nhật ngay.
  const preview = (
    <div className="space-y-6">
      {/* Vùng thông báo luôn có mặt (chỉ đổi chữ) để trình đọc màn hình đọc được thông báo mới. */}
      <div role="status" id="regenerate-notice" tabIndex={-1} className={undoable || noticeForCurrent === 'undone' ? undefined : 'sr-only'}>
        {undoable || noticeForCurrent === 'undone' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-brand-soft/40 p-4">
            <div className="space-y-1 text-base">
              {noticeForCurrent === 'undone' ? (
                <p className="font-bold">{regenText.undone}</p>
              ) : noticeForCurrent === 'applied' ? (
                <>
                  <p className="font-bold">{regenText.success}</p>
                  <p>{regenText.appliedNote}</p>
                </>
              ) : (
                <p>{regenText.undoable}</p>
              )}
              {undoable && isMock('ai') ? <MockBadge /> : null}
            </div>
            {undoable ? (
              <div className="text-right">
                <button
                  type="button"
                  aria-disabled={applying ? true : undefined}
                  aria-describedby={applying ? 'regenerate-undo-hint' : undefined}
                  onClick={undoRegenerated}
                  className={[buttonClass('secondary'), applying ? 'cursor-not-allowed opacity-60' : ''].filter(Boolean).join(' ')}
                >
                  {regenText.undo}
                </button>
                {applying ? (
                  <p id="regenerate-undo-hint" className="mt-1 text-sm text-ink-soft">
                    {regenText.applyingHint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {current ? (
        <QuestionEditor
          key={`${index}-${editor.revision}`}
          gameType={draft.gameType}
          question={draft.questions[index]}
          number={index + 1}
          issues={issuesByQuestion.get(index) ?? []}
          onUpdate={(update) => {
            // Sửa tiếp thì thông báo "Đã khôi phục câu cũ." hết đúng nghĩa.
            setRegenNotice((notice) => (notice?.kind === 'undone' ? null : notice))
            editor.updateQuestion(index, draft.questions[index].id, update)
          }}
          headerAction={
            <RegenerateQuestionControls
              gameId={game.gameId}
              gameType={draft.gameType}
              index={index}
              questionId={draft.questions[index].id}
              saved={editor.savedQuestionIds.has(draft.questions[index].id)}
              getQuestion={(position, questionId) => (draft.questions[position]?.id === questionId ? draft.questions[position] : undefined)}
              applyRegenerated={editor.applyRegenerated}
              restorePending={Boolean(editor.pendingRestore)}
              onApplied={(questionId) => setRegenNotice({ kind: 'applied', questionId })}
            />
          }
        />
      ) : null}
      {previewCard}
    </div>
  )

  return (
    <PendingEditsContext.Provider value={pendingApi}>
    <VoiceContext.Provider value={voiceApi}>
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
            applying={applying}
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
    </VoiceContext.Provider>
    </PendingEditsContext.Provider>
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
              {parsed.code === 'FORBIDDEN' ? null : (
                <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
                  {text.retry}
                </Button>
              )}
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
