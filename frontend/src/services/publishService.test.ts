import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postPublishGame } from '../api/gamesApi'
import type { GameEnvelopeBody } from '../types/game-response.types'
import { getGame } from './gameService'
import { listGames } from './gamesService'
import { getMockGame, resetMockGames, setMockGameLocked } from './mock/mockGames'
import { getMockPublishCalls, resetMockPublish, setMockPublishFailure } from './mock/mockPublish'
import { setMockScenario } from './mock/mockRuntime'
import { publishGame } from './publishService'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn(), fetchGame: vi.fn(), saveGame: vi.fn(), postPublishGame: vi.fn() }))

const mockedPost = vi.mocked(postPublishGame)
const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }

// Nội dung gửi đi như giáo viên đang soạn (bỏ các trường do máy chủ quản).
const bodyOf = async (gameId: string) => {
  const { gameId: _g, status: _s, updatedAt: _u, ...content } = await getGame(gameId)

  return content as GameEnvelopeBody
}

beforeEach(() => {
  resetMockGames()
  resetMockPublish()
  vi.stubEnv('VITE_USE_MOCK', 'editor,games')
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  vi.clearAllMocks()
})

describe('publishGame khi nhóm "editor" KHÔNG mô phỏng', () => {
  it('gọi API thật với đúng id, nội dung và signal, không đụng kho mô phỏng', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'games')
    const result = { gameId: 'real-1', status: 'PUBLISHED', shareCode: 'ABC123', shareUrl: 'https://x.test/play/ABC123' } as const
    mockedPost.mockResolvedValue(result)
    const body = { gameType: 'QUIZ' } as GameEnvelopeBody
    const controller = new AbortController()

    await expect(publishGame('real-1', body, { signal: controller.signal })).resolves.toBe(result)

    expect(mockedPost).toHaveBeenCalledWith('real-1', body, controller.signal)
    expect(getMockPublishCalls()).toBe(0)
  })
})

describe('publishGame khi nhóm "editor" đang mô phỏng', () => {
  it('xuất bản nháp: PUBLISHED, mã 6 ký tự chữ và số, shareUrl http(s) có mã, danh sách và game đều đổi theo', async () => {
    const result = await publishGame('mock-game-2', await bodyOf('mock-game-2'))

    expect(result).toMatchObject({ gameId: 'mock-game-2', status: 'PUBLISHED' })
    expect(result.shareCode).toMatch(/^[A-Z0-9]{6}$/)
    expect(result.shareUrl).toMatch(/^https?:\/\//)
    expect(result.shareUrl).toContain(`/play/${result.shareCode}`)
    expect(mockedPost).not.toHaveBeenCalled()
    expect(getMockGame('mock-game-2').status).toBe('PUBLISHED')

    const listed = (await listGames(NO_FILTERS)).find((game) => game.gameId === 'mock-game-2')

    expect(listed).toMatchObject({ status: 'PUBLISHED', shareCode: result.shareCode, shareUrl: result.shareUrl })
  })

  it('lưu nội dung mới nhất cùng lúc xuất bản', async () => {
    const body = await bodyOf('mock-game-2')
    const edited = { ...body, metadata: { ...body.metadata, title: 'Tên mới trước khi xuất bản' } } as GameEnvelopeBody

    await publishGame('mock-game-2', edited)

    expect(getMockGame('mock-game-2').metadata.title).toBe('Tên mới trước khi xuất bản')
  })

  it('xuất bản lại: thành công và GIỮ NGUYÊN mã chia sẻ', async () => {
    const body = await bodyOf('mock-game-1')
    const first = await publishGame('mock-game-1', body)
    const again = await publishGame('mock-game-1', body)

    expect(first.shareCode).toBe('A3F9K2')
    expect(again.shareCode).toBe('A3F9K2')
    expect(again.status).toBe('PUBLISHED')
  })

  it('mã cấp cho các game khác nhau không trùng nhau', async () => {
    const a = await publishGame('mock-game-2', await bodyOf('mock-game-2'))
    const b = await publishGame('mock-game-3', await bodyOf('mock-game-3'))

    expect(a.shareCode).not.toBe(b.shareCode)
  })

  it('2c: dữ liệu chưa hợp lệ để xuất bản bị 400 và KHÔNG đổi gì', async () => {
    const body = await bodyOf('mock-game-2')
    const before = getMockGame('mock-game-2')

    await expect(publishGame('mock-game-2', { ...body, questions: [] } as GameEnvelopeBody)).rejects.toMatchObject({ response: { status: 400 } })

    expect(getMockGame('mock-game-2')).toEqual(before)
    expect(getMockGame('mock-game-2').status).toBe('DRAFT')
  })

  it('409 khi game có phiên chưa kết thúc: không đổi gì', async () => {
    const body = await bodyOf('mock-game-2')

    setMockGameLocked('mock-game-2', true)

    await expect(publishGame('mock-game-2', body)).rejects.toMatchObject({ response: { status: 409 } })
    expect(getMockGame('mock-game-2').status).toBe('DRAFT')
  })

  it('404 khi không có game; không đổi loại game (400)', async () => {
    const body = await bodyOf('mock-game-2')

    await expect(publishGame('nope', body)).rejects.toMatchObject({ response: { status: 404 } })
    await expect(publishGame('mock-game-1', body)).rejects.toMatchObject({ response: { status: 400 } })
  })

  it('2a: lỗi lưu (500) không đổi gì', async () => {
    const body = await bodyOf('mock-game-2')
    const before = getMockGame('mock-game-2')

    setMockPublishFailure('save')

    await expect(publishGame('mock-game-2', body)).rejects.toMatchObject({ response: { status: 500, data: { error: { code: 'INTERNAL_ERROR' } } } })
    expect(getMockGame('mock-game-2')).toEqual(before)
  })

  it('2b: đã LƯU nội dung nhưng trạng thái vẫn nháp và chưa có mã, mã lỗi riêng', async () => {
    const body = await bodyOf('mock-game-2')
    const edited = { ...body, metadata: { ...body.metadata, title: 'Đã lưu nhưng chưa có mã' } } as GameEnvelopeBody

    setMockPublishFailure('share')

    await expect(publishGame('mock-game-2', edited)).rejects.toMatchObject({ response: { status: 500, data: { error: { code: 'SHARE_CODE_UNAVAILABLE' } } } })

    const after = getMockGame('mock-game-2')

    expect(after.metadata.title).toBe('Đã lưu nhưng chưa có mã')
    expect(after.status).toBe('DRAFT')
    expect((await listGames(NO_FILTERS)).find((game) => game.gameId === 'mock-game-2')?.shareCode).toBeNull()
  })

  it('kịch bản error và timeout làm lỗi như mất mạng/quá hạn và không đổi gì', async () => {
    const body = await bodyOf('mock-game-2')

    setMockScenario('error')
    await expect(publishGame('mock-game-2', body)).rejects.toMatchObject({ code: 'ERR_NETWORK' })
    setMockScenario('timeout')
    await expect(publishGame('mock-game-2', body)).rejects.toMatchObject({ code: 'ECONNABORTED' })
    expect(getMockGame('mock-game-2').status).toBe('DRAFT')
  })

  it('hủy giữa chừng thì không xuất bản', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '50')
    const body = await bodyOf('mock-game-2')
    const controller = new AbortController()
    const pending = publishGame('mock-game-2', body, { signal: controller.signal })

    controller.abort()

    await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(getMockGame('mock-game-2').status).toBe('DRAFT')
  })
})
