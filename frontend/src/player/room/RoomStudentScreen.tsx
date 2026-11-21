import { useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { viText } from '../../constants/viText'
import type { AnswerResult, StudentGame } from '../../types/game-student.types'
import { PROFILES } from '../profile/profiles'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { getPlayableRenderer } from '../renderers'
import { REVIEW_DESCRIBERS } from '../review/describers'
import PlayerShell from '../shells/PlayerShell'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import { PresentationProvider } from '../theme/PresentationContext'
import { resolvePresentation } from '../../utils/presentation'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import type { RoomJoinErrorCode, RoomMe, RoomMyFinal, RoomQuestion, StudentRoomClient } from './RoomClient'
import { initialStudentRoomState, studentRoomReducer, studentRoomView } from './studentRoomReducer'
import { useRoomSeconds } from './useRoomSeconds'

const text = viText.room.student

function Centered({ tone = 'bg-play-night text-white', children }: { tone?: string; children: ReactNode }) {
  return <main className={`flex min-h-dvh flex-col items-center gap-5 px-7 pb-10 pt-20 text-center ${tone}`}>{children}</main>
}

function Wait({ nickname, count }: { nickname: string; count: number }) {
  return (
    <Centered>
      <span aria-hidden="true" className="size-28 rounded-full border-[6px] border-white bg-play-dot-yellow" />
      <p className="break-words text-3xl font-black">{nickname}</p>
      <p className="rounded-full bg-play-night-panel px-4 py-2 text-base font-extrabold">{text.joined}</p>
      <h1 className="mt-5 text-2xl font-extrabold">{text.waiting}</h1>
      <p aria-live="polite" className="text-base font-bold text-play-night-soft">{text.waitingWith(Math.max(count - 1, 0))}</p>
      <p className="mt-auto rounded-2xl bg-play-night-panel px-4 py-3.5 text-[15px] font-bold leading-snug text-white/90">{text.tip}</p>
    </Centered>
  )
}

interface QuestionProps {
  client: StudentRoomClient
  game: StudentGame
  question: RoomQuestion
  remainingMs: number | null
  paused: boolean
}

function Question({ client, game, question, remainingMs, paused }: QuestionProps) {
  const seconds = useRoomSeconds(question, remainingMs, paused)
  const [answered, setAnswered] = useState(false)
  const [failed, setFailed] = useState(false)
  const content = game.questions.find((item) => item.id === question.questionId)
  const Renderer = getPlayableRenderer(game.gameType)

  if (!content || !Renderer) return <Centered><h1 className="text-2xl font-extrabold">{text.unsupported}</h1></Centered>

  const feedback = paused ? <p>{text.paused}</p> : answered ? <p>{text.answered}</p> : failed ? <p>{text.submitFailed}</p> : null

  return (
    <div inert={paused}>
      <PlayerShell title={game.metadata.title} progress={{ current: question.index + 1, total: question.total }} remainingSeconds={seconds} feedback={feedback}>
        {/* Question dựng lại theo questionId nên hiệu ứng sang câu chạy mỗi câu. */}
        <div className="question-in h-full w-full">
        <Renderer
          question={content}
          profile={PROFILES.hocSinh}
          // Phòng thi đấu không báo đúng sai lúc nộp (trẻ sẽ mách bạn bên cạnh): lời hứa không xong thì renderer giữ khóa, tới khi `me` chuyển sang màn sau mỗi câu.
          onSubmit={(answer) => {
            setFailed(false)

            return client.answer(question.questionId, answer).then(
              () => {
                setAnswered(true)

                return new Promise<AnswerResult>(() => undefined)
              },
              (error: unknown) => {
                setFailed(true)
                throw error // renderer tự mở khóa để trẻ chọn lại
              },
            )
          }}
        />
        </div>
      </PlayerShell>
    </div>
  )
}

function Feedback({ me, correctLine }: { me: RoomMe; correctLine: string | null }) {
  return (
    <Centered tone={`text-white ${me.isCorrect ? 'bg-play-feedback-correct' : 'bg-play-feedback-try'}`}>
      <span aria-hidden="true" className="grid size-32 place-items-center rounded-full bg-white text-7xl font-black text-play-ink">
        {me.isCorrect ? '✓' : '…'}
      </span>
      <h1 className="text-4xl font-black">{me.isCorrect ? text.correct : text.wrong}</h1>
      <p className="text-3xl font-black">{text.points(me.delta)}</p>
      {me.streakBonus > 0 ? <p className="rounded-full bg-white/20 px-4 py-2 font-extrabold">{text.streak(me.streak, me.streakBonus)}</p> : null}
      <p className="mt-6 flex w-full justify-between rounded-2xl bg-black/20 p-4 text-lg font-extrabold">
        <span>{text.total}</span>
        <span>{me.score}</span>
      </p>
      {correctLine ? <p className="w-full break-words rounded-2xl bg-black/20 p-4 text-lg font-extrabold">{text.correctAnswer(correctLine)}</p> : null}
      <p className="mt-auto text-lg font-extrabold">{text.lookUp}</p>
    </Centered>
  )
}

function Final({ nickname, result }: { nickname: string; result: RoomMyFinal }) {
  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-play-page px-6 pb-7 pt-12 text-play-ink">
      <div className="text-center">
        <p className="break-words font-extrabold text-play-ink-soft">{nickname}</p>
        <h1 className="mt-1 text-3xl font-black">{text.finished}</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-play-outline bg-white p-5 text-center">
        <p className="rounded-2xl bg-play-page p-3.5">
          <span className="block text-3xl font-black">{result.score}</span>
          <span className="text-sm font-extrabold text-play-ink-soft">{text.pointsLabel}</span>
        </p>
        <p className="rounded-2xl bg-play-page p-3.5">
          <span className="block text-3xl font-black">
            {result.correctCount}/{result.total}
          </span>
          <span className="text-sm font-extrabold text-play-ink-soft">{text.correctLabel}</span>
        </p>
        <p className="col-span-2 rounded-2xl bg-play-rank-fill p-3.5 text-play-rank-ink">
          <span className="block text-2xl font-black">{text.rank(result.rank, result.participantCount)}</span>
          <span className="text-sm font-extrabold">{text.rankPrivate}</span>
        </p>
      </div>
      <p className="rounded-2xl bg-play-streak-fill p-3.5 text-[15px] font-extrabold text-play-streak-ink">{text.bestStreak(result.bestStreak)}</p>
      <p className="mt-auto text-center text-sm font-bold text-play-ink-soft">{text.resultDeleted}</p>
    </main>
  )
}

interface RoomStudentScreenProps {
  client: StudentRoomClient
  nickname: string
  game: StudentGame
}

/** D5–D7 trên máy học sinh, chọn màn theo trạng thái phòng. Thứ hạng riêng chỉ đến qua kênh riêng (`me`, `myFinal`) nên chỉ hiện trên máy này. */
export default function RoomStudentScreen({ client, nickname, game }: RoomStudentScreenProps) {
  const [state, dispatch] = useReducer(studentRoomReducer, initialStudentRoomState)
  const view = studentRoomView(state)
  const { question, me } = state

  usePlayerRootStyle(PROFILES.hocSinh)

  useEffect(() => {
    const unsubscribeEvents = client.subscribe(dispatch)
    const unsubscribeConnection = client.subscribeConnection((status) => dispatch({ type: 'connection', status }))

    client.connect().catch(() => dispatch({ type: 'connection', status: 'disconnected' }))

    return () => {
      unsubscribeEvents()
      unsubscribeConnection()
      client.disconnect()
    }
  }, [client])

  const content = game.questions.find((item) => item.id === me?.questionId)
  const correctLine = content && state.correctAnswer !== undefined ? (REVIEW_DESCRIBERS[game.gameType]?.correct(content as never, state.correctAnswer) ?? null) : null

  const roomTheme = resolveTheme({ themeId: game.metadata.presentation?.world, gameType: game.gameType, subject: game.metadata.subject })

  return (
    <UiProfileProvider profile={PROFILES.hocSinh}>
      <ThemeProvider theme={roomTheme}>
        <PresentationProvider presentation={resolvePresentation(game.metadata.presentation, roomTheme.id, game.metadata.title)}>
        {view === 'wait' ? <Wait nickname={nickname} count={state.participantCount} /> : null}
        {view === 'question' && question ? <Question key={question.questionId} client={client} game={game} question={question} remainingMs={state.remainingMs} paused={state.status === 'PAUSED'} /> : null}
        {view === 'feedback' && me ? <Feedback me={me} correctLine={correctLine} /> : null}
        {view === 'final' && state.myFinal ? <Final nickname={nickname} result={state.myFinal} /> : null}
        {view === 'kicked' ? <Centered><h1 className="text-2xl font-extrabold">{text.kicked}</h1></Centered> : null}
        {view === 'closed' ? <Centered><h1 className="text-2xl font-extrabold">{text.closed}</h1></Centered> : null}

        {/* Bị xóa hay phòng đóng thì không còn gì để nối lại. */}
        {view !== 'kicked' && view !== 'closed' && state.connection === 'reconnecting' ? (
          <p role="status" className="fixed inset-x-4 top-3 rounded-full bg-play-ink px-4 py-2 text-center font-bold text-white">{text.reconnecting}</p>
        ) : null}
        {view !== 'kicked' && view !== 'closed' && state.connection === 'disconnected' ? (
          <p role="alert" className="fixed inset-x-4 top-3 flex items-center justify-between rounded-full bg-play-ink py-2 pl-4 pr-2 font-bold text-white">
            {text.disconnected}
            <button type="button" onClick={() => client.connect().catch(() => undefined)} className="min-h-16 rounded-full bg-white/15 px-5">
              {text.retry}
            </button>
          </p>
        ) : null}
        </PresentationProvider>
      </ThemeProvider>
    </UiProfileProvider>
  )
}

/** Lỗi lúc vào phòng; `join` thất bại nên chưa có client. */
export function RoomJoinErrorScreen({ code }: { code: RoomJoinErrorCode }) {
  usePlayerRootStyle(PROFILES.hocSinh)

  return (
    <Centered>
      <h1 className="text-2xl font-extrabold">{text.joinErrors[code]}</h1>
    </Centered>
  )
}
