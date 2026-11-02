import { viText } from '../constants/viText'
import { safeHttpUrl } from './safeUrl'

export const PARENT_MESSAGE_MAX_LENGTH = 1000

interface ParentMessageInput {
  title: string
  shareCode: string
  // Chỉ được dùng khi là http/https hợp lệ; không thì tin nhắn chỉ có mã.
  shareUrl: string | null | undefined
}

const text = viText.editor.publish.parent

/**
 * Văn bản mẫu gửi phụ huynh (giáo viên tự sửa rồi tự sao chép, ứng dụng KHÔNG gửi đi đâu và không lưu). Chỉ chứa tên trò chơi, liên kết và mã chia sẻ,
 * không có dữ liệu của học sinh hay phụ huynh.
 */
export function buildParentMessage({ title, shareCode, shareUrl }: ParentMessageInput) {
  const name = title.trim() || viText.editor.untitled
  const url = safeHttpUrl(shareUrl)

  return [
    text.greeting,
    '',
    text.intro.replace('{title}', () => name),
    url ? text.withLink.replace('{url}', () => url).replace('{code}', () => shareCode) : text.codeOnly.replace('{code}', () => shareCode),
    '',
    text.closing,
  ].join('\n')
}
