import type { ValidationIssue } from '../../../utils/gameValidation'

// Lời nhắn lỗi của một trường để hiện ngay dưới ô: bỏ tiền tố "Câu n: " (đã nằm đúng câu) và viết hoa chữ đầu.
export function cleanMessage(message: string) {
  const body = message.replace(/^(Câu \d+|Trò chơi):\s*/, '')

  return body.charAt(0).toUpperCase() + body.slice(1)
}

/** Lời nhắn của lỗi đầu tiên ở đúng trường `field` (ví dụ "options[1].text"), hoặc undefined khi trường hợp lệ. */
export function fieldMessage(issues: ReadonlyArray<ValidationIssue>, field: string) {
  const found = issues.find((issue) => issue.field === field)

  return found ? cleanMessage(found.message) : undefined
}
