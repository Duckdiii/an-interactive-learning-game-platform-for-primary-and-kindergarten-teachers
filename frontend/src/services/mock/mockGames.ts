import type { GameDsl } from '../../types/game-dsl.types'
import type { GameResponse } from '../../types/game-response.types'
import type { GameFilters, GameSummary } from '../../types/game-summary.types'
import { buildMockGameContents } from './gameFixtures'
import { conflictError, mockApiError, notFoundError } from './mockErrors'

// Kho game trong bộ nhớ cho các nhóm mô phỏng `games` và `editor`: 10 game mẫu (đủ 10 loại) có nội dung DSL đầy đủ; danh
// sách tóm tắt được suy ra từ chính nội dung nên hai bên không bao giờ lệch nhau. Mất khi tải lại trang.
// Thời điểm cập nhật tính lùi từ lúc nạp mô-đun để câu "cập nhật 2 giờ trước" luôn hợp lý khi xem thử.

const HOUR = 3_600_000

interface Seed {
  status: 'DRAFT' | 'PUBLISHED'
  shareCode?: string
  hoursAgo: number
}

// Cùng thứ tự với `buildMockGameContents()`.
const SEEDS: ReadonlyArray<Seed> = [
  { status: 'PUBLISHED', shareCode: 'A3F9K2', hoursAgo: 1 },
  { status: 'DRAFT', hoursAgo: 5 },
  { status: 'DRAFT', hoursAgo: 20 },
  { status: 'PUBLISHED', shareCode: 'K7P2QM', hoursAgo: 30 },
  { status: 'DRAFT', hoursAgo: 52 },
  { status: 'DRAFT', hoursAgo: 75 },
  { status: 'DRAFT', hoursAgo: 100 },
  { status: 'PUBLISHED', shareCode: 'M2N8QP', hoursAgo: 130 },
  { status: 'DRAFT', hoursAgo: 170 },
  { status: 'DRAFT', hoursAgo: 240 },
]

interface MockGameRecord {
  gameId: string
  content: GameDsl
  status: string
  shareCode: string | null
  updatedAt: string
  // Có phiên chơi chưa kết thúc: sửa, xóa, làm lại bị 409 như contract.
  locked: boolean
}

function buildRecords(now: number): MockGameRecord[] {
  const contents = buildMockGameContents()

  return SEEDS.map((seed, index) => ({
    gameId: `mock-game-${index + 1}`,
    content: contents[index],
    status: seed.status,
    shareCode: seed.shareCode ?? null,
    updatedAt: new Date(now - seed.hoursAgo * HOUR).toISOString(),
    locked: false,
  }))
}

let records = buildRecords(Date.now())

/** Chỉ cho test: đưa dữ liệu mẫu về trạng thái ban đầu, tính lại thời điểm theo `now`. */
export function resetMockGames(now: number = Date.now()) {
  records = buildRecords(now)
}

const toSummary = (record: MockGameRecord): GameSummary => ({
  gameId: record.gameId,
  title: record.content.metadata.title,
  gameType: record.content.gameType,
  subject: record.content.metadata.subject,
  gradeLevel: record.content.metadata.gradeLevel,
  status: record.status,
  shareCode: record.shareCode,
  shareUrl: record.shareCode ? `https://aigame.example/play/${record.shareCode}` : null,
  thumbnailUrl: record.content.questions[0]?.imageUrl ?? null,
  updatedAt: record.updatedAt,
})

const toResponse = (record: MockGameRecord): GameResponse =>
  structuredClone({ ...record.content, gameId: record.gameId, status: record.status, updatedAt: record.updatedAt })

/** Lọc theo môn, khối lớp, trạng thái và sắp theo `updatedAt` giảm dần, giống `GET /games`. */
export function listMockGames(filters: GameFilters): GameSummary[] {
  return records
    .map(toSummary)
    .filter(
      (game) =>
        (!filters.subject || game.subject === filters.subject) &&
        (!filters.gradeLevel || game.gradeLevel === filters.gradeLevel) &&
        (!filters.status || game.status === filters.status),
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

function findRecord(gameId: string) {
  const record = records.find((item) => item.gameId === gameId)

  if (!record) throw notFoundError()

  return record
}

/** Giống `GET /games/{id}`: trả bản sao, sửa kết quả không làm đổi kho. 404 nếu không có. */
export function getMockGame(gameId: string): GameResponse {
  return toResponse(findRecord(gameId))
}

/**
 * Giống `PUT /games/{id}`: thay nội dung, cập nhật `updatedAt`, giữ nguyên trạng thái (game đã xuất bản vẫn đã xuất bản).
 * `gameType` không đổi được (400); game có phiên chưa kết thúc bị 409; không có game thì 404.
 */
export function saveMockGame(gameId: string, body: GameDsl): GameResponse {
  const record = findRecord(gameId)

  if (record.locked) throw conflictError()
  if (body.gameType !== record.content.gameType) {
    throw mockApiError(400, 'VALIDATION_ERROR', 'Không thể đổi loại trò chơi của một trò chơi đã tạo.')
  }

  // Server tự quản gameId, status, updatedAt: bỏ các trường này nếu thân gửi lên có kèm (ví dụ gửi lại nguyên GameResponse).
  const { gameId: _gameId, status: _status, updatedAt: _updatedAt, ...content } = body as GameDsl & Record<string, unknown>

  record.content = structuredClone(content) as GameDsl
  record.updatedAt = new Date().toISOString()

  return toResponse(record)
}

/** Chỉ cho test và kiểm tay: giả lập game đang có (hoặc hết) phiên chơi chưa kết thúc. */
export function setMockGameLocked(gameId: string, locked: boolean) {
  findRecord(gameId).locked = locked
}
