import { describe, expect, it } from 'vitest'
import { initialTeacherRoomState, teacherRoomReducer, teacherRoomView, type TeacherRoomAction } from './teacherRoomReducer'

const MIT = { participantId: 'p1', nickname: 'Mít' }

describe('teacherRoomReducer', () => {
  it('lobby cập nhật danh sách, state cập nhật trạng thái, connection cập nhật kết nối', () => {
    let state = teacherRoomReducer(initialTeacherRoomState, { type: 'lobby', data: { participantCount: 1, participants: [MIT] } })

    state = teacherRoomReducer(state, { type: 'state', data: { status: 'ACTIVE', remainingMs: null } })
    state = teacherRoomReducer(state, { type: 'connection', status: 'reconnecting' })

    expect(state).toMatchObject({ connection: 'reconnecting', status: 'ACTIVE', participants: [MIT], participantCount: 1 })
  })

  const question = (questionId: string, index: number, endsAt = 'a'): TeacherRoomAction => ({ type: 'question', data: { questionId, index, total: 3, endsAt, durationMs: 1000, serverNow: 'a' } })
  const board = (afterIndex: number): TeacherRoomAction => ({ type: 'board', data: { afterIndex, top: [], classCorrectRate: 0 } })
  const run = (...actions: TeacherRoomAction[]) => actions.reduce(teacherRoomReducer, { ...initialTeacherRoomState, status: 'ACTIVE' as const })

  it('câu mới xóa số đã trả lời và cờ đáp án; phát lại cùng câu sau tạm dừng thì giữ', () => {
    const answered = { type: 'answered', data: { questionId: 'q1', answeredCount: 5, participantCount: 9 } } as const

    const reveal = { type: 'reveal', data: { questionId: 'q1', correctAnswer: null } } as const

    expect(run(question('q1', 0), answered, reveal, question('q1', 0, 'b'))).toMatchObject({ answeredCount: 5, revealed: true })
    expect(run(question('q1', 0), answered, reveal, question('q2', 1))).toMatchObject({ answeredCount: 0, revealed: false })
  })

  it('đóng phòng xóa biệt danh, bảng và bục khỏi tab của cô, giữ trạng thái kết nối', () => {
    const state = run(
      { type: 'connection', status: 'connected' },
      { type: 'lobby', data: { participantCount: 1, participants: [MIT] } },
      question('q1', 0),
      board(0),
      { type: 'finished', data: { top: [], averageCorrect: 0, total: 3 } },
      { type: 'state', data: { status: 'CLOSED', remainingMs: null } },
    )

    expect(state).toEqual({ ...initialTeacherRoomState, connection: 'connected', status: 'CLOSED' })
  })

  it('màn suy từ trạng thái: bảng câu trước không che câu mới', () => {
    expect(teacherRoomView(initialTeacherRoomState)).toBe('lobby')
    expect(teacherRoomView(run())).toBe('started')
    expect(teacherRoomView(run(question('q1', 0)))).toBe('question')
    expect(teacherRoomView(run(question('q1', 0), board(0)))).toBe('board')
    expect(teacherRoomView(run(question('q1', 0), board(0), question('q2', 1)))).toBe('question')
    expect(teacherRoomView(run(question('q1', 0), board(0), { type: 'finished', data: { top: [], averageCorrect: 0, total: 3 } }))).toBe('finished')
    expect(teacherRoomView(run({ type: 'state', data: { status: 'CLOSED', remainingMs: null } }))).toBe('closed')
  })

  it('sync khôi phục toàn bộ; sang câu khác trong lúc mất kết nối thì bỏ cờ đáp án', () => {
    const data = (questionId: string, index: number) => ({ questionId, index, total: 3, endsAt: 'a', durationMs: 1000, serverNow: 'a' })
    const before = teacherRoomReducer(teacherRoomReducer(initialTeacherRoomState, { type: 'question', data: data('q1', 0) }), { type: 'reveal', data: { questionId: 'q1', correctAnswer: null } })
    const state = teacherRoomReducer(before, {
      type: 'sync',
      data: { status: 'PAUSED', remainingMs: 3000, lobby: { participantCount: 1, participants: [MIT] }, question: data('q2', 1), board: { afterIndex: 0, top: [], classCorrectRate: 0.5 }, finished: null, answeredCount: 4 },
    })

    expect(state).toMatchObject({ status: 'PAUSED', remainingMs: 3000, participants: [MIT], participantCount: 1, answeredCount: 4, revealed: false, finished: null })
    expect(state.question?.questionId).toBe('q2')
    expect(state.board?.classCorrectRate).toBe(0.5)
  })
})
