import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerPayload } from '../../types/game-student.types'
import { RoomJoinError, rankStandings, type StudentRoomEvent, type TeacherRoomEvent } from './RoomClient'
import { createMockRoom, type MockRoomOptions } from './mockRoom'

const QUESTIONS = ['q1', 'q2', 'q3']
const ANSWER = { selectedOptionId: 'a' } as unknown as AnswerPayload

function setup(options: Partial<MockRoomOptions> = {}) {
  const room = createMockRoom({ questionIds: QUESTIONS, questionMs: 10_000, random: () => 0.5, ...options })
  const teacherEvents: TeacherRoomEvent[] = []

  room.teacher.subscribe((event) => teacherEvents.push(event))

  return { room, teacherEvents }
}

async function joinStudent(room: ReturnType<typeof createMockRoom>, nickname: string) {
  const joined = room.join(nickname)
  const events: StudentRoomEvent[] = []

  joined.client.subscribe((event) => events.push(event))
  await joined.client.connect()

  return { ...joined, events }
}

const last = <T extends { type: string }, K extends T['type']>(events: T[], type: K) => events.filter((event) => event.type === type).at(-1) as Extract<T, { type: K }> | undefined

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('rankStandings', () => {
  it('bằng điểm cùng hạng, người sau nhảy hạng, nhóm hòa sắp theo biệt danh', () => {
    const ranked = rankStandings([
      { nickname: 'Cá', score: 10 },
      { nickname: 'Bò', score: 20 },
      { nickname: 'An', score: 20 },
      { nickname: 'Dê', score: 30 },
    ])

    expect(ranked.map(({ nickname, rank }) => [nickname, rank])).toEqual([
      ['Dê', 1],
      ['An', 2],
      ['Bò', 2],
      ['Cá', 4],
    ])
  })
})

describe('createMockRoom', () => {
  it('30 học sinh ảo: chạy hết ván, tivi chỉ nhận tối đa 5 dòng và answered lên đủ 30', async () => {
    const { room, teacherEvents } = setup({ virtualStudents: 30 })

    await room.teacher.connect()
    expect(last(teacherEvents, 'sync')?.data.lobby.participantCount).toBe(30)
    await room.teacher.start()

    for (const questionId of QUESTIONS) {
      await room.teacher.next()
      await vi.advanceTimersByTimeAsync(10_000)
      expect(last(teacherEvents, 'answered')?.data).toEqual({ questionId, answeredCount: 30, participantCount: 30 })
      expect(last(teacherEvents, 'board')?.data.top).toHaveLength(5)
    }

    await room.teacher.finish()
    expect(last(teacherEvents, 'finished')?.data.top).toHaveLength(3)
    expect(teacherEvents.filter((event) => event.type === 'board')).toHaveLength(3)
  })

  it('phòng 0 người: câu vẫn mở tới hết giờ, không lướt qua câu tiếp', async () => {
    const { room, teacherEvents } = setup()

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await room.teacher.next()
    expect(last(teacherEvents, 'question')?.data.index).toBe(0)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(last(teacherEvents, 'board')?.data).toMatchObject({ top: [], classCorrectRate: 0 })
  })

  it('bảng và bục: hòa điểm quanh ranh giới vẫn cắt đúng 5 và 3 dòng, hạng trùng nhau', async () => {
    const { room, teacherEvents } = setup({ virtualStudents: 8, random: () => 0 })

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await vi.advanceTimersByTimeAsync(10_000)
    await room.teacher.finish()

    expect(last(teacherEvents, 'board')?.data.top.map((row) => row.rank)).toEqual([1, 1, 1, 1, 1])
    expect(last(teacherEvents, 'finished')?.data.top.map((row) => row.rank)).toEqual([1, 1, 1])
  })

  it('kết thúc lúc câu đang mở thì chấm câu đó một lần; gọi lại hay sang câu mới không có tác dụng', async () => {
    const { room, teacherEvents } = setup({ grade: () => true })
    const mit = await joinStudent(room, 'Mít')
    await joinStudent(room, 'Na')

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await mit.client.answer('q1', ANSWER)
    await room.teacher.finish()
    await room.teacher.finish()
    await room.teacher.next()
    await vi.advanceTimersByTimeAsync(30_000)

    expect(teacherEvents.filter((event) => event.type === 'board')).toHaveLength(1)
    expect(teacherEvents.filter((event) => event.type === 'finished')).toHaveLength(1)
    expect(last(teacherEvents, 'question')?.data.index).toBe(0)
    expect(last(mit.events, 'myFinal')?.data.score).toBe(100)
  })

  it('đóng phòng lúc câu đang mở: không còn bảng, sync sau đó không còn kết quả cũ', async () => {
    const { room } = setup({ grade: () => true })
    const mit = await joinStudent(room, 'Mít')
    const na = await joinStudent(room, 'Na')

    await room.teacher.start()
    await room.teacher.next()
    await mit.client.answer('q1', ANSWER)
    await na.client.answer('q1', ANSWER)
    await room.teacher.next()
    const boards = mit.events.filter((event) => event.type === 'board').length

    await room.teacher.close()
    mit.dropConnection()
    await vi.advanceTimersByTimeAsync(30_000)

    expect(mit.events.filter((event) => event.type === 'board')).toHaveLength(boards)
    expect(last(mit.events, 'sync')?.data).toMatchObject({ status: 'CLOSED', me: null, myFinal: null, board: null })
  })

  it('học sinh ảo bị xóa giữa câu không còn trả lời', async () => {
    const { room, teacherEvents } = setup({ virtualStudents: 2 })

    await room.teacher.connect()
    await room.teacher.start()
    const [victim] = last(teacherEvents, 'sync')?.data.lobby.participants ?? []

    await room.teacher.next()
    await room.teacher.kick(victim.participantId)
    await vi.advanceTimersByTimeAsync(10_000)

    expect(last(teacherEvents, 'answered')?.data).toMatchObject({ answeredCount: 1, participantCount: 1 })
    expect(teacherEvents.filter((event) => event.type === 'answered').every((event) => event.data.participantCount <= 2)).toBe(true)
    expect(teacherEvents.filter((event) => event.type === 'answered')).toHaveLength(3)
  })

  it('học sinh không nhận participantId của ai, answered hay hạng của người khác', async () => {
    const { room } = setup({ virtualStudents: 6 })
    const student = await joinStudent(room, 'Mít')

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await student.client.answer('q1', ANSWER)
    await vi.advanceTimersByTimeAsync(10_000)

    const raw = JSON.stringify(student.events)

    expect(raw).not.toContain('participant-')
    expect(raw).not.toContain('"participants"')
    expect(student.events.some((event) => (event.type as string) === 'answered')).toBe(false)
    expect(student.events.filter((event) => event.type === 'me')).toHaveLength(1)
    expect(Object.keys(last(student.events, 'board')?.data.top[0] ?? {}).sort()).toEqual(['delta', 'nickname', 'rank', 'score'])
    expect(last(student.events, 'me')?.data.participantCount).toBe(7)
    expect(student.events.filter((event) => event.type === 'lobby').every((event) => Object.keys(event.data).join() === 'participantCount')).toBe(true)
  })

  it('tất cả đã trả lời thì đóng câu ngay, me đến trước board', async () => {
    const { room } = setup({ grade: () => true })
    const student = await joinStudent(room, 'Mít')

    await room.teacher.start()
    await room.teacher.next()
    await student.client.answer('q1', ANSWER)

    expect(student.events.map((event) => event.type).slice(-2)).toEqual(['me', 'board'])
    expect(last(student.events, 'me')?.data).toMatchObject({ isCorrect: true, delta: 100, rank: 1, participantCount: 1 })
  })

  it('trả lời lần hai khi câu còn mở không được tính thêm', async () => {
    const { room, teacherEvents } = setup({ grade: () => true })
    const mit = await joinStudent(room, 'Mít')
    await joinStudent(room, 'Na')

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await mit.client.answer('q1', ANSWER)
    await mit.client.answer('q1', ANSWER)

    expect(last(teacherEvents, 'answered')?.data.answeredCount).toBe(1)
    expect(teacherEvents.filter((event) => event.type === 'answered')).toHaveLength(2)
    expect(last(teacherEvents, 'board')).toBeUndefined()
  })

  it('chuỗi đúng 3 câu được thưởng 20', async () => {
    const { room } = setup({ grade: () => true })
    const student = await joinStudent(room, 'Mít')

    await room.teacher.start()
    for (const questionId of QUESTIONS) {
      await room.teacher.next()
      await student.client.answer(questionId, ANSWER)
    }

    expect(last(student.events, 'me')?.data).toMatchObject({ streak: 3, streakBonus: 20, delta: 120, score: 320 })
  })

  it('không trả lời thì không trừ điểm và mất chuỗi', async () => {
    const { room } = setup({ grade: () => true, questionMs: 1000 })
    const student = await joinStudent(room, 'Mít')

    await room.teacher.start()
    await room.teacher.next()
    await student.client.answer('q1', ANSWER)
    await room.teacher.next()
    await vi.advanceTimersByTimeAsync(1000)

    expect(last(student.events, 'me')?.data).toMatchObject({ isCorrect: false, delta: 0, streak: 0, score: 100 })
  })

  it('tạm dừng giữ thời gian còn lại, tiếp tục rồi mới hết giờ', async () => {
    const { room, teacherEvents } = setup()
    const student = await joinStudent(room, 'Mít')

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await vi.advanceTimersByTimeAsync(4000)
    await room.teacher.pause()
    expect(last(teacherEvents, 'state')?.data).toEqual({ status: 'PAUSED', remainingMs: 6000 })

    await vi.advanceTimersByTimeAsync(60_000)
    expect(last(student.events, 'board')).toBeUndefined()

    await room.teacher.resume()
    await vi.advanceTimersByTimeAsync(5999)
    expect(last(student.events, 'board')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(last(student.events, 'board')).toBeDefined()
  })

  it('báo lỗi khi đủ người, đã bắt đầu, đã đóng', async () => {
    const full = setup({ maxParticipants: 1 })

    full.room.join('Mít')
    expect(() => full.room.join('Na')).toThrow(new RoomJoinError('SESSION_FULL'))

    const { room } = setup()

    await room.teacher.start()
    expect(() => room.join('Na')).toThrow(new RoomJoinError('SESSION_ALREADY_STARTED'))
    await room.teacher.close()
    expect(() => room.join('Na')).toThrow(new RoomJoinError('SESSION_CLOSED'))
  })

  it('xóa biệt danh: đúng máy đó nhận kicked và ngắt, máy khác chỉ thấy số người giảm', async () => {
    const { room, teacherEvents } = setup()
    const mit = await joinStudent(room, 'Mít')
    const na = await joinStudent(room, 'Na')

    await room.teacher.connect()
    await room.teacher.kick(mit.participantId)

    expect(last(mit.events, 'kicked')).toBeDefined()
    expect(last(na.events, 'kicked')).toBeUndefined()
    expect(last(na.events, 'lobby')?.data).toEqual({ participantCount: 1 })
    expect(last(teacherEvents, 'lobby')?.data.participants.map((p) => p.nickname)).toEqual(['Na'])
    expect(() => room.join('Mít')).not.toThrow()
    await expect(mit.client.connect()).rejects.toThrow()
  })

  it('xóa bạn cuối cùng chưa trả lời thì câu đóng luôn', async () => {
    const { room } = setup({ grade: () => true })
    const mit = await joinStudent(room, 'Mít')
    const na = await joinStudent(room, 'Na')

    await room.teacher.start()
    await room.teacher.next()
    await na.client.answer('q1', ANSWER)
    await room.teacher.kick(mit.participantId)

    expect(last(na.events, 'board')?.data.top.map((row) => row.nickname)).toEqual(['Na'])
  })

  it('mất kết nối: bỏ lỡ sự kiện, tự nối lại và nhận sync đúng trạng thái', async () => {
    const { room } = setup({ grade: () => true })
    const student = await joinStudent(room, 'Mít')
    const statuses: string[] = []

    student.client.subscribeConnection((status) => statuses.push(status))
    await room.teacher.start()
    student.dropConnection()
    await room.teacher.next()
    expect(last(student.events, 'question')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1500)

    expect(statuses).toEqual(['reconnecting', 'connected'])
    expect(last(student.events, 'sync')?.data.question?.questionId).toBe('q1')
    await student.client.answer('q1', ANSWER)
    expect(last(student.events, 'me')?.data.isCorrect).toBe(true)
  })

  it('kết thúc gửi kết quả riêng cho từng máy; đóng phòng xóa biệt danh và bảng', async () => {
    const { room, teacherEvents } = setup({ grade: () => true })
    const student = await joinStudent(room, 'Mít')
    const other = await joinStudent(room, 'Na')

    await room.teacher.connect()
    await room.teacher.start()
    await room.teacher.next()
    await student.client.answer('q1', ANSWER)
    await room.teacher.finish()

    expect(last(student.events, 'myFinal')?.data).toMatchObject({ score: 100, correctCount: 1, total: 3, rank: 1, bestStreak: 1 })
    expect(last(other.events, 'myFinal')?.data).toMatchObject({ score: 0, correctCount: 0, rank: 2 })

    await room.teacher.close()
    room.dropTeacherConnection()
    await vi.advanceTimersByTimeAsync(1500)

    expect(last(teacherEvents, 'sync')?.data).toMatchObject({ status: 'CLOSED', board: null, finished: null, lobby: { participantCount: 0, participants: [] } })
  })
})
