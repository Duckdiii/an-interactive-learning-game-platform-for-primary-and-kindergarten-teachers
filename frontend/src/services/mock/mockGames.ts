import type { GameFilters, GameSummary } from '../../types/game-summary.types'

// Danh sách game mẫu (đủ 10 loại game) cho nhóm mô phỏng `games`. Tên có nghĩa như dữ liệu thật của giáo viên.
// Thời điểm cập nhật tính lùi từ lúc nạp mô-đun để câu "cập nhật 2 giờ trước" luôn hợp lý khi xem thử.

const HOUR = 3_600_000

interface Seed {
  title: string
  gameType: string
  subject: string
  gradeLevel: string
  status: 'DRAFT' | 'PUBLISHED'
  shareCode?: string
  hoursAgo: number
}

const SEEDS: ReadonlyArray<Seed> = [
  { title: 'Đếm số đến 10', gameType: 'QUIZ', subject: 'MATH', gradeLevel: 'KINDERGARTEN', status: 'PUBLISHED', shareCode: 'A3F9K2', hoursAgo: 1 },
  { title: 'Nhận biết chữ cái A Ă Â', gameType: 'MATCHING', subject: 'VIETNAMESE', gradeLevel: 'KINDERGARTEN', status: 'DRAFT', hoursAgo: 5 },
  { title: 'Phân loại con vật theo nơi sống', gameType: 'DRAG_DROP', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', status: 'DRAFT', hoursAgo: 20 },
  { title: 'Nghe và chọn hình con vật', gameType: 'AUDIO_VISUAL_MATCH', subject: 'ENGLISH', gradeLevel: 'KINDERGARTEN', status: 'PUBLISHED', shareCode: 'K7P2QM', hoursAgo: 30 },
  { title: 'Sắp xếp các số từ bé đến lớn', gameType: 'ORDERING', subject: 'MATH', gradeLevel: 'GRADE_1', status: 'DRAFT', hoursAgo: 52 },
  { title: 'Lật thẻ tìm cặp con vật', gameType: 'MEMORY_CARD', subject: 'ENGLISH', gradeLevel: 'KINDERGARTEN', status: 'DRAFT', hoursAgo: 75 },
  { title: 'Tìm đúng vật trong tranh nông trại', gameType: 'SPOT_THE_TARGET', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', status: 'DRAFT', hoursAgo: 100 },
  { title: 'Ghép chữ thành từ về gia đình', gameType: 'WORD_SCRAMBLE', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', status: 'PUBLISHED', shareCode: 'M2N8QP', hoursAgo: 130 },
  { title: 'Tìm vật khác loại', gameType: 'ODD_ONE_OUT', subject: 'MATH', gradeLevel: 'KINDERGARTEN', status: 'DRAFT', hoursAgo: 170 },
  { title: 'Điền từ còn thiếu trong câu', gameType: 'VISUAL_CLOZE', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', status: 'DRAFT', hoursAgo: 240 },
]

function buildSummaries(now: number): GameSummary[] {
  return SEEDS.map((seed, index) => ({
    gameId: `mock-game-${index + 1}`,
    title: seed.title,
    gameType: seed.gameType,
    subject: seed.subject,
    gradeLevel: seed.gradeLevel,
    status: seed.status,
    shareCode: seed.shareCode ?? null,
    shareUrl: seed.shareCode ? `https://aigame.example/play/${seed.shareCode}` : null,
    thumbnailUrl: null,
    updatedAt: new Date(now - seed.hoursAgo * HOUR).toISOString(),
  }))
}

let summaries = buildSummaries(Date.now())

/** Chỉ cho test: đưa dữ liệu mẫu về trạng thái ban đầu, tính lại thời điểm theo `now`. */
export function resetMockGames(now: number = Date.now()) {
  summaries = buildSummaries(now)
}

/** Lọc theo môn, khối lớp, trạng thái và sắp theo `updatedAt` giảm dần, giống `GET /games`. */
export function listMockGames(filters: GameFilters): GameSummary[] {
  return summaries
    .filter(
      (game) =>
        (!filters.subject || game.subject === filters.subject) &&
        (!filters.gradeLevel || game.gradeLevel === filters.gradeLevel) &&
        (!filters.status || game.status === filters.status),
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}
