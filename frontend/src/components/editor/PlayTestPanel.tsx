import { useEffect, useMemo, useReducer, useRef } from 'react'
import { viText } from '../../constants/viText'
import type { GameDsl } from '../../types/game-dsl.types'
import { summarizeQuestions } from '../../utils/questionSummary'
import { resolveUiProfile } from '../../player/profile/resolveUiProfile'
import { UiProfileProvider } from '../../player/profile/UiProfileContext'
import { resolveTheme } from '../../player/theme/resolveTheme'
import { ThemeProvider } from '../../player/theme/ThemeContext'
import { PresentationProvider } from '../../player/theme/PresentationContext'
import { resolvePresentation } from '../../utils/presentation'
import Button from '../Button'
import Icon from '../ui/Icon'
import { PLAY_TEST_RENDERERS } from './play/playTestRegistry'
import PlayTestSummary from './PlayTestSummary'
import { createPlayTestState, playTestReducer } from './playTestReducer'
import UnsupportedPlayTest from './UnsupportedPlayTest'

interface PlayTestPanelProps {
  // Bản đang soạn (kể cả phần chưa lưu): chơi thử đúng thứ giáo viên thấy trên màn hình.
  game: GameDsl
  /** Chuỗi riêng của game (gameId) để chọn cách trình bày cố định khi game chưa lưu cách trình bày. */
  seed?: string
  onExit: () => void
}

// Màn chơi thử (UC-03). Dùng renderer thật ở mode `preview` nên trông giống màn học sinh, nhưng KHÔNG gọi API nào: không tạo
// phiên chơi, không ghi điểm, không lưu kết quả; kết quả chỉ sống trong bộ nhớ của màn hình này (xem `playTestReducer`).
export default function PlayTestPanel({ game, seed, onExit }: PlayTestPanelProps) {
  const text = viText.editor.play
  const Player = PLAY_TEST_RENDERERS[game.gameType]
  const total = game.questions.length
  const [state, dispatch] = useReducer(playTestReducer, total, createPlayTestState)
  const summaries = useMemo(() => summarizeQuestions(game), [game])
  const feedbackRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const profile = resolveUiProfile({ gradeLevel: game.metadata.gradeLevel })
  const theme = resolveTheme({
    themeId: game.metadata.presentation?.world,
    subject: game.metadata.subject,
    gameType: game.gameType,
    topic: game.metadata.topic,
  })

  const presentation = resolvePresentation(game.metadata.presentation, theme.id, seed ?? game.metadata.title)

  // Mở màn chơi thử, sang câu khác hoặc thử lại câu: đưa tiêu điểm về đầu màn (nút vừa bấm đã bị gỡ khỏi trang nên nếu không
  // người dùng bàn phím và trình đọc màn hình sẽ rơi về đầu trang). Không cuộn để câu hỏi giữ nguyên chỗ.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [state.index, state.attempt])

  // Trả lời xong thì đưa tiêu điểm tới thanh phản hồi để tới ngay nút "Câu tiếp theo"; chỉ cuộn đủ để thanh hiện ra, không
  // đẩy bàn cờ (đáp án đúng đang được đánh dấu) ra khỏi màn hình hơn mức cần.
  useEffect(() => {
    const bar = feedbackRef.current

    if (!state.answered || !bar) return

    bar.focus({ preventScroll: true })
    bar.scrollIntoView?.({ block: 'nearest' })
  }, [state.answered])

  if (!Player) return <UnsupportedPlayTest game={game} onExit={onExit} />

  if (state.finished) {
    return (
      <PlayTestSummary
        summaries={summaries}
        results={state.results}
        onPlayAgain={() => dispatch({ type: 'restart' })}
        onExit={onExit}
      />
    )
  }

  const question = game.questions[state.index]
  const isLast = state.index + 1 >= total
  const lastResult = state.results[state.index]

  return (
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={theme}>
        <PresentationProvider presentation={presentation}>
        <section ref={panelRef} tabIndex={-1} aria-label={text.panelLabel} className="space-y-4 focus:outline-none">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white p-3 sm:p-4">
            <p className="text-lg font-extrabold" aria-live="polite">
              {text.questionProgress} {state.index + 1} {text.of} {total}
            </p>
            <Button type="button" variant="secondary" onClick={onExit}>
              {text.exit}
            </Button>
          </div>

          {/* Dựng lại renderer từ đầu khi sang câu khác hoặc thử lại câu này trong khung thế giới game */}
          <div
            className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border-4 border-amber-900/15 bg-cover bg-center p-3 sm:p-5 shadow-xl"
            style={{ backgroundImage: theme.bgUrl ? `url(${theme.bgUrl})` : undefined }}
          >
            {/* key ở khung: sang câu khác hoặc thử lại thì khung dựng lại nên hiệu ứng question-in chạy lại. */}
            <div key={`${state.index}-${state.attempt}`} className="question-in relative z-10 rounded-2xl bg-white/95 p-3 sm:p-4 shadow-sm backdrop-blur-xs">
              <Player
                question={question}
                onResult={(isCorrect) => dispatch({ type: 'answered', isCorrect })}
              />
            </div>

            {theme.mascotAvatar ? (
              <div aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 z-20 select-none animate-mascot-idle">
                <img src={theme.mascotAvatar} alt="" className="h-14 w-14 drop-shadow-md" />
              </div>
            ) : null}
          </div>

          {state.answered ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              role="status"
              className={[
                'space-y-3 rounded-2xl border-2 p-4 focus:outline-none',
                lastResult ? 'border-brand/40 bg-brand-soft' : 'border-sun bg-sun-soft',
              ].join(' ')}
            >
              <p className="flex items-start gap-2 text-lg font-bold">
                <Icon name={lastResult ? 'check' : 'info'} className="mt-1 h-5 w-5 shrink-0" />
                <span>{lastResult ? text.correct : text.wrong}</span>
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => dispatch({ type: 'next' })}>
                  {isLast ? text.showResult : text.nextQuestion}
                </Button>
                <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'retryQuestion' })}>
                  {text.retryQuestion}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
        </PresentationProvider>
      </ThemeProvider>
    </UiProfileProvider>
  )
}
