import { useReducer, useState } from 'react'
import type { GameType } from '../../types/game-dsl.types'
import { getPlayerApi } from '../api'
import type { PlayerApi } from '../api'
import { getPlayableRenderer } from '../renderers'
import { PlayFinished, PlayIntro, PlayStartFailed, PlayStarting } from './PlayScreens'
import { initialPlayState, playReducer } from './playReducer'
import QuestionStage from './QuestionStage'

interface PlayControllerProps {
  shareCode: string
  title: string
  gameType: GameType
}

// Biệt danh tự sinh cho đến khi có màn nhập biệt danh (P2): không tên thật, 1 đến 20 ký tự.
const autoNickname = () => `Bạn nhỏ ${Math.floor(1000 + Math.random() * 9000)}`

/** Nối PlayerApi với renderer: vào chơi (tạo phiên, tải câu hỏi), lần lượt từng câu, màn xong. Chạy bên trong UiProfileProvider. */
export default function PlayController({ shareCode, title, gameType }: PlayControllerProps) {
  const [state, dispatch] = useReducer(playReducer, initialPlayState)
  const Renderer = getPlayableRenderer(gameType)
  const [api, setApi] = useState<PlayerApi>()

  const start = async () => {
    dispatch({ type: 'START' })

    try {
      const loaded = await getPlayerApi()
      setApi(loaded)
      const session = await loaded.createSession(shareCode, autoNickname())
      const game = await loaded.getGameForStudent(session.sessionId)

      dispatch({ type: 'STARTED', session, game })
    } catch {
      dispatch({ type: 'START_FAILED' })
    }
  }

  switch (state.phase) {
    case 'intro':
      return <PlayIntro title={title} playable={Renderer !== undefined} onStart={() => void start()} />
    case 'starting':
      return <PlayStarting />
    case 'start-failed':
      return <PlayStartFailed onRetry={() => void start()} />
    case 'finished':
      return <PlayFinished correctCount={state.correctCount} total={state.total} score={state.score} onReplay={() => dispatch({ type: 'RESTART' })} />
    case 'playing': {
      if (!api) return <PlayStarting />

      const total = state.game.questions.length
      const question = state.game.questions[state.index]

      return (
        <QuestionStage
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
          onAnswered={(result) => dispatch({ type: 'ANSWERED', questionId: question.id, result })}
          onNext={() => dispatch({ type: 'NEXT' })}
        />
      )
    }
  }
}
