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
const pick = { selectedOptionId: 'a' }
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

  it('máy chủ từ chối biệt danh thì về màn vào', () => {
    const starting = playReducer(initialPlayState, { type: 'START' })

    expect(playReducer(starting, { type: 'START_REJECTED' })).toEqual(initialPlayState)
    expect(playReducer(initialPlayState, { type: 'START_REJECTED' })).toBe(initialPlayState)
  })

  it('tiếp tục đúng chỗ: bỏ qua các câu đã nộp; đã nộp hết thì xong luôn', () => {
    expect(started(['q1'])).toMatchObject({ phase: 'playing', index: 1 })
    expect(started(['q1', 'q2'])).toMatchObject({ phase: 'finished', total: 2 })
  })

  it('trả lời: ghi kết quả, lấy điểm cộng dồn từ máy chủ, đếm câu đúng', () => {
    const answered = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

    expect(answered).toMatchObject({ phase: 'playing', result: correct, score: 10, correctCount: 1 })
  })

  it('kết quả thứ hai của cùng một câu bị bỏ qua (không đếm đúng hai lần)', () => {
    const once = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

    expect(playReducer(once, { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })).toBe(once)
  })

  it('kết quả trễ của câu trước không được áp vào câu đang hiện', () => {
    let state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

    state = playReducer(state, { type: 'NEXT' })
    const stale = playReducer(state, { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

    expect(stale).toBe(state)
    expect(stale).toMatchObject({ index: 1, result: null, correctCount: 1 })
  })

  it('chuỗi đúng: tăng khi đúng, về 0 khi sai, tính lại sau đó', () => {
    const two = (): PlayState => {
      const state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

      return state
    }
    const afterFirst = two()
    const next = playReducer(afterFirst, { type: 'NEXT' })
    const afterWrong = playReducer(next, { type: 'ANSWERED', questionId: 'q2', answer: pick, result: wrong })

    expect(afterFirst).toMatchObject({ streak: 1 })
    expect(afterWrong).toMatchObject({ streak: 0, correctCount: 1 })
  })

  it('bestStreak: đúng-đúng-sai-đúng thì dài nhất là 2 và mang sang màn xong', () => {
    const questions = ['q1', 'q2', 'q3', 'q4'].map((id) => ({ id, timeLimitSeconds: 30, points: 10, questionText: id, options: [] }))
    const game = { ...makeGame(), questions } as StudentGame
    let state = playReducer(playReducer(initialPlayState, { type: 'START' }), { type: 'STARTED', session, game })

    for (const [id, result] of [['q1', correct], ['q2', correct], ['q3', wrong], ['q4', correct]] as const) {
      state = playReducer(playReducer(state, { type: 'ANSWERED', questionId: id, answer: pick, result }), { type: 'NEXT' })
    }

    expect(state).toMatchObject({ phase: 'finished', bestStreak: 2, correctCount: 3 })
  })

  it('chưa trả lời thì không sang câu sau được', () => {
    const state = started()

    expect(playReducer(state, { type: 'NEXT' })).toBe(state)
  })

  it('đi hết các câu: câu sau, rồi màn xong với số câu đúng và điểm', () => {
    let state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

    state = playReducer(state, { type: 'NEXT' })
    expect(state).toMatchObject({ phase: 'playing', index: 1, result: null, correctCount: 1 })

    state = playReducer(state, { type: 'ANSWERED', questionId: 'q2', answer: pick, result: wrong })
    state = playReducer(state, { type: 'NEXT' })

    expect(state).toMatchObject({ phase: 'finished', score: 10, correctCount: 1, total: 2, bestStreak: 1 })
  })

  it('chơi lại chỉ từ màn xong', () => {
    const playing = started()
    const finished: PlayState = { phase: 'finished', score: 0, correctCount: 0, total: 2, bestStreak: 0, game: makeGame(), history: [] }

    expect(playReducer(playing, { type: 'RESTART' })).toBe(playing)
    expect(playReducer(finished, { type: 'RESTART' })).toEqual(initialPlayState)
  })

  it('history: ghi đúng câu, đáp án, kết quả; lần chấm thứ hai của cùng câu không ghi thêm', () => {
    const once = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })
    const twice = playReducer(once, { type: 'ANSWERED', questionId: 'q1', answer: { selectedOptionId: 'b' }, result: wrong })

    expect(twice).toBe(once)
    expect(once).toMatchObject({ history: [{ questionId: 'q1', answer: pick, result: correct }] })
  })

  it('đi hết thì màn xong giữ game và history; xem lại mở/đóng/chơi lại', () => {
    let state = playReducer(started(), { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })

    state = playReducer(playReducer(state, { type: 'NEXT' }), { type: 'ANSWERED', questionId: 'q2', answer: { outcome: 'TIMEOUT' }, result: wrong })
    const finished = playReducer(state, { type: 'NEXT' })

    expect(finished).toMatchObject({ phase: 'finished', game: { gameType: 'QUIZ' } })
    expect((finished as { history: unknown[] }).history).toHaveLength(2)

    const review = playReducer(finished, { type: 'OPEN_REVIEW' })

    expect(review).toMatchObject({ phase: 'review', score: 10, total: 2 })
    expect(playReducer(review, { type: 'CLOSE_REVIEW' })).toEqual(finished)
    expect(playReducer(review, { type: 'RESTART' })).toEqual(initialPlayState)
  })

  it('OPEN_REVIEW chỉ từ màn xong; CLOSE_REVIEW chỉ từ màn xem lại', () => {
    const playing = started()

    expect(playReducer(playing, { type: 'OPEN_REVIEW' })).toBe(playing)
    expect(playReducer(playing, { type: 'CLOSE_REVIEW' })).toBe(playing)
    expect(playReducer(initialPlayState, { type: 'OPEN_REVIEW' })).toBe(initialPlayState)
  })

  it('tiếp tục khi đã nộp hết: màn xong có history rỗng', () => {
    expect(started(['q1', 'q2'])).toMatchObject({ phase: 'finished', history: [] })
  })

  it('tiếp tục phiên sau tải lại: bộ đếm đã lưu được khôi phục, cả khi đã nộp hết', () => {
    const starting = playReducer(initialPlayState, { type: 'START' })
    const progress = { score: 20, correctCount: 2, streak: 2, bestStreak: 2 }

    expect(playReducer(starting, { type: 'STARTED', session, game: makeGame(['q1']), progress })).toMatchObject({ phase: 'playing', index: 1, score: 20, correctCount: 2, streak: 2, bestStreak: 2 })
    expect(playReducer(starting, { type: 'STARTED', session, game: makeGame(['q1', 'q2']), progress })).toMatchObject({ phase: 'finished', correctCount: 2, score: 20, bestStreak: 2 })
  })

  it('hành động sai pha bị bỏ qua', () => {
    expect(playReducer(initialPlayState, { type: 'ANSWERED', questionId: 'q1', answer: pick, result: correct })).toBe(initialPlayState)
    expect(playReducer(initialPlayState, { type: 'STARTED', session, game: makeGame() })).toBe(initialPlayState)
  })
})
