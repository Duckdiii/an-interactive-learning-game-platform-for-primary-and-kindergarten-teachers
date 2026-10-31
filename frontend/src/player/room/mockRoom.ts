import type { AnswerPayload } from '../../types/game-student.types'
import {
  RoomJoinError,
  rankStandings,
  type RoomBoard,
  type RoomClient,
  type RoomConnection,
  type RoomFinished,
  type RoomMe,
  type RoomMyFinal,
  type RoomQuestion,
  type RoomStatus,
  type StudentRoomClient,
  type StudentRoomEvent,
  type TeacherRoomClient,
  type TeacherRoomEvent,
} from './RoomClient'

const TOP_BOARD = 5
const TOP_PODIUM = 3
const STREAK_BONUS = 20
const STREAK_BONUS_FROM = 3
const MIN_POINTS = 60
const SPEED_POINTS = 40
const VIRTUAL_CORRECT_RATE = 0.7
const RECONNECT_MS = 1500
const VIRTUAL_NAMES = ['Ong Vàng', 'Sao Băng', 'Cá Heo', 'Hổ Con', 'Thỏ Ngọc', 'Mèo Mướp', 'Gấu Trúc', 'Rồng Lửa', 'Chim Sẻ', 'Sóc Nâu']

export interface MockRoomOptions {
  questionIds: readonly string[]
  /** Biệt danh ảo vào phòng ngay từ đầu. */
  virtualStudents?: number
  maxParticipants?: number
  questionMs?: number
  random?: () => number
  grade?: (questionId: string, answer: AnswerPayload) => boolean
  correctAnswerOf?: (questionId: string) => Record<string, unknown> | null
}

interface Player {
  participantId: string
  nickname: string
  score: number
  delta: number
  streak: number
  bestStreak: number
  correctCount: number
  /** Tỉ lệ thời gian còn lại lúc trả lời cùng kết quả, của câu đang chạy. */
  answer: { isCorrect: boolean; speed: number } | null
  me: RoomMe | null
  myFinal: RoomMyFinal | null
  connection: MockConnection<StudentRoomEvent> | null
}

class MockConnection<E> implements RoomClient<E> {
  private listeners = new Set<(event: E) => void>()
  private connectionListeners = new Set<(status: RoomConnection) => void>()
  private status: RoomConnection = 'disconnected'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private revoked = false
  private readonly resync: () => void

  constructor(resync: () => void) {
    this.resync = resync
  }

  async connect(): Promise<void> {
    if (this.revoked) throw new Error('Biệt danh đã bị xóa khỏi phòng')

    this.setStatus('connected')
    this.resync()
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.setStatus('disconnected')
  }

  subscribe(listener: (event: E) => void): () => void {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  subscribeConnection(listener: (status: RoomConnection) => void): () => void {
    this.connectionListeners.add(listener)

    return () => this.connectionListeners.delete(listener)
  }

  /** Sự kiện phát lúc mất kết nối thì mất hẳn, như STOMP; nối lại nhận `sync`. */
  deliver(event: E): void {
    if (this.status === 'connected') this.listeners.forEach((listener) => listener(event))
  }

  revoke(): void {
    this.revoked = true
    this.disconnect()
  }

  drop(): void {
    if (this.status !== 'connected') return

    this.setStatus('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.setStatus('connected')
      this.resync()
    }, RECONNECT_MS)
  }

  private setStatus(status: RoomConnection): void {
    this.status = status
    this.connectionListeners.forEach((listener) => listener(status))
  }
}

/**
 * Máy chủ phòng giả chạy trong trình duyệt: một phòng, một máy giáo viên, nhiều học sinh ảo và có thể thêm học sinh thật.
 * Chỉ để dựng giao diện P5; chạy mượt ở đây không chứng minh 30 máy thật ổn định.
 */
export function createMockRoom(options: MockRoomOptions) {
  const { questionIds, virtualStudents = 0, maxParticipants = 40, questionMs = 20_000 } = options
  const random = options.random ?? Math.random
  const grade = options.grade ?? (() => random() < VIRTUAL_CORRECT_RATE)
  const correctAnswerOf = options.correctAnswerOf ?? (() => null)

  let nextId = 0
  let status: RoomStatus = 'WAITING'
  let index = -1
  let question: RoomQuestion | null = null
  let board: RoomBoard | null = null
  let finished: RoomFinished | null = null
  let remainingMs: number | null = null
  let questionEndsAt = 0
  let questionOpen = false
  let questionTimers: ReturnType<typeof setTimeout>[] = []
  const players: Player[] = []

  const answeredCount = () => players.filter((player) => player.answer).length
  const teacherLobby = () => ({
    participantCount: players.length,
    participants: players.map(({ participantId, nickname }) => ({ participantId, nickname })),
  })
  const studentLobby = () => ({ participantCount: players.length })

  const syncQuestion = () => question && { ...question, serverNow: new Date().toISOString() }

  const teacher: MockConnection<TeacherRoomEvent> = new MockConnection<TeacherRoomEvent>(() =>
    teacher.deliver({ type: 'sync', data: { status, remainingMs, lobby: teacherLobby(), question: syncQuestion(), board, finished, answeredCount: answeredCount() } }),
  )

  const emitStudents = (event: StudentRoomEvent) => players.forEach((player) => player.connection?.deliver(event))
  const emitAll = (event: TeacherRoomEvent & StudentRoomEvent) => {
    teacher.deliver(event)
    emitStudents(event)
  }
  const emitLobby = () => {
    teacher.deliver({ type: 'lobby', data: teacherLobby() })
    emitStudents({ type: 'lobby', data: studentLobby() })
  }
  const emitAnswered = (questionId: string) =>
    teacher.deliver({ type: 'answered', data: { questionId, answeredCount: answeredCount(), participantCount: players.length } })

  const addPlayer = (nickname: string): Player => {
    const player: Player = {
      participantId: `participant-${++nextId}`,
      nickname,
      score: 0,
      delta: 0,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      answer: null,
      me: null,
      myFinal: null,
      connection: null,
    }

    players.push(player)

    return player
  }

  const clearQuestionTimers = () => {
    questionTimers.forEach(clearTimeout)
    questionTimers = []
  }

  const recordAnswer = (player: Player, questionId: string, isCorrect: boolean) => {
    const left = Math.max(questionEndsAt - Date.now(), 0)

    player.answer = { isCorrect, speed: left / questionMs }
    emitAnswered(questionId)
    if (answeredCount() === players.length) endQuestion()
  }

  /** Học sinh ảo chưa trả lời thì trả lời ở một lúc ngẫu nhiên trong `windowMs`; hết `windowMs` thì đóng câu. */
  const scheduleQuestion = (questionId: string, windowMs: number) => {
    questionEndsAt = Date.now() + windowMs
    questionOpen = true
    questionTimers = players
      .filter((player) => !player.connection && !player.answer)
      .map((player) =>
        setTimeout(() => {
          if (!player.answer && players.includes(player)) recordAnswer(player, questionId, random() < VIRTUAL_CORRECT_RATE)
        }, random() * windowMs * 0.9),
      )
    questionTimers.push(setTimeout(endQuestion, windowMs))
  }

  function endQuestion() {
    if (!questionOpen || !question) return

    questionOpen = false
    remainingMs = null
    clearQuestionTimers()

    const { questionId } = question
    const correctThisRound = players.filter((player) => player.answer?.isCorrect).length

    for (const player of players) {
      const isCorrect = player.answer?.isCorrect ?? false

      player.streak = isCorrect ? player.streak + 1 : 0
      player.bestStreak = Math.max(player.bestStreak, player.streak)
      if (isCorrect) player.correctCount += 1
      const streakBonus = isCorrect && player.streak >= STREAK_BONUS_FROM ? STREAK_BONUS : 0

      player.delta = isCorrect ? MIN_POINTS + Math.round(SPEED_POINTS * (player.answer?.speed ?? 0)) + streakBonus : 0
      player.score += player.delta
      player.answer = null
      player.me = { questionId, isCorrect, delta: player.delta, streak: player.streak, streakBonus, score: player.score, rank: 0, participantCount: players.length }
    }

    const ranked = rankStandings(players)

    for (const { participantId, rank } of ranked) {
      const player = players.find((candidate) => candidate.participantId === participantId)

      if (player?.me) {
        player.me.rank = rank
        player.connection?.deliver({ type: 'me', data: player.me })
      }
    }

    board = {
      afterIndex: index,
      top: ranked.slice(0, TOP_BOARD).map(({ rank, nickname, score, delta }) => ({ rank, nickname, score, delta })),
      classCorrectRate: players.length ? correctThisRound / players.length : 0,
    }
    emitAll({ type: 'board', data: board })
  }

  const teacherClient: TeacherRoomClient = {
    connect: () => teacher.connect(),
    disconnect: () => teacher.disconnect(),
    subscribe: (listener) => teacher.subscribe(listener),
    subscribeConnection: (listener) => teacher.subscribeConnection(listener),

    async start() {
      if (status !== 'WAITING') return

      status = 'ACTIVE'
      emitAll({ type: 'state', data: { status, remainingMs } })
    },

    async next() {
      if (status !== 'ACTIVE' || questionOpen || finished || index + 1 >= questionIds.length) return

      index += 1
      const questionId = questionIds[index]
      const now = Date.now()

      question = {
        questionId,
        index,
        total: questionIds.length,
        endsAt: new Date(now + questionMs).toISOString(),
        durationMs: questionMs,
        serverNow: new Date(now).toISOString(),
      }
      emitAll({ type: 'question', data: question })
      emitAnswered(questionId)
      scheduleQuestion(questionId, questionMs)
    },

    async endQuestion() {
      if (status === 'ACTIVE') endQuestion()
    },

    async reveal() {
      if (!question || questionOpen) return

      emitAll({ type: 'reveal', data: { questionId: question.questionId, correctAnswer: correctAnswerOf(question.questionId) } })
    },

    async pause() {
      if (status !== 'ACTIVE') return

      status = 'PAUSED'
      if (questionOpen) {
        remainingMs = Math.max(questionEndsAt - Date.now(), 0)
        clearQuestionTimers()
      }
      emitAll({ type: 'state', data: { status, remainingMs } })
    },

    async resume() {
      if (status !== 'PAUSED') return

      status = 'ACTIVE'
      const left = remainingMs

      remainingMs = null
      emitAll({ type: 'state', data: { status, remainingMs } })
      if (questionOpen && question && left !== null) {
        const now = Date.now()

        question = { ...question, endsAt: new Date(now + left).toISOString(), serverNow: new Date(now).toISOString() }
        emitAll({ type: 'question', data: question })
        scheduleQuestion(question.questionId, left)
      }
    },

    async finish() {
      if ((status !== 'ACTIVE' && status !== 'PAUSED') || finished) return

      endQuestion()

      const ranked = rankStandings(players)
      const total = questionIds.length
      const correctSum = players.reduce((sum, player) => sum + player.correctCount, 0)

      finished = {
        top: ranked.slice(0, TOP_PODIUM).map(({ rank, nickname, score }) => ({ rank, nickname, score })),
        averageCorrect: players.length ? correctSum / players.length : 0,
        total,
      }
      emitAll({ type: 'finished', data: finished })
      for (const { participantId, rank, score, correctCount, bestStreak } of ranked) {
        const player = players.find((candidate) => candidate.participantId === participantId)

        if (player) {
          player.myFinal = { score, correctCount, total, rank, participantCount: players.length, bestStreak }
          player.connection?.deliver({ type: 'myFinal', data: player.myFinal })
        }
      }
    },

    async close() {
      if (status === 'CLOSED') return

      questionOpen = false
      clearQuestionTimers()
      status = 'CLOSED'
      remainingMs = null
      emitAll({ type: 'state', data: { status, remainingMs } })
      // SPEC 1.9: đóng phòng thì xóa biệt danh và bảng xếp hạng.
      for (const player of players) {
        player.me = null
        player.myFinal = null
      }
      players.length = 0
      question = null
      board = null
      finished = null
    },

    async kick(participantId) {
      const position = players.findIndex((player) => player.participantId === participantId)

      if (position < 0) return

      const [player] = players.splice(position, 1)

      player.connection?.deliver({ type: 'kicked', data: {} })
      player.connection?.revoke()
      emitLobby()
      if (questionOpen && question) {
        emitAnswered(question.questionId)
        if (players.length > 0 && answeredCount() === players.length) endQuestion()
      }
    },
  }

  for (let i = 0; i < virtualStudents; i += 1) {
    const round = Math.floor(i / VIRTUAL_NAMES.length)

    addPlayer(round ? `${VIRTUAL_NAMES[i % VIRTUAL_NAMES.length]} ${round + 1}` : VIRTUAL_NAMES[i])
  }

  return {
    teacher: teacherClient,

    /** Như `POST /sessions/{id}/join`. Trả `participantId` để kiểm tra, giao diện học sinh lưu như máy thật. */
    join(nickname: string): { participantId: string; client: StudentRoomClient; dropConnection: () => void } {
      if (status === 'CLOSED') throw new RoomJoinError('SESSION_CLOSED')
      if (status !== 'WAITING') throw new RoomJoinError('SESSION_ALREADY_STARTED')
      if (players.length >= maxParticipants) throw new RoomJoinError('SESSION_FULL')

      const player = addPlayer(nickname)
      const connection: MockConnection<StudentRoomEvent> = new MockConnection<StudentRoomEvent>(() =>
        connection.deliver({
          type: 'sync',
          data: { status, remainingMs, lobby: studentLobby(), question: syncQuestion(), board, finished, me: player.me, myFinal: player.myFinal },
        }),
      )

      player.connection = connection
      emitLobby()

      return {
        participantId: player.participantId,
        dropConnection: () => connection.drop(),
        client: {
          connect: () => connection.connect(),
          disconnect: () => connection.disconnect(),
          subscribe: (listener) => connection.subscribe(listener),
          subscribeConnection: (listener) => connection.subscribeConnection(listener),
          async answer(questionId, payload) {
            if (!questionOpen || status !== 'ACTIVE' || question?.questionId !== questionId || player.answer) return
            if (!players.includes(player)) return

            recordAnswer(player, questionId, grade(questionId, payload))
          },
        },
      }
    },

    dropTeacherConnection: () => teacher.drop(),
  }
}
