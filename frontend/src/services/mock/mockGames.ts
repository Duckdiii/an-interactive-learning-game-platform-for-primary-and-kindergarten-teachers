import { generateDynamicCpfSceneGraph } from '../pipeline/dynamicCpfGenerator'
import type { CpfSceneGraph } from '../pipeline/cpfTypes'
import { toMatchText } from '../../utils/phraseMatch'
import { resolveShareUrl } from '../../config/studentApp'
import type { GameDsl } from '../../types/game-dsl.types'
import type { GameResponse } from '../../types/game-response.types'
import type { PublishResult } from '../../types/publish.types'
import type { GameFilters, GameSummary } from '../../types/game-summary.types'
import { validateGame } from '../../utils/gameValidation'
import { buildMockGameContents, mathMatching, mathMemory } from './gameFixtures'
import { enrichGameWithAssets, findCatalogItemsInText } from '../../utils/assetResolver'
import { extractSemantics } from '../pipeline/semanticExtractor'
import { parsePedagogicalConstraints } from '../pipeline/constraintParser'
import { generateMathQuestions } from '../pipeline/dynamicMathGenerator'
import { generateLanguagePairs } from '../pipeline/dynamicLanguageGenerator'
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
    content: enrichGameWithAssets(contents[index]),
    status: seed.status,
    shareCode: seed.shareCode ?? null,
    updatedAt: new Date(now - seed.hoursAgo * HOUR).toISOString(),
    locked: false,
  }))
}

let records = buildRecords(Date.now())
// Số thứ tự cho mã game mô phỏng mới (không dùng lại kể cả sau khi xóa) và các game do AI MÔ PHỎNG tạo ra.
let nextGameNumber = SEEDS.length + 1
const generated = new Set<string>()

/** Chỉ cho test: đưa dữ liệu mẫu về trạng thái ban đầu, tính lại thời điểm theo `now`. */
export function resetMockGames(now: number = Date.now()) {
  records = buildRecords(now)
  nextGameNumber = SEEDS.length + 1
  generated.clear()
}

const toSummary = (record: MockGameRecord): GameSummary => ({
  gameId: record.gameId,
  title: record.content.metadata.title,
  gameType: record.content.gameType,
  subject: record.content.metadata.subject,
  gradeLevel: record.content.metadata.gradeLevel,
  status: record.status,
  shareCode: record.shareCode,
  shareUrl: record.shareCode ? resolveShareUrl(record.shareCode) : null,
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

/** Game có phiên chơi chưa kết thúc không (để dịch vụ mô phỏng khác trả 409 giống `saveMockGame`). */
export function isMockGameLocked(gameId: string) {
  return findRecord(gameId).locked
}

/** Chỉ cho test và kiểm tay: giả lập game đang có (hoặc hết) phiên chơi chưa kết thúc. */
export function setMockGameLocked(gameId: string, locked: boolean) {
  findRecord(gameId).locked = locked
}

// Cắt chữ ở ranh giới từ để làm tên/chủ đề từ ý tưởng của giáo viên mà không vượt giới hạn.
function shorten(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()

  if ([...clean].length <= max) return clean

  const cut = [...clean].slice(0, max).join('')

  return cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max / 2))).trim()
}

export interface MockGeneratedInfo {
  gameType: string
  subject?: string
  gradeLevel?: string
  idea?: string
  track?: string
}

/**
 * Giống kết quả `POST /games/generate`: thêm một game NHÁP vào kho (đứng đầu danh sách vì mới nhất) và trả bản sao. NỘI DUNG CÂU HỎI LẤY TỪ BỘ MẪU của loại game đó nên
 * KHÔNG khớp mô tả của giáo viên; chỉ tên, chủ đề, môn và khối lớp theo yêu cầu. Giao diện luôn nhắc điều này (`isMockGenerated`).
 */
export function createMockGame(info: MockGeneratedInfo, now: number = Date.now()): GameResponse {
  let template = buildMockGameContents().find((content) => content.gameType === info.gameType) ?? buildMockGameContents()[0]
  const idea = info.idea?.trim() ?? ''
  const isMath = info.subject === 'MATH' || idea.toLowerCase().includes('đếm') || idea.toLowerCase().includes('toán') || idea.toLowerCase().includes('số')

  if (info.gameType === 'MATCHING' && isMath) {
    template = mathMatching
  } else if (info.gameType === 'MEMORY_CARD' && isMath) {
    template = mathMemory
  }
  const content = structuredClone(template)
  const semantics = extractSemantics(`${idea} ${content.metadata.topic}`)
  const deduced = { theme: semantics.themeKey }

  content.metadata = {
    ...content.metadata,
    title: idea ? shorten(idea, 60) : `Trò chơi ngẫu nhiên: ${content.metadata.title}`.slice(0, 100),
    topic: idea ? shorten(idea, 200) : content.metadata.topic,
    ...(info.subject ? { subject: info.subject } : {}),
    ...(info.gradeLevel ? { gradeLevel: info.gradeLevel } : {}),
  } as GameDsl['metadata']

  const constraints = parsePedagogicalConstraints(`${idea} ${info.subject ?? ''} ${info.gradeLevel ?? ''}`)

  if (info.gameType === 'QUIZ' && idea) {
    if (isMath || constraints.subject === 'MATH') {
      const mathQuestions = generateMathQuestions(constraints, 3)
      content.questions = mathQuestions.map((mq, idx) => {
        const optionsList = [mq.correctAnswer, ...mq.distractors]
        const shuffled = optionsList.map((val) => String(val)).sort(() => Math.random() - 0.5)
        const unique = Array.from(new Set(shuffled))
        while (unique.length < 2) unique.push(String(Number(unique[0]) + 1))
        const letters = ['a', 'b', 'c', 'd']
        const options = unique.slice(0, 4).map((text, i) => ({ id: letters[i], text }))
        const correctOption = options.find((opt) => opt.text === String(mq.correctAnswer)) ?? options[0]

        return {
          id: `q${idx + 1}`,
          timeLimitSeconds: 30,
          points: 10,
          questionText: mq.questionText,
          options,
          correctOptionId: correctOption.id,
          audioText: mq.questionText,
          imageUrl: mq.spriteUrl,
        }
      })
    }
  }

  const matchedItems = findCatalogItemsInText(idea)
  if (!isMath && content.questions[0]) {
    if (info.gameType === 'MATCHING') {
      if (constraints.languageConcept && constraints.languageConcept.type !== 'LETTER') {
        const langPairs = generateLanguagePairs(constraints, 4)
        const pairs = langPairs.map((p) => ({
          pairId: p.pairId,
          left: { text: p.left.text, imageUrl: p.right.imageUrl },
          right: { text: p.right.text, imageUrl: p.right.imageUrl },
        }))
        ;(content.questions[0] as unknown as { pairs: unknown[]; audioText?: string }).pairs = pairs
        ;(content.questions[0] as unknown as { audioText?: string }).audioText = 'Bé hãy nối các thẻ tương ứng nhé'
      } else if (matchedItems.length >= 3) {
        const pairs = matchedItems.slice(0, 6).map((item, idx) => ({
          pairId: `p${idx + 1}`,
          left: { text: item.name, imageUrl: item.url },
          right: { text: item.name, imageUrl: item.url },
        }))
        ;(content.questions[0] as unknown as { pairs: unknown[]; audioText?: string }).pairs = pairs
        ;(content.questions[0] as unknown as { audioText?: string }).audioText = `Bé hãy nối các ${deduced.theme === 'ocean' ? 'sinh vật biển' : 'hình ảnh'} nhé`
      } else if (semantics.visualEntities.filter((e) => e.mappedAssetUrl).length >= 3) {
        const validEntities = semantics.visualEntities.filter((e) => e.mappedAssetUrl)
        const pairs = validEntities.slice(0, 6).map((item, idx) => ({
          pairId: `p${idx + 1}`,
          left: { text: item.name, imageUrl: item.mappedAssetUrl },
          right: { text: item.name, imageUrl: item.mappedAssetUrl },
        }))
        ;(content.questions[0] as unknown as { pairs: unknown[]; audioText?: string }).pairs = pairs
        ;(content.questions[0] as unknown as { audioText?: string }).audioText = `Bé hãy nối các ${deduced.theme === 'ocean' ? 'sinh vật biển' : 'hình ảnh'} nhé`
      } else {
        const phonicsPairs = [
          { pairId: 'p1', left: { text: 'a', imageUrl: '/assets/fruits/apple.svg' }, right: { text: 'Quả táo', imageUrl: '/assets/fruits/apple.svg' } },
          { pairId: 'p2', left: { text: 'c', imageUrl: '/assets/animals/fish.svg' }, right: { text: 'Con cá', imageUrl: '/assets/animals/fish.svg' } },
          { pairId: 'p3', left: { text: 'm', imageUrl: '/assets/animals/cat.svg' }, right: { text: 'Con mèo', imageUrl: '/assets/animals/cat.svg' } },
          { pairId: 'p4', left: { text: 'ch', imageUrl: '/assets/animals/dog.svg' }, right: { text: 'Con chó', imageUrl: '/assets/animals/dog.svg' } },
        ]
        ;(content.questions[0] as unknown as { pairs: unknown[]; audioText?: string }).pairs = phonicsPairs
        ;(content.questions[0] as unknown as { audioText?: string }).audioText = 'Bé hãy nối chữ cái với hình ảnh tương ứng nhé'
      }
    } else if (info.gameType === 'MEMORY_CARD') {
      if (matchedItems.length >= 3) {
        const pairs = matchedItems.slice(0, 6).map((item, idx) => ({
          pairId: `p${idx + 1}`,
          content: { text: item.name, imageUrl: item.url },
        }))
        ;(content.questions[0] as unknown as { pairs: unknown[]; audioText?: string }).pairs = pairs
        ;(content.questions[0] as unknown as { audioText?: string }).audioText = `Bé hãy lật tìm các cặp thẻ ${deduced.theme === 'ocean' ? 'sinh vật biển' : ''} nhé`
      } else {
        const defaultPairs = [
          { pairId: 'p1', content: { text: 'Quả táo', imageUrl: '/assets/fruits/apple.svg' } },
          { pairId: 'p2', content: { text: 'Con cá', imageUrl: '/assets/animals/fish.svg' } },
          { pairId: 'p3', content: { text: 'Con mèo', imageUrl: '/assets/animals/cat.svg' } },
          { pairId: 'p4', content: { text: 'Con chó', imageUrl: '/assets/animals/dog.svg' } },
        ]
        ;(content.questions[0] as unknown as { pairs: unknown[]; audioText?: string }).pairs = defaultPairs
        ;(content.questions[0] as unknown as { audioText?: string }).audioText = 'Bé hãy lật tìm các cặp hình giống nhau nhé'
      }
    }
  }

    const isCpfIdea = info.track === 'CPF' || Boolean(idea && (/(hứng|bắt|nhặt|rơi|bắn|kéo ná|cung|bong bóng|vật lý|tương tác động|cpf)/i.test(idea) || /(hung|nhat|roi|ban|keo na|cung|bong bong|vat ly|tuong tac dong|cpf)/i.test(toMatchText(idea))))
  if (isCpfIdea) {
    const gradeNum = info.gradeLevel ? Number(info.gradeLevel.replace('GRADE_', '')) || 2 : 2
    const sceneGraph = generateDynamicCpfSceneGraph(idea || content.metadata.topic, gradeNum, info.subject)
    ;(content.metadata as Record<string, any>).track = 'CPF'
    ;(content.metadata as Record<string, any>).cpfMechanic = sceneGraph.mechanicType

    ;(content as unknown as { sceneGraph: CpfSceneGraph }).sceneGraph = sceneGraph
    content.metadata.title = sceneGraph.title
    content.metadata.topic = sceneGraph.description
  }

  enrichGameWithAssets(content)

  const record: MockGameRecord = {
    gameId: `mock-game-${nextGameNumber}`,
    content,
    status: 'DRAFT',
    shareCode: null,
    updatedAt: new Date(now).toISOString(),
    locked: false,
  }

  nextGameNumber += 1
  records = [record, ...records]
  generated.add(record.gameId)

  return toResponse(record)
}

/** Game này do AI MÔ PHỎNG tạo (nội dung là bản mẫu, không khớp mô tả của giáo viên). */
export const isMockGenerated = (gameId: string) => generated.has(gameId)

const SHARE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function newShareCode() {
  const taken = new Set(records.map((record) => record.shareCode))

  for (;;) {
    const code = Array.from({ length: 6 }, () => SHARE_CODE_ALPHABET[Math.floor(Math.random() * SHARE_CODE_ALPHABET.length)]).join('')

    if (!taken.has(code)) return code
  }
}

/**
 * Giống `POST /games/{id}/publish` khi gửi kèm nội dung (UC-07 luồng chính): kiểm tra dữ liệu theo chế độ XUẤT BẢN (400 nếu chưa hợp lệ, không đổi gì), từ chối 409 nếu game đang có
 * phiên chưa kết thúc, rồi LƯU nội dung, đặt `PUBLISHED` và cấp mã chia sẻ. Gọi lại khi đã xuất bản vẫn thành công và giữ nguyên mã.
 */
export function publishMockGame(gameId: string, body: GameDsl, now: number = Date.now()): PublishResult {
  const record = findRecord(gameId)

  if (record.locked) throw conflictError()
  if (body.gameType !== record.content.gameType) {
    throw mockApiError(400, 'VALIDATION_ERROR', 'Không thể đổi loại trò chơi của một trò chơi đã tạo.')
  }
  if (validateGame(body, 'publish').length > 0) throw mockApiError(400, 'VALIDATION_ERROR', 'Dữ liệu trò chơi chưa hợp lệ để xuất bản.')

  const { gameId: _gameId, status: _status, updatedAt: _updatedAt, ...content } = body as GameDsl & Record<string, unknown>

  record.content = structuredClone(content) as GameDsl
  record.status = 'PUBLISHED'
  record.shareCode = record.shareCode ?? newShareCode()
  record.updatedAt = new Date(now).toISOString()

  return { gameId: record.gameId, status: 'PUBLISHED', shareCode: record.shareCode, shareUrl: resolveShareUrl(record.shareCode) }
}
