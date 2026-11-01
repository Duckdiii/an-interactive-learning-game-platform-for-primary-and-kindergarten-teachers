import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import type { GameResponse } from '../../types/game-response.types'
import { GAME_TYPES } from '../../types/game-dsl.types'
import type { StudentGame } from '../../types/game-student.types'
import { RoomJoinError } from './RoomClient'
import type { StudentRoomEvent } from './RoomClient'
import { createMockRoom } from './mockRoom'
import { findTabRoom, hostTabRoom, joinTabRoom } from './tabRoom'
import { TabRoomApi, toRoomGame } from './tabRoomApi'

const managed = (index: number) => ({ ...buildMockGameContents()[index], gameId: 'g1', status: 'PUBLISHED', updatedAt: '2026-11-01T00:00:00Z' }) as GameResponse

// Giả lập kênh giữa các tab: chỉ giao cho kênh KHÁC cùng tên, bất đồng bộ, dữ liệu qua clone như trình duyệt.
class FakeChannel extends EventTarget {
  static open = new Set<FakeChannel>()
  readonly name: string

  constructor(name: string) {
    super()
    this.name = name
    FakeChannel.open.add(this)
  }

  postMessage(data: unknown) {
    const copy = structuredClone(data)

    queueMicrotask(() => {
      FakeChannel.open.forEach((channel) => {
        if (channel !== this && channel.name === this.name) channel.dispatchEvent(new MessageEvent('message', { data: copy }))
      })
    })
  }

  close() {
    FakeChannel.open.delete(this)
  }
}

const PIN = '482913'
const info = { gameTitle: 'Đếm', gameType: 'QUIZ', questionCount: 2, metadata: { subject: 'MATH', gradeLevel: 'GRADE_1', topic: 'Đếm' }, uiOverride: 'AUTO', themeId: null } as const
const game = { gameType: 'QUIZ', questions: [] } as unknown as StudentGame

function host(options: Partial<Parameters<typeof createMockRoom>[0]> = {}) {
  const mock = createMockRoom({ questionIds: ['q1', 'q2'], grade: () => true, ...options })
  const close = hostTabRoom(PIN, { info, game, join: mock.join, kick: mock.teacher.kick })

  return { mock, close }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

async function joined(nickname = 'Ong Vàng') {
  const { client, leave } = await joinTabRoom(PIN, nickname)
  const events: StudentRoomEvent[] = []
  const statuses: string[] = []

  client.subscribe((event) => events.push(event))
  client.subscribeConnection((status) => statuses.push(status))
  await client.connect()
  await tick()

  return { client, leave, events, statuses }
}

const teacherLobby = async (mock: ReturnType<typeof createMockRoom>) => {
  let count = -1

  mock.teacher.subscribe((event) => {
    if (event.type === 'sync' || event.type === 'lobby') count = event.type === 'sync' ? event.data.lobby.participantCount : event.data.participantCount
  })
  await mock.teacher.connect()

  return () => count
}

beforeEach(() => {
  FakeChannel.open.clear()
  vi.stubGlobal('BroadcastChannel', FakeChannel)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('tra phòng theo PIN', () => {
  it('có tab giữ PIN thì trả thông tin phòng', async () => {
    host()

    await expect(findTabRoom(PIN)).resolves.toEqual({ info, game })
  })

  it('không tab nào giữ PIN thì trả null sau khi chờ', async () => {
    await expect(findTabRoom('000000')).resolves.toBeNull()
  })

  it('trình duyệt không có BroadcastChannel thì trả null, không lỗi', async () => {
    vi.stubGlobal('BroadcastChannel', undefined)

    await expect(findTabRoom(PIN)).resolves.toBeNull()
  })
})

describe('vào phòng qua kênh', () => {
  it('nối xong nhận `sync` và tivi thấy thêm một bạn', async () => {
    const { mock } = host()
    const count = await teacherLobby(mock)
    const { events, statuses } = await joined()

    expect(count()).toBe(1)
    expect(statuses).toContain('connected')
    expect(events.some((event) => event.type === 'sync')).toBe(true)
  })

  it('đủ người: báo đúng mã lỗi', async () => {
    host({ maxParticipants: 0 })

    await expect(joinTabRoom(PIN, 'A')).rejects.toMatchObject({ code: 'SESSION_FULL' })
  })

  it('phòng đã bắt đầu: báo đúng mã lỗi', async () => {
    const { mock } = host()

    await mock.teacher.start()

    await expect(joinTabRoom(PIN, 'A')).rejects.toMatchObject({ code: 'SESSION_ALREADY_STARTED' })
  })

  it('không còn phòng: coi như phòng đã đóng', async () => {
    await expect(joinTabRoom('000000', 'A')).rejects.toBeInstanceOf(RoomJoinError)
  })

  it('StrictMode ngắt rồi nối lại: không tạo thêm bạn và vẫn nhận sự kiện', async () => {
    const { mock } = host()
    const count = await teacherLobby(mock)
    const { client, events } = await joined()

    client.disconnect()
    await tick()
    await client.connect()
    await tick()
    events.length = 0
    await mock.teacher.start()
    await tick()

    expect(count()).toBe(1)
    expect(events.map((event) => event.type)).toContain('state')
  })

  it('trả lời hết thì nhận `me` đúng cho bạn đó, bạn khác không thấy', async () => {
    const { mock } = host()
    const first = await joined('A')
    const second = await joined('B')

    await mock.teacher.start()
    await mock.teacher.next()
    await tick()
    await first.client.answer('q1', { selectedOptionId: 'a' })
    await second.client.answer('q1', { selectedOptionId: 'b' })
    await tick()

    const me = (events: StudentRoomEvent[]) => events.filter((event) => event.type === 'me')

    expect(me(first.events)).toHaveLength(1)
    expect(me(second.events)).toHaveLength(1)
    expect(first.events.filter((event) => event.type === 'kicked')).toHaveLength(0)
  })

  it('tab học sinh rời đi thì tivi bớt một bạn', async () => {
    const { mock } = host()
    const count = await teacherLobby(mock)
    const { leave } = await joined()

    leave()
    await tick()

    expect(count()).toBe(0)
  })

  it('cô xóa biệt danh: chỉ đúng bạn đó nhận `kicked`', async () => {
    const { mock } = host()
    let participantId = ''

    mock.teacher.subscribe((event) => {
      if (event.type === 'lobby') participantId = event.data.participants[0]?.participantId ?? participantId
    })
    await mock.teacher.connect()

    const first = await joined('A')
    const second = await joined('B')

    await mock.teacher.kick(participantId)
    await tick()

    expect(first.events.map((event) => event.type)).toContain('kicked')
    expect(second.events.map((event) => event.type)).not.toContain('kicked')
  })

  it('kết thúc: mỗi bạn nhận `myFinal` của mình, trước khi cô bấm xem đáp án kênh không có đáp án', async () => {
    const SECRET = 'dap-an-bi-mat'
    const messages: unknown[] = []
    const post = FakeChannel.prototype.postMessage

    vi.spyOn(FakeChannel.prototype, 'postMessage').mockImplementation(function (this: FakeChannel, data: unknown) {
      messages.push(data)
      post.call(this, data)
    })

    const { mock } = host({ questionIds: ['q1'], grade: (_id, answer) => 'selectedOptionId' in answer && answer.selectedOptionId === 'a', correctAnswerOf: () => ({ selectedOptionId: SECRET }) })
    const first = await joined('A')
    const second = await joined('B')

    await mock.teacher.start()
    await mock.teacher.next()
    await tick()
    await first.client.answer('q1', { selectedOptionId: 'a' })
    await second.client.answer('q1', { selectedOptionId: 'b' })
    await tick()
    expect(JSON.stringify(messages)).not.toContain(SECRET)

    await mock.teacher.reveal()
    await mock.teacher.finish()
    await tick()

    const final = (events: StudentRoomEvent[]) => events.filter((event) => event.type === 'myFinal').map((event) => event.data.correctCount)

    expect(JSON.stringify(messages)).toContain(SECRET)
    expect(final(first.events)).toEqual([1])
    expect(final(second.events)).toEqual([0])
  })

  it('tab tivi đóng: tab học sinh chuyển sang phòng đóng và mất kết nối', async () => {
    const { close } = host()
    const { events, statuses } = await joined()

    close()
    await tick()

    expect(events.at(-1)).toEqual({ type: 'state', data: { status: 'CLOSED', remainingMs: null } })
    expect(statuses.at(-1)).toBe('disconnected')
  })
})

describe('TabRoomApi', () => {
  const ANSWER_KEYS = ['correctOptionId', 'oddOneOutId', '"correct"', 'distractors', 'hitRegion', 'correctWord', 'targetZoneId', 'correctPosition', 'correctAnswer']

  it.each(GAME_TYPES.map((type) => [type]))('%s: game gửi sang tab học sinh không chứa khóa đáp án', (type) => {
    const index = buildMockGameContents().findIndex((item) => item.gameType === type)
    const json = JSON.stringify(toRoomGame(managed(index)))

    ANSWER_KEYS.forEach((key) => expect(json).not.toContain(key))
  })

  it('chấm ở tab tivi theo đúng câu của game, không phải ngẫu nhiên', async () => {
    const quiz = managed(0)
    const api = new TabRoomApi()
    const room = await api.open(quiz)
    const found = await api.findByPin(room.pin)
    const { client } = await api.join(room.pin, 'A')
    const events: StudentRoomEvent[] = []
    const correctOptionId = (quiz.questions[0] as { correctOptionId: string }).correctOptionId

    client.subscribe((event) => events.push(event))
    await client.connect()
    await room.teacher.start()
    await room.teacher.next()
    await tick()
    await client.answer(found!.game.questions[0].id, { selectedOptionId: correctOptionId })
    await tick()

    expect(room.pin).toMatch(/^[1-9]\d{5}$/)
    expect(events.find((event) => event.type === 'me')).toMatchObject({ data: { isCorrect: true } })
  })
})
