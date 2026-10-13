// Dựng nội dung yêu cầu tạo game theo GenerateGameRequest trong docs/openapi/openapi.yaml (POST /games/generate).
// Chưa gọi API vì endpoint còn `planned`; hàm này gom luật của contract một chỗ để khi nối API chỉ việc dùng lại:
//   - bắt buộc có subject và gradeLevel;
//   - cần ít nhất một trong: idea (10 đến 2000 ký tự), tệp giáo án, randomTopic;
//   - gameType bỏ trống thì để AI chọn; voice mặc định Bắc/Nữ.

export const IDEA_MIN_LENGTH = 10
export const IDEA_MAX_LENGTH = 2000

export interface GenerateForm {
  subject: string
  gradeLevel: string
  idea: string
  gameType: string
  voiceRegion: string
  voiceGender: string
  hasFile: boolean
}

export interface GenerateGameRequest {
  subject: string
  gradeLevel: string
  idea?: string
  randomTopic?: boolean
  gameType?: string
  voice: { region: string; gender: string }
}

export type GenerateProblem = 'needGradeSubject' | 'needIdea'

export const hasValidIdea = (idea: string) => idea.trim().length >= IDEA_MIN_LENGTH

export function checkGenerate(
  form: GenerateForm,
  mode: 'idea' | 'random',
): GenerateProblem | null {
  if (!form.subject || !form.gradeLevel) return 'needGradeSubject'
  if (mode === 'idea' && !hasValidIdea(form.idea) && !form.hasFile) return 'needIdea'

  return null
}

export function buildGenerateRequest(
  form: GenerateForm,
  mode: 'idea' | 'random',
): GenerateGameRequest {
  const request: GenerateGameRequest = {
    subject: form.subject,
    gradeLevel: form.gradeLevel,
    voice: { region: form.voiceRegion, gender: form.voiceGender },
  }

  if (form.gameType) request.gameType = form.gameType
  if (mode === 'random') request.randomTopic = true
  else if (hasValidIdea(form.idea)) request.idea = form.idea.trim()

  return request
}
