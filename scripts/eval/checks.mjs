// Phần thuần của bộ đề tự chạy: đọc bảng kịch bản, ghép thẻ thành ý tưởng, chấm game bằng luật máy. Không gọi mạng để test được.

const SUBJECTS = { 'Toán': 'MATH', 'Tiếng Việt': 'VIETNAMESE', 'Tiếng Anh': 'ENGLISH' }
const GRADES = { 'Mầm non': 'KINDERGARTEN', 'Lớp 1': 'GRADE_1', 'Lớp 2': 'GRADE_2', 'Lớp 3': 'GRADE_3', 'Lớp 4': 'GRADE_4', 'Lớp 5': 'GRADE_5' }

/** Các dòng "| STT | Môn · Lớp | Giáo viên nhập | Thử điều gì | ..." của file 100 kịch bản. Dòng môn/lớp lạ bị bỏ qua. */
export function parseScenarios(markdown) {
  const scenarios = []
  for (const line of markdown.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 4 || !/^\d+$/.test(cells[0])) continue
    const [subjectLabel, gradeLabel] = cells[1].split('·').map((part) => part.trim())
    const subject = SUBJECTS[subjectLabel]
    const gradeLevel = GRADES[gradeLabel]
    if (!subject || !gradeLevel) continue
    scenarios.push({ id: Number(cells[0]), subject, gradeLevel, idea: cells[2], name: cells[3] })
  }
  return scenarios
}

/** Cùng cách ghép với frontend/src/utils/understandingIdea.ts (giữ hai nơi khớp nhau khi sửa). */
export function composeIdea(card, originalIdea) {
  const lines = [
    card.learningGoal && `Mục tiêu: ${card.learningGoal}`,
    card.childAction && `Trẻ sẽ: ${card.childAction}`,
    card.content?.length > 0 && `Nội dung: ${card.content.join('; ')}`,
    card.setting && `Bối cảnh: ${card.setting}`,
    card.unsupported?.length > 0 && `Làm thay phần chưa hỗ trợ: ${card.unsupported.map((item) => item.fallback).join('; ')}`,
  ].filter((line) => line && line.trim())
  const idea = lines.join('\n').slice(0, 2000)
  return idea.trim().length >= 10 ? idea : originalIdea.trim().slice(0, 2000)
}

const VIETNAMESE_LETTER = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/iu

/** Chữ có ít nhất 3 từ mà không có chữ cái tiếng Việt nào: gần như chắc là tiếng Anh. */
export const looksEnglish = (text) => typeof text === 'string' && text.trim().split(/\s+/).length >= 3 && !VIETNAMESE_LETTER.test(text)

/** Lời dẫn trẻ đọc của từng câu/màn, cho cả DSL v1.0.0 và CPF. */
function instructions(game) {
  if (game.cpf) return (game.cpf.content?.rounds ?? []).map((round) => round.prompt)
  return (game.questions ?? []).map((q) => q.questionText ?? q.sentenceTemplate ?? q.audioText ?? q.targetDescription).filter(Boolean)
}

/** Đáp án đúng của từng câu (chỉ loại chọn một đáp án), để xem có phải mọi câu cùng một đáp án. */
function singleAnswers(game) {
  if (game.cpf) {
    const rounds = game.cpf.content?.rounds ?? []
    const keys = game.cpf.answerKey?.rounds ?? []
    return rounds.flatMap((round, index) => {
      const ids = keys[index]?.correctChoiceIds ?? []
      if (round.task !== 'PICK_ONE' || ids.length !== 1) return []
      return [round.choices?.find((choice) => choice.id === ids[0])?.label]
    })
  }
  return (game.questions ?? []).flatMap((q) =>
    q.correctOptionId ? [q.options?.find((option) => option.id === q.correctOptionId)?.text] : [])
}

/** Chỗ có thể có hình (vế nối, thẻ, vật kéo, bước, câu có visualPrompt) và chỗ đã có imageUrl. CPF luôn có hình qua assetId. */
function imageSlots(game) {
  if (game.cpf) return null
  let slots = 0
  let filled = 0
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    if ('visualPrompt' in node || 'imageUrl' in node) {
      slots += 1
      if (node.imageUrl) filled += 1
    }
    Object.values(node).forEach(visit)
  }
  visit(game.questions)
  return { slots, filled }
}

/** Chấm một game theo luật máy. Trả danh sách vấn đề (rỗng là đạt) và vài số đo. */
export function checkGame(game) {
  const problems = []
  const title = game.cpf?.metadata?.title ?? game.metadata?.title ?? ''
  if (looksEnglish(title)) problems.push(`Tên game tiếng Anh: "${title}"`)
  const prompts = instructions(game)
  const english = prompts.filter(looksEnglish)
  if (english.length > 0) problems.push(`Lời dẫn tiếng Anh: "${english[0]}"`)
  const seen = new Set()
  for (const prompt of prompts) {
    const key = prompt.trim().toLowerCase()
    if (seen.has(key)) {
      problems.push(`Câu trùng: "${prompt}"`)
      break
    }
    seen.add(key)
  }
  const answers = singleAnswers(game).filter(Boolean)
  if (answers.length >= 3 && new Set(answers).size === 1) problems.push(`Mọi câu cùng đáp án: "${answers[0]}"`)
  const images = imageSlots(game)
  return { title, questions: prompts.length, images, problems }
}
