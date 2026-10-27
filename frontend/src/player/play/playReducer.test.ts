import { describe, expect, it } from 'vitest'
import type { AnswerResult, PlayerSession, StudentGame } from '../../types/game-student.types'
import { initialPlayState, playReducer } from './playReducer'
import type { PlayState } from './playReducer'

const session: PlayerSession = { sessionId: 's1', participantId: 'p1', nickname: 'Bé An', sessionType: 'SELF', status: 'ACTIVE', expiresAt: '2026-10-28T00:00:00Z' }
const makeGame = (answered: string[] = []) =>
  ({
    schemaVersion: '1.0.0',
    gameType: 'QUIZ',
    metadata: { title: 'Đếm', subject: 'MATH', gradeLevel: 'KINDERGARTEN', topic: 'Đếm' },
    gameplaySettings: { hitboxScale: 1.5 },
    answeredQuestionIds: answered,
    questions: ['q1', 'q2'].map((id) => ({ id, timeLimitSeconds: 30, points: 10, questionText: id, options: [] })),
  }) as StudentGame
const correct: AnswerResult = { status: 'CORRECT', isCorrect: true, pointsEarned: 10, totalScore: 10, correctAnswer: null }
const wrong: AnswerResult = { status: 'INCORRECT', isCorrect: false, pointsEarned: 0, totalScore: 10, correctAnswer: null }

const started = (answered: string[] = []): PlayState => {
  const starting = playReducer(initialPlayState, { type: 'START' })

  return playReducer(starting, { type: 'STARTED', session, game: makeGame(answered) })
}

describe('playReducer', () => {
  it('vào chơi: intro -> starting -> playing ở câu đầu', () => {
    expect(playReducer(initialPlayState, { type: 'START' })).toEqual({ phase: 'starting' })
    expect(started()).toMatchObject({ phase: 'playing', index: 0, score: 0, correctCount: 0, result: null })
  })

  it('vào chơi thất bại rồi thử lại được', () => {
    const failed = playReducer(playReducer(initialPlayState, { type: 'START' }), { type: 'START_FAILED' })

    expect(failed).toEqual({ phase: 'start-failed' })
    expect(playReducer(failed, { type: 'START' })).toEqual({ phase: 'starting' })
  })

  it('tiếp tục đúng chỗ: bỏ qua các câu đã nộp; đã nộp hết thì xong luôn', () => {
    expect(started(['q1'])).toMatchObject({ phase: 'playing', index: 1 })
    expect(started(['q1', 'q2'])).toMatchObject({ phase: 'finished', total: 2 })
  })

  it('trả lời: ghi kết quả, lấy điểm cộng dồn từ máy chủ, đếm câu đúng', () => {
    const answered = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', result: correct })

    expect(answered).toMatchObject({ phase: 'playing', result: correct, score: 10, correctCount: 1 })
  })

  it('kết quả thứ hai của cùng một câu bị bỏ qua (không đếm đúng hai lần)', () => {
    const once = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', result: correct })

    expect(playReducer(once, { type: 'ANSWERED', questionId: 'q1', result: correct })).toBe(once)
  })

  it('kết quả trễ của câu trước không được áp vào câu đang hiện', () => {
    let state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', result: correct })

    state = playReducer(state, { type: 'NEXT' })
    const stale = playReducer(state, { type: 'ANSWERED', questionId: 'q1', result: correct })

    expect(stale).toBe(state)
    expect(stale).toMatchObject({ index: 1, result: null, correctCount: 1 })
  })

  it('chuỗi đúng: tăng khi đúng, về 0 khi sai, tính lại sau đó', () => {
    const two = (): PlayState => {
      const state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', result: correct })

      return state
    }
    const afterFirst = two()
    const next = playReducer(afterFirst, { type: 'NEXT' })
    const afterWrong = playReducer(next, { type: 'ANSWERED', questionId: 'q2', result: wrong })

    expect(afterFirst).toMatchObject({ streak: 1 })
    expect(afterWrong).toMatchObject({ streak: 0, correctCount: 1 })
  })

  it('chưa trả lời thì không sang câu sau được', () => {
    const state = started()

    expect(playReducer(state, { type: 'NEXT' })).toBe(state)
  })

  it('đi hết các câu: câu sau, rồi màn xong với số câu đúng và điểm', () => {
    let state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', result: correct })

    state = playReducer(state, { type: 'NEXT' })
    expect(state).toMatchObject({ phase: 'playing', index: 1, result: null, correctCount: 1 })

    state = playReducer(state, { type: 'ANSWERED', questionId: 'q2', result: wrong })
    state = playReducer(state, { type: 'NEXT' })

    expect(state).toEqual({ phase: 'finished', score: 10, correctCount: 1, total: 2 })
  })

  it('chơi lại chỉ từ màn xong', () => {
    const playing = started()
    const finished: PlayState = { phase: 'finished', score: 0, correctCount: 0, total: 2 }

    expect(playReducer(playing, { type: 'RESTART' })).toBe(playing)
    expect(playReducer(finished, { type: 'RESTART' })).toEqual(initialPlayState)
  })

  it('hành động sai pha bị bỏ qua', () => {
    expect(playReducer(initialPlayState, { type: 'ANSWERED', questionId: 'q1', result: correct })).toBe(initialPlayState)
    expect(playReducer(initialPlayState, { type: 'STARTED', session, game: makeGame() })).toBe(initialPlayState)
  })
})
