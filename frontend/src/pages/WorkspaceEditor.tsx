import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import LoadingSpinner from '../components/LoadingSpinner'
import DraftRestoreNotice from '../components/editor/DraftRestoreNotice'
import EditorLayout from '../components/editor/EditorLayout'
import type { EditorPane } from '../components/editor/EditorLayout'
import GameInfoForm from '../components/editor/GameInfoForm'
import PublishReadiness from '../components/editor/PublishReadiness'
import LivePreview from '../components/editor/preview/LivePreview'
import PlayTestBoundary from '../components/editor/PlayTestBoundary'
import { playTestPanelLoader } from '../components/editor/playTestPanelLoader'
import { PendingEditsContext } from '../components/editor/forms/PendingEditsContext'
import { buttonClass } from '../components/buttonStyles'
import RegenerateQuestionControls from '../components/editor/forms/RegenerateQuestionControls'
import QuestionEditor from '../components/editor/forms/QuestionEditor'
import { VoiceContext } from '../components/editor/forms/VoiceContext'
import { GameDefaultsContext } from '../components/editor/forms/GameDefaultsContext'
import { gameDefault } from '../utils/gameDefaults'
import type { VoiceGender } from '../services/mediaService'
import QuestionList from '../components/editor/QuestionList'
import EditorTopBar from '../components/editor/EditorTopBar'
import PublishDialog from '../components/editor/PublishDialog'
import ErrorNotice from '../components/ui/ErrorNotice'
import LetterTiles from '../components/ui/LetterTiles'
import MockBadge from '../components/ui/MockBadge'
import { MIXED_TILES } from '../components/ui/tileSets'
import { viText } from '../constants/viText'
import { isMock } from '../config/mockMode'
import { isMockGenerated } from '../services/mock/mockGames'
import { unmarkNewGame } from '../utils/newGames'
import { useGame } from '../hooks/useGame'
import { useGameEditor } from '../hooks/useGameEditor'
import { usePageTitle } from '../hooks/usePageTitle'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { ROUTES } from '../routes/paths'
import type { GameResponse } from '../types/game-response.types'
import { parseApiError } from '../utils/apiError'
import { groupByQuestion } from '../utils/gameValidation'
import { summarizeQuestions } from '../utils/questionSummary'

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
  // Số ô chữ còn chữ vừa gõ chưa vào bản đang soạn (xem `PendingEditsContext`). Khai báo trước hook để hoãn tự lưu trong lúc đó.
  const [pendingEdits, setPendingEdits] = useState(0)
  const editor = useGameEditor(game, { paused: pendingEdits > 0 })
  const { draft } = editor

  // Đã mở game vừa tạo thì hết dấu "Mới" trên thẻ game.
  useEffect(() => unmarkNewGame(game.gameId), [game.gameId])
  const [selected, setSelected] = useState(0)
  const [pane, setPane] = useState<EditorPane>('list')
  const [playing, setPlaying] = useState(false)
  // Vừa nhờ AI làm lại (hoặc vừa hoàn tác) câu nào: để hiện thông báo kèm nút Hoàn tác. Nằm ở đây vì thẻ sửa câu được dựng lại sau khi áp câu mới.
  const [regenNotice, setRegenNotice] = useState<{ kind: 'applied' | 'undone'; questionId: string } | null>(null)
  const beginEdit = useCallback(() => {
    setPendingEdits((count) => count + 1)

    return () => setPendingEdits((count) => Math.max(0, count - 1))
  }, [])
  const applying = pendingEdits > 0 || editor.publishing
  const pendingApi = useMemo(() => ({ begin: beginEdit, pending: applying }), [beginEdit, applying])
  // Giọng đọc đang chọn cho các lần tạo giọng đọc (FLD-12): giữ ở đây để đổi sang câu khác vẫn còn nguyên.
  const [voice, setVoice] = useState<VoiceGender>('FEMALE')
  const voiceApi = useMemo(() => ({ voice, setVoice }), [voice])
  // `lazy` ghi nhớ cả lần tải LỖI: muốn thử lại sau khi mạng ổn lại phải dựng `lazy` mới, nên tạo lại mỗi lần thoát khỏi màn chơi thử.
  const [PlayTestPanel, setPlayTestPanel] = useState(() => lazy(loadPlayTestPanel))
  // Đã bấm "Chơi thử" mà dữ liệu chưa đủ: lỗi được tính lại theo từng lần sửa để sửa xong là hết.
  const [playAttempted, setPlayAttempted] = useState(false)
  const summaries = useMemo(() => summarizeQuestions(draft), [draft])
  // Câu nào còn lỗi (tính trực tiếp, không đợi bấm Lưu) thì danh sách đánh dấu "Cần sửa".
  const gameDefaults = useMemo(
    () => ({ timeLimitSeconds: gameDefault(draft.questions, 'timeLimitSeconds'), points: gameDefault(draft.questions, 'points') }),
    [draft.questions],
  )
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

  // "Xem lỗi" / "Thử lại" trên thanh trên cùng: `save()` kiểm tra lại, còn lỗi thì không gửi và hiện lỗi dưới từng ô; lỗi ở câu thì chuyển tới câu đầu tiên có lỗi.
  const handleSave = () => {
    setRegenNotice((notice) => (notice?.kind === 'undone' ? null : notice))
    const found = editor.save()
    const first = found.find((issue) => issue.questionIndex === null)

    if (first) focusField(first.field === 'metadata.topic' ? 'game-topic' : 'game-title')
    else if (found.length > 0 && found[0].questionIndex !== null) choose(found[0].questionIndex)
  }

  const publishText = text.publish

  const handlePublish = () => {
    setRegenNotice((notice) => (notice?.kind === 'undone' ? null : notice))

    const first = editor.publish().find((issue) => issue.questionIndex === null)

    if (first) focusField(first.field === 'metadata.topic' ? 'game-topic' : 'game-title')
  }

  const closeSharePanel = () => {
    editor.dismissPublishResult()
    focusField('publish-button')
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
                  {editor.autosave === 'saved' ? null : <p>{regenText.appliedNote}</p>}
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
      {/* Chỉ báo khi ĐỔI CÂU, không đọc lại nội dung mỗi lần gõ. Nằm ở khung sửa vì trên điện thoại chọn câu là chuyển sang khung này. */}
      <p role="status" className="sr-only">
        {current ? `${text.questionLabel} ${index + 1}` : ''}
      </p>
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
    </div>
  )

  const see = (
    <div className="space-y-6">
      <LivePreview
        gameType={draft.gameType}
        question={draft.questions[index]}
        title={title}
        index={index}
        total={items.length}
        gradeLevel={draft.metadata.gradeLevel}
        subject={draft.metadata.subject}
        hasIssues={issuesByQuestion.has(index)}
      />
      <PublishReadiness
        issues={editor.readinessIssues}
        questionCount={items.length}
        onSelectQuestion={choose}
        onSelectGameInfo={() => focusField('game-title')}
      />
    </div>
  )

  return (
    <PendingEditsContext.Provider value={pendingApi}>
    <VoiceContext.Provider value={voiceApi}>
    <GameDefaultsContext.Provider value={gameDefaults}>
    <div className="space-y-6">
      <EditorTopBar
        title={title}
        subject={game.metadata.subject}
        gradeLevel={game.metadata.gradeLevel}
        gameType={game.gameType}
        questionCount={items.length}
        gameStatus={game.status}
        isPublished={isPublished}
        mock={isMock('editor')}
        autosave={editor.autosave}
        issueCount={editor.liveIssues.length}
        applying={applying}
        publishing={editor.publishing}
        saving={editor.saving}
        playing={playing}
        canRetry={!conflict}
        onViewIssues={handleSave}
        onRetry={handleSave}
        onPublish={handlePublish}
        onPlayTest={startPlay}
      />

      {/* Game do AI mô phỏng tạo: nội dung là bản mẫu của loại game, không khớp mô tả của giáo viên. Nhắc ngay ở trình soạn thảo, không chỉ ở trang tạo. */}
      {isMockGenerated(game.gameId) ? (
        <div role="note" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/40 p-3.5 shadow-xs">
          <MockBadge />
          <p className="min-w-0 flex-1 text-sm font-medium text-ink-soft sm:text-base">{text.simulatedGame}</p>
        </div>
      ) : null}

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

          {editor.publishIssues.length > 0 ? (
            <ErrorNotice
              title={publishText.errorTitle}
              message={editor.publishIssueSummary ?? publishText.invalid}
              action={
                <ul className="list-disc space-y-1 pl-5 text-base">
                  {editor.publishIssues.map((issue) => (
                    <li key={`${issue.questionIndex}-${issue.field}-${issue.code}`}>
                      {issue.message}{' '}
                      <button
                        type="button"
                        className="font-bold text-brand-strong underline"
                        onClick={() => (issue.questionIndex === null ? focusField(issue.field === 'metadata.topic' ? 'game-topic' : 'game-title') : choose(issue.questionIndex))}
                      >
                        {issue.questionIndex === null ? publishText.fixInfo : `${publishText.fixQuestion} ${issue.questionIndex + 1}`}
                      </button>
                    </li>
                  ))}
                </ul>
              }
            />
          ) : null}

          {editor.publishFailure && editor.publishFailure.kind !== 'canceled' ? (
            <ErrorNotice
              title={publishText.errorTitle}
              message={
                editor.publishFailure.kind === 'failed' || editor.publishFailure.kind === 'other' || editor.publishFailure.kind === 'invalid'
                  ? `${editor.publishFailure.message} ${publishText.keptNote}`
                  : editor.publishFailure.message
              }
              action={
                editor.publishFailure.kind === 'conflict' ? null : (
                  <Button type="button" onClick={handlePublish} disabled={applying || editor.saving}>
                    {publishText.retry}
                  </Button>
                )
              }
            />
          ) : null}

          {editor.saveError ? (
            <ErrorNotice
              title={saveText.saveErrorTitle}
              message={conflict ? saveText.conflict : `${editor.saveError.message} ${saveText.keptNote}`}
            />
          ) : null}

          <GameInfoForm
            metadata={draft.metadata}
            issues={editor.issues}
            disabled={Boolean(editor.pendingRestore)}
            onTitleChange={editor.setTitle}
            onTopicChange={editor.setTopic}
            defaults={gameDefaults}
            onDefaultChange={editor.setGameDefault}
          />

          <EditorLayout
            pane={pane}
            onPaneChange={setPane}
            questionCount={items.length}
            list={<QuestionList items={items} selectedIndex={index} onSelect={choose} />}
            preview={preview}
            see={see}
          />
        </>
      )}
      {editor.publishResult ? <PublishDialog result={editor.publishResult} gameTitle={draft.metadata.title} gameType={draft.gameType} gradeLevel={draft.metadata.gradeLevel} hasUnsavedAfter={editor.dirty} onClose={closeSharePanel} /> : null}
    </div>
    </GameDefaultsContext.Provider>
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
