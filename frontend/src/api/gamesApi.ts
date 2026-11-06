import { AI_ATTEMPT_TIMEOUT_MS, AI_BACKEND_ATTEMPTS, GENERATE_GAME_TIMEOUT_MS, PUBLISH_REQUEST_TIMEOUT_MS, REGENERATE_QUESTION_TIMEOUT_MS } from '../constants/aiLimits'
import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { PublishResult } from '../types/publish.types'
import type { RegeneratedQuestion } from '../types/regenerate.types'
import type { GenerateGameRequest } from '../utils/generateRequest'
import type { GameEnvelopeBody, GameResponse } from '../types/game-response.types'
import type { GameFilters, GameSummary } from '../types/game-summary.types'
import { parsePedagogicalConstraints } from '../services/pipeline/constraintParser'
import { generateMathQuestions } from '../services/pipeline/dynamicMathGenerator'

// Chỉ áp cho lệnh đọc danh sách: nếu máy chủ treo thì báo lỗi sau 10 giây thay vì quay vô hạn.
// Không đặt timeout chung trên axiosInstance vì các lệnh khác (ví dụ sinh game bằng AI) có thể chạy lâu hơn.
export const GAMES_REQUEST_TIMEOUT_MS = 10_000
// Mở và lưu một game: nội dung lớn hơn danh sách nên cho dài hơn một chút.
export const GAME_REQUEST_TIMEOUT_MS = 15_000

// Hằng số thời gian chờ của lời gọi AI nằm ở `constants/aiLimits.ts` (dùng chung với AI mô phỏng); xuất lại ở đây cho nơi dùng API.
export { AI_ATTEMPT_TIMEOUT_MS, AI_BACKEND_ATTEMPTS, GENERATE_GAME_TIMEOUT_MS, PUBLISH_REQUEST_TIMEOUT_MS, REGENERATE_QUESTION_TIMEOUT_MS }

export async function getGames(filters: GameFilters) {
  const response = await axiosInstance.get<ApiSuccessResponse<GameSummary[]>>(
    '/games',
    {
      timeout: GAMES_REQUEST_TIMEOUT_MS,
      params: {
        subject: filters.subject || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      },
    },
  )

  return response.data.data
}

/** GET /games/{gameId}: mở một game đầy đủ (kèm câu hỏi) cho trình soạn thảo. */
export async function fetchGame(gameId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<GameResponse>>(
    `/games/${encodeURIComponent(gameId)}`,
    { timeout: GAME_REQUEST_TIMEOUT_MS },
  )

  return response.data.data
}

/** PUT /games/{gameId}: lưu bản nháp hoặc chỉnh sửa; thân là phần envelope DSL. */
export async function saveGame(gameId: string, body: GameEnvelopeBody) {
  const response = await axiosInstance.put<ApiSuccessResponse<GameResponse>>(
    `/games/${encodeURIComponent(gameId)}`,
    body,
    { timeout: GAME_REQUEST_TIMEOUT_MS },
  )

  return response.data.data
}

export interface RegenerateQuestionOptions {
  // Gợi ý điều chỉnh của giáo viên (tối đa 500 ký tự); trống thì không gửi thân yêu cầu.
  feedback?: string
  signal?: AbortSignal
}

/**
 * POST /games/{gameId}/questions/{questionId}/regenerate: AI làm lại MỘT câu theo bản ĐÃ LƯU trên máy chủ. Trả câu mới (giữ nguyên `id`),
 * KHÔNG tự lưu: nơi gọi ghép vào bản đang soạn. Câu chưa lưu thì máy chủ không biết mã câu và trả 404.
 */
export async function postRegenerateQuestion(gameId: string, questionId: string, options: RegenerateQuestionOptions = {}) {
  const feedback = options.feedback?.trim()
  const response = await axiosInstance.post<ApiSuccessResponse<RegeneratedQuestion>>(
    `/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/regenerate`,
    feedback ? { feedback } : undefined,
    { timeout: REGENERATE_QUESTION_TIMEOUT_MS, signal: options.signal },
  )

  return response.data.data
}

/**
 * POST /games/generate (bản JSON đồng bộ): AI sinh MỘT game nháp theo yêu cầu. Muốn nhiều loại thì gọi nhiều lần, mỗi lần một `gameType`.
 * Không tự thử lại (Backend đã thử lại dịch vụ AI; giới hạn 10 yêu cầu mỗi phút nên thử lại tự động còn dễ chạm 429).
 */
export async function postGenerateGame(request: GenerateGameRequest, signal?: AbortSignal) {
  const response = await axiosInstance.post<ApiSuccessResponse<GameResponse>>('/games/generate', request, {
    timeout: GENERATE_GAME_TIMEOUT_MS,
    signal,
  })

  return response.data.data
}

/**
 * POST /games/{gameId}/publish: LƯU nội dung mới nhất rồi xuất bản trong một thao tác (UC-07). Gọi lại khi đã xuất bản vẫn 200 và giữ nguyên mã chia sẻ.
 * Không tự thử lại: lỗi thì giáo viên bấm lại (an toàn vì thao tác lặp lại được).
 */
export async function postPublishGame(gameId: string, body: GameEnvelopeBody, signal?: AbortSignal) {
  const response = await axiosInstance.post<ApiSuccessResponse<PublishResult>>(
    `/games/${encodeURIComponent(gameId)}/publish`,
    body,
    { timeout: PUBLISH_REQUEST_TIMEOUT_MS, signal },
  )

  return response.data.data
}


// -----------------------------------------------------------------------------
// DUAL-TRACK PIPELINE & PRODUCTION PLAY INTEGRATION
// -----------------------------------------------------------------------------

export interface GenerateGameApiResponse {
  dsl: unknown
  report: {
    valid?: boolean
    errors?: Array<{ field: string; message: string }>
  }
  latencyMs: number
}

export async function generateGameApi(
  prompt: string,
  gradeLevel = 2,
  subject = 'MATH',
  gameType = 'QUIZ'
): Promise<GenerateGameApiResponse | null> {
  try {
    const res = await axiosInstance.post<ApiSuccessResponse<GenerateGameApiResponse>>(
      '/games/generate',
      {
        prompt,
        topic: prompt,
        gradeLevel: 'GRADE_' + gradeLevel,
        subject,
        gameType,
      },
      { timeout: 15_000 }
    )
    if (res.data?.data) {
      return res.data.data
    }
  } catch {
    // Graceful fallback
  }
  return null
}

export interface BloomRecommendationDto {
  title: string
  gameType: string
  bloomLevel: string
  description: string
  estimatedDuration: string
  track: 'PRESET' | 'CPF'
}

export interface PublishGameDtoRequest {
  title: string
  gameType: string
  grade: string
  subject: string
  dsl: unknown
}

export interface PublishGameDtoResponse {
  id: string
  shareCode: string
  status: string
}

export interface PlayGameDtoResponse {
  id: string
  title: string
  gameType: string
  shareCode: string
  dsl: unknown
}

function createInitialMockQuizDsl() {
  const constraints = parsePedagogicalConstraints('Phép cộng có nhớ phạm vi 100 nông trại')
  const [q] = generateMathQuestions(constraints, 1)
  const optionsList = [
    { text: `${q.correctAnswer} ${q.unit}`.trim(), isCorrect: true },
    ...q.distractors.map((d) => ({ text: `${d} ${q.unit}`.trim(), isCorrect: false })),
  ]
  const shuffled = optionsList.sort(() => Math.random() - 0.5)
  const correctIndex = shuffled.findIndex((o) => o.isCorrect)
  return {
    gameType: 'QUIZ',
    title: 'Nông Trại Toán Học Lớp 2',
    gradeLevel: 2,
    questionText: q.questionText,
    numA: q.numA,
    numB: q.numB,
    options: shuffled.map((o, idx) => ({ id: String(idx + 1), text: o.text, isCorrect: o.isCorrect })),
    correctIndex,
    explanation: q.explanation,
    imageUrl: q.spriteUrl,
  }
}

// Bộ nhớ client dự phòng khi Backend chưa bật hoặc mất kết nối
const clientPublishedStore = new Map<string, PlayGameDtoResponse>([
  [
    'MOCK02',
    {
      id: 'mock-02',
      title: 'Nông Trại Toán Học Lớp 2',
      gameType: 'QUIZ',
      shareCode: 'MOCK02',
      dsl: createInitialMockQuizDsl(),
    },
  ],
  [
    'MATH02',
    {
      id: 'math-02',
      title: 'Bắn Cung Toán Học: Thợ Săn Số Chẵn',
      gameType: 'PHYSICS_SLING_ARCHERY',
      shareCode: 'MATH02',
      dsl: {
        schemaVersion: 'cpf.v1.0.0',
        title: 'Bắn Cung Toán Học: Thợ Săn Số Chẵn',
        pedagogicalSubject: 'Math',
        gradeLevel: 2,
        track: 'CPF',
      },
    },
  ],
])

export async function recommendGamesApi(
  prompt: string,
  gradeLevel = 2,
  subject = 'MATH'
): Promise<BloomRecommendationDto[]> {
  try {
    const res = await axiosInstance.post<ApiSuccessResponse<{ recommendations: BloomRecommendationDto[] }>>(
      '/games/recommend',
      { prompt, gradeLevel: `GRADE_${gradeLevel}`, subject },
      { timeout: 1000 }
    )
    if (res.data?.data?.recommendations) {
      return res.data.data.recommendations
    }
  } catch {
    // Graceful fallback khi không nối được Backend
  }

  return [
    {
      title: 'Nông Trại Toán Học - Trắc Nghiệm Candy Gloss',
      gameType: 'QUIZ',
      bloomLevel: 'Nhận biết',
      description: 'Học sinh nhận diện và tính nhanh số lượng nông sản, gia súc gia cầm.',
      estimatedDuration: '3 - 5 phút',
      track: 'PRESET',
    },
    {
      title: 'Nông Trại Vui Vẻ - Kéo Thả Phân Loại',
      gameType: 'DRAG_DROP',
      bloomLevel: 'Thông hiểu',
      description: 'Kéo thả phân loại các con số hoặc phép tính vào đúng chuồng trại.',
      estimatedDuration: '5 - 7 phút',
      track: 'PRESET',
    },
    {
      title: 'Thợ Săn Số Chẵn - Kéo Ná Bắn Cung Vật Lý',
      gameType: 'PHYSICS_SLING_ARCHERY',
      bloomLevel: 'Vận dụng',
      description: 'Cơ chế vật lý tương tác mở rộng (CPF VRE): Kéo căng dây ná để ngắm bắn bóng bay số chẵn.',
      estimatedDuration: '5 - 10 phút',
      track: 'CPF',
    },
  ]
}

export async function publishGameApi(payload: PublishGameDtoRequest): Promise<PublishGameDtoResponse> {
  const generatedCode = 'MATH' + Math.floor(10 + Math.random() * 90)
  const defaultRes: PublishGameDtoResponse = {
    id: 'game-' + Date.now().toString(36),
    shareCode: generatedCode,
    status: 'PUBLISHED',
  }

  try {
    const res = await axiosInstance.post<ApiSuccessResponse<PublishGameDtoResponse>>(
      '/games',
      payload,
      { timeout: 1000 }
    )
    if (res.data?.data) {
      clientPublishedStore.set(res.data.data.shareCode, {
        id: res.data.data.id,
        title: payload.title,
        gameType: payload.gameType,
        shareCode: res.data.data.shareCode,
        dsl: payload.dsl,
      })
      return res.data.data
    }
  } catch {
    // Lưu vào store client nếu backend offline
  }

  clientPublishedStore.set(defaultRes.shareCode, {
    id: defaultRes.id,
    title: payload.title,
    gameType: payload.gameType,
    shareCode: defaultRes.shareCode,
    dsl: payload.dsl,
  })

  return defaultRes
}

export async function getPlayGameApi(shareCode: string): Promise<PlayGameDtoResponse> {
  const upperCode = shareCode.toUpperCase()
  try {
    const res = await axiosInstance.get<ApiSuccessResponse<PlayGameDtoResponse>>(
      `/games/play/${encodeURIComponent(upperCode)}`,
      { timeout: 1000 }
    )
    if (res.data?.data) {
      return res.data.data
    }
  } catch {
    // Fallback sang local store
  }

  const existing = clientPublishedStore.get(upperCode)
  if (existing) return existing

  throw new Error(`Trò chơi với mã ${upperCode} không tồn tại.`)
}
