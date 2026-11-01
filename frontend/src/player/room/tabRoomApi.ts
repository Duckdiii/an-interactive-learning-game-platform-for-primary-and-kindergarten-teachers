import { gradePreviewAnswer, previewCorrectAnswer, toPreviewStudentQuestion } from '../../components/editor/preview/previewModel'
import type { QuestionDsl } from '../../types/game-dsl.types'
import type { GameResponse } from '../../types/game-response.types'
import type { PublishInfo, StudentGame } from '../../types/game-student.types'
import { createMockRoom } from './mockRoom'
import type { RoomApi } from './RoomApi'
import { findTabRoom, hostTabRoom, joinTabRoom } from './tabRoom'

const SECOND_MS = 1000
const DEFAULT_QUESTION_MS = 20 * SECOND_MS

const newPin = () => String(100_000 + Math.floor(Math.random() * 900_000))

/** Bỏ đáp án trước khi đưa sang tab học sinh. */
export function toRoomGame({ schemaVersion, gameType, metadata, gameplaySettings, questions }: GameResponse): StudentGame {
  return {
    schemaVersion,
    gameType,
    metadata,
    gameplaySettings,
    questions: (questions as QuestionDsl[]).map((question) => toPreviewStudentQuestion(gameType, question)),
    answeredQuestionIds: [],
  } as StudentGame
}

function toPublishInfo(game: GameResponse): PublishInfo {
  const { subject, gradeLevel, topic } = game.metadata

  return { gameTitle: game.metadata.title, gameType: game.gameType, questionCount: game.questions.length, metadata: { subject, gradeLevel, topic }, uiOverride: 'AUTO', themeId: null }
}

/** Phòng mô phỏng hai tab: chấm và giữ đáp án ở tab tivi. Mock dùng một thời gian cho mọi câu, lấy theo câu đầu. */
export class TabRoomApi implements RoomApi {
  async open(game: GameResponse) {
    const questions = game.questions as QuestionDsl[]
    const byId = (id: string) => questions.find((question) => question.id === id) as QuestionDsl
    const mock = createMockRoom({
      questionIds: questions.map((question) => question.id),
      questionMs: questions[0] ? questions[0].timeLimitSeconds * SECOND_MS : DEFAULT_QUESTION_MS,
      grade: (id, answer) => gradePreviewAnswer(game.gameType, byId(id), answer).isCorrect,
      correctAnswerOf: (id) => previewCorrectAnswer(game.gameType, byId(id)),
    })
    const pin = newPin()
    const close = hostTabRoom(pin, { info: toPublishInfo(game), game: toRoomGame(game), join: mock.join, kick: mock.teacher.kick })

    return { pin, teacher: mock.teacher, close }
  }

  findByPin(pin: string) {
    return findTabRoom(pin)
  }

  join(pin: string, nickname: string) {
    return joinTabRoom(pin, nickname)
  }
}
