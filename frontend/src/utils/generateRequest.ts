// Dựng nội dung yêu cầu tạo game theo GenerateGameRequest trong docs/openapi/openapi.yaml (POST /games/generate).
// Chưa gọi API vì endpoint còn `planned`; hàm này gom luật một chỗ để khi nối API chỉ việc dùng lại:
//   - cần ít nhất một trong: idea (10 đến 2000 ký tự), tệp giáo án, randomTopic;
//   - mỗi yêu cầu sinh MỘT game; giáo viên chọn nhiều loại thì gửi nhiều yêu cầu, mỗi yêu cầu một gameType;
//   - voice mặc định Bắc/Nữ.
// LỆCH CONTRACT CÓ CHỦ ĐÍCH (chờ nhóm quyết định): openapi.yaml hiện BẮT BUỘC subject và gradeLevel, còn giao diện đã
// để hai trường này tùy chọn (AI tự đoán từ mô tả). Khi nhóm đồng ý, cần sửa openapi.yaml và backend cho khớp; trước đó
// chưa được gọi API thật bằng yêu cầu thiếu hai trường này.

export const IDEA_MIN_LENGTH = 10
export const IDEA_MAX_LENGTH = 2000
// Số loại game tối đa tạo trong một lần (mỗi loại là một lần gọi sinh game riêng, giới hạn để không tốn quá nhiều).
export const MAX_GAMES_PER_REQUEST = 3

export interface GenerateForm {
  // Rỗng nghĩa là chưa chọn và AI chưa đoán được.
  subject: string
  gradeLevel: string
  idea: string
  voiceRegion: string
  voiceGender: string
  hasFile: boolean
  theme?: string
  visualClozeMode?: 'TEXT' | 'IMAGE'
  oddOneOutMode?: 'TEXT' | 'IMAGE'
  sceneImageUrl?: string
  optionImages?: { imageUrl: string; visualPrompt: string }[]
  /** Game ôn tập: các câu của game cũ cần ôn lại (Backend tự đưa số liệu lớp làm sai vào lời nhắc AI). */
  reviewFrom?: ReviewFrom
  classroomId?: string
}

export interface ReviewFrom {
  gameId: string
  questionIds: string[]
}

const REVIEW_MAX_QUESTIONS = 10
const REVIEW_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

/** Dựng `reviewFrom` từ địa chỉ trang tạo game (?reviewGame=&reviewQ=a,b); giá trị lạ thì bỏ qua cả khối. */
export function parseReviewFrom(gameId: string | null, questionIds: string | null): ReviewFrom | undefined {
  if (!gameId || !REVIEW_ID_PATTERN.test(gameId) || !questionIds) return undefined
  const ids = questionIds.split(',')
  if (ids.length > REVIEW_MAX_QUESTIONS || ids.some((id) => !REVIEW_ID_PATTERN.test(id))) return undefined

  return { gameId, questionIds: ids }
}

/** Liên kết sang trang tạo game ôn tập, mang theo game và các câu cần ôn (chỉ mã, không có dữ liệu học sinh). */
export const reviewSeedParams = (gameId: string, questionIds: ReadonlyArray<string>) => ({
  reviewGame: gameId,
  reviewQ: questionIds.slice(0, REVIEW_MAX_QUESTIONS).join(','),
})

export interface GenerateGameRequest {
  subject?: string
  gradeLevel?: string
  idea?: string
  randomTopic?: boolean
  gameType: string
  /** IMAGE enables the relevant image input or Noto catalog for supported games. */
  mode?: 'TEXT' | 'IMAGE'
  /** Existing caller-supplied scene asset; required when gameType=VISUAL_CLOZE and mode=IMAGE. */
  sceneImageUrl?: string
  /** Caller-supplied option assets; required when gameType=VISUAL_CLOZE and mode=IMAGE. */
  optionImages?: { imageUrl: string; visualPrompt: string }[]
  voice: { region: string; gender: string }
  theme?: string
  reviewFrom?: ReviewFrom
  classroomId?: string
}

export type GenerateProblem = 'needIdea'

export const hasValidIdea = (idea: string) => idea.trim().length >= IDEA_MIN_LENGTH

export function checkGenerate(
  form: Pick<GenerateForm, 'idea' | 'hasFile'>,
  mode: 'idea' | 'random',
): GenerateProblem | null {
  if (mode === 'idea' && !hasValidIdea(form.idea) && !form.hasFile) return 'needIdea'

  return null
}

export function buildGenerateRequest(
  form: GenerateForm,
  mode: 'idea' | 'random',
  gameType: string,
): GenerateGameRequest {
  const request: GenerateGameRequest = {
    gameType,
    voice: { region: form.voiceRegion, gender: form.voiceGender },
  }

  if (form.subject) request.subject = form.subject
  if (form.gradeLevel) request.gradeLevel = form.gradeLevel
  if (gameType) request.gameType = gameType
  if (form.theme && form.theme !== 'AUTO') request.theme = form.theme
  if (form.reviewFrom) request.reviewFrom = form.reviewFrom
  if (form.classroomId) request.classroomId = form.classroomId

  if (mode === 'random') request.randomTopic = true
  else if (hasValidIdea(form.idea)) request.idea = form.idea.trim()

  if (gameType === 'VISUAL_CLOZE' && form.visualClozeMode === 'IMAGE') {
    request.mode = 'IMAGE'
    request.sceneImageUrl = form.sceneImageUrl?.trim()
    request.optionImages = form.optionImages?.map((option) => ({
      imageUrl: option.imageUrl.trim(),
      visualPrompt: option.visualPrompt.trim(),
    }))
  }
  if (gameType === 'ODD_ONE_OUT' && form.oddOneOutMode === 'IMAGE') request.mode = 'IMAGE'
  if (gameType === 'AUDIO_VISUAL_MATCH') request.mode = 'IMAGE'

  return request
}

export type VisualClozeImageInputProblem = 'sceneUrl' | 'optionCount' | 'optionFields' | 'duplicateOptionUrl'

const isHttpsUrl = (value: string) => {
  if (value.length > 2048) return false
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

export function validateVisualClozeImageInput(
  sceneImageUrl: string,
  options: ReadonlyArray<{ imageUrl: string; visualPrompt: string }>,
): VisualClozeImageInputProblem | null {
  if (!isHttpsUrl(sceneImageUrl)) return 'sceneUrl'
  if (options.length < 2 || options.length > 8) return 'optionCount'
  if (options.some(({ imageUrl, visualPrompt }) =>
    !isHttpsUrl(imageUrl) || !visualPrompt.trim() || visualPrompt.trim().length > 100,
  )) return 'optionFields'
  if (new Set(options.map(({ imageUrl }) => imageUrl.trim())).size !== options.length) return 'duplicateOptionUrl'
  return null
}
