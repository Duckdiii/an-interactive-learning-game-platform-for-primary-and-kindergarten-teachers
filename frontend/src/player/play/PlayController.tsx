import axios from 'axios'
import { useEffect, useReducer, useRef, useState } from 'react'
import { viText } from '../../constants/viText'
import type { PlayerSession, PublishInfo, StudentGame } from '../../types/game-student.types'
import { getPlayerApi } from '../api'
import type { PlayerApi } from '../api'
import { isAudioLocked, resumeAudioContext, unlockAudio } from '../audio/audioLock'
import TapToStart from '../audio/TapToStart'
import { ERROR_SCREENS } from '../errors'
import { errorCodeOf } from '../errors/errorCode'
import { INTROS } from '../intro'
import NicknameScreen from '../intro/NicknameScreen'
import { useUiProfile } from '../profile/useUiProfile'
import RotatePrompt, { PORTRAIT_PHONE_QUERY } from '../device/RotatePrompt'
import { useMediaQuery } from '../device/useMediaQuery'
import { PLAYABLE_ORIENTATION, getPlayableRenderer } from '../renderers'
import { RESULTS } from '../result'
import { buildReviewItems } from '../review/reviewItems'
import StudentReview from '../review/StudentReview'
import { publishErrorKind } from '../join/joinCode'
import { PlayStarting } from './PlayScreens'
import { initialPlayState, playReducer } from './playReducer'
import QuestionStage from './QuestionStage'
import { clearSession, loadSession, saveProgress, saveSession } from './sessionStore'
import type { StoredProgress, StoredSession } from './sessionStore'

interface PlayControllerProps {
  shareCode: string
  info: PublishInfo
}

// Biệt danh tự sinh cho khung không hỏi biệt danh: không tên thật, 1 đến 20 ký tự.
const autoNickname = () => `Bạn nhỏ ${Math.floor(1000 + Math.random() * 9000)}`

const NICKNAME_REJECT_CODES = new Set(['UNSAFE_CONTENT', 'VALIDATION_ERROR'])

// Máy chủ từ chối biệt danh khi tạo phiên (từ không phù hợp hoặc sai luật). Thiếu lời nhắn thì dùng câu mặc định.
const rejectedMessage = (error: unknown) => {
  const body = axios.isAxiosError(error) ? (error.response?.data as { error?: { code?: string; message?: string } } | undefined)?.error : undefined

  if (!body?.code || !NICKNAME_REJECT_CODES.has(body.code)) return null

  return body.message || viText.player.nickname.rejected
}

// Phiên đã lưu mà máy chủ không còn (hết hạn, đã xóa): bỏ phiên cũ và tạo phiên mới.
const isSessionGone = (error: unknown) => axios.isAxiosError(error) && [404, 410].includes(error.response?.status ?? 0)

// Chỉ sessionId được dùng sau khi vào chơi; các trường còn lại của PlayerSession không cần lưu.
const sessionFromStored = (stored: StoredSession): PlayerSession => ({ ...stored, sessionType: 'SELF', status: 'ACTIVE', expiresAt: '' })

/** Nối PlayerApi với renderer: biệt danh, màn vào theo khung, vào chơi (tạo phiên, tải câu hỏi), từng câu, màn xong. Chạy bên trong UiProfileProvider. */
export default function PlayController({ shareCode, info }: PlayControllerProps) {
  const profile = useUiProfile()
  const [state, dispatch] = useReducer(playReducer, initialPlayState)
  const Renderer = getPlayableRenderer(info.gameType)
  const [api, setApi] = useState<PlayerApi>()
  const { askNickname } = profile.interaction
  // null = chưa có biệt danh (khung hỏi biệt danh); khung kia dùng biệt danh tự sinh.
  // Có phiên đã lưu (tải lại trang giữa chừng) thì dùng lại biệt danh đó, không hỏi lại.
  const [nickname, setNickname] = useState<string | null>(() => loadSession(shareCode)?.nickname ?? (askNickname ? null : autoNickname()))
  const [startError, setStartError] = useState<unknown>(null)
  const [draft, setDraft] = useState('')
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [autoRead, setAutoRead] = useState(profile.audio.autoReadPrompt)
  const [tapPending, setTapPending] = useState(false)
  // "Người lớn: vẫn chơi màn dọc": bỏ màn nhắc xoay máy cho tới hết lượt chơi.
  const [stayPortrait, setStayPortrait] = useState(false)
  const portraitPhone = useMediaQuery(PORTRAIT_PHONE_QUERY)
  const needsRotate = profile.interaction.enforceLandscape && PLAYABLE_ORIENTATION[info.gameType] === 'landscape' && portraitPhone && !stayPortrait

  // `online` và nút "Thử lại" có thể cùng lúc: chỉ một lượt vào chơi chạy, nếu không sẽ tạo hai phiên và lưu nhầm phiên thứ hai.
  const starting = useRef(false)

  const start = async () => {
    if (nickname === null || starting.current) return

    starting.current = true

    try {
      await startOnce(nickname)
    } finally {
      starting.current = false
    }
  }

  const startOnce = async (nickname: string) => {
    dispatch({ type: 'START' })

    const fail = (error: unknown) => {
      setStartError(error)
      dispatch({ type: 'START_FAILED' })
    }
    let loaded: PlayerApi
    let session: PlayerSession
    let game: StudentGame | undefined
    let progress: StoredProgress | undefined

    // Chỉ lỗi của bước tạo phiên mới có thể là "biệt danh bị từ chối"; lỗi tải câu hỏi là lỗi thường.
    try {
      loaded = await getPlayerApi()
      setApi(loaded)

      const stored = loadSession(shareCode)

      if (stored) {
        try {
          game = await loaded.getGameForStudent(stored.sessionId)
          session = sessionFromStored(stored)
          progress = stored.progress
        } catch (error) {
          if (!isSessionGone(error)) throw error

          clearSession(shareCode)
        }
      }

      if (game === undefined) {
        session = await loaded.createSession(shareCode, nickname)
        saveSession(shareCode, { sessionId: session.sessionId, participantId: session.participantId, nickname })
      }
    } catch (error) {
      const rejected = askNickname ? rejectedMessage(error) : null

      if (rejected === null) return fail(error)

      setDraft(nickname)
      setNickname(null)
      setNicknameError(rejected)
      dispatch({ type: 'START_REJECTED' })

      return
    }

    try {
      game ??= await loaded.getGameForStudent(session!.sessionId)

      setTapPending(autoRead && isAudioLocked())
      dispatch({ type: 'STARTED', session: session!, game, progress })
    } catch (error) {
      fail(error)
    }
  }

  // Lưu bộ đếm sau mỗi câu đã chấm để tải lại trang vẫn ra đúng số câu đúng ở màn kết quả.
  const answered = state.phase === 'playing' && state.result !== null ? state : null

  useEffect(() => {
    if (answered) saveProgress(shareCode, { score: answered.score, correctCount: answered.correctCount, streak: answered.streak, bestStreak: answered.bestStreak })
  }, [answered, shareCode])

  // Mạng về trong lúc đang ở màn lỗi vào chơi thì tự thử lại.
  useEffect(() => {
    if (state.phase !== 'start-failed') return

    const retry = () => void start()

    window.addEventListener('online', retry)

    return () => window.removeEventListener('online', retry)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ gắn lại khi đổi pha; start chỉ dùng shareCode và nickname, hai giá trị này không đổi khi đang ở màn lỗi
  }, [state.phase])

  const replay = () => {
    clearSession(shareCode)
    dispatch({ type: 'RESTART' })
  }

  if (nickname === null) {
    return (
      <NicknameScreen
        info={info}
        initialValue={draft}
        serverError={nicknameError}
        onSubmit={(value) => {
          setNicknameError(null)
          setNickname(value)
        }}
      />
    )
  }

  switch (state.phase) {
    case 'intro': {
      const Intro = INTROS[profile.band]

      return (
        <Intro
          info={info}
          playable={Renderer !== undefined}
          autoRead={autoRead}
          onAutoReadChange={setAutoRead}
          onStart={() => {
            resumeAudioContext()
            void start()
          }}
        />
      )
    }
    case 'starting':
      return <PlayStarting />
    case 'start-failed': {
      const ErrorScreen = ERROR_SCREENS[profile.band]

      return <ErrorScreen kind={publishErrorKind(startError)} code={errorCodeOf(startError)} onRetry={() => void start()} />
    }
    case 'finished': {
      const Result = RESULTS[profile.band]

      return (
        <Result
          info={info}
          nickname={nickname}
          correctCount={state.correctCount}
          total={state.total}
          score={state.score}
          bestStreak={state.bestStreak}
          onReplay={replay}
          // Không có gì để xem lại (tiếp tục phiên đã nộp hết từ trước khi tải lại trang) thì không mở màn xem lại.
          onReview={state.history.length > 0 ? () => dispatch({ type: 'OPEN_REVIEW' }) : undefined}
        />
      )
    }
    case 'review':
      return <StudentReview items={buildReviewItems(state.game, state.history)} onBack={() => dispatch({ type: 'CLOSE_REVIEW' })} onReplay={replay} />
    case 'playing': {
      if (!api) return <PlayStarting />

      if (tapPending) {
        return (
          <TapToStart
            onTap={() => {
              void unlockAudio().then(() => setTapPending(false))
            }}
          />
        )
      }

      const total = state.game.questions.length
      const question = state.game.questions[state.index]

      // Nhắc xoay máy là lớp phủ, không thay câu: lỡ xoay dọc giữa câu không mất cặp đã nối hay lần nộp đang chờ.
      return (
        <>
        {needsRotate ? <RotatePrompt onStayPortrait={() => setStayPortrait(true)} /> : null}
        <QuestionStage
          covered={needsRotate}
          key={question.id}
          api={api}
          sessionId={state.session.sessionId}
          title={state.game.metadata.title}
          question={question}
          Renderer={Renderer!}
          progress={{ current: state.index + 1, total }}
          score={state.score}
          streak={state.streak}
          result={state.result}
          isLast={state.index + 1 >= total}
          autoRead={autoRead}
          onAnswered={(result, answer) => dispatch({ type: 'ANSWERED', questionId: question.id, answer, result })}
          onNext={() => dispatch({ type: 'NEXT' })}
        />
        </>
      )
    }
  }
}
