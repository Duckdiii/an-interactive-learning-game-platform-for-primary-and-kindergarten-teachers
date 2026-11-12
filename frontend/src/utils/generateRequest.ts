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
  visualClozeMode?: 'TEXT' | 'IMAGE'
  oddOneOutMode?: 'TEXT' | 'IMAGE'
  sceneImageUrl?: string
  optionImages?: { imageUrl: string; visualPrompt: string }[]
}

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
