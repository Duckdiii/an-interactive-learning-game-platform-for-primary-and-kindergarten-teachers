import { hasPhrase, toMatchText } from '../../utils/phraseMatch'

// Bộ lọc từ ngữ GIẢ LẬP cho bước kiểm tra nội dung giáo viên sửa tay (UC-05 luồng 2a). Chỉ là danh sách cụm từ rõ nghĩa,
// khớp theo ranh giới từ (xem `utils/phraseMatch`) để từ vô hại không bị chặn nhầm (văn bản được bỏ dấu khi so, nên KHÔNG đưa vào
// danh sách những từ trùng chữ với tên người, ví dụ "bạo lực" khớp "Bảo Lực"). Kiểm duyệt thật chạy ở Backend (Layer 3)
// khi lưu; bản này chỉ giúp giáo viên biết sớm và giúp thử giao diện.
const BLOCKED_PHRASES = ['giet nguoi', 'mau me', 'ma tuy', 'khieu dam', 'sung dan', 'tu sat', 'ban sung']

export interface SafetyVerdict {
  safe: boolean
}

export function mockCheckSafety(texts: ReadonlyArray<string>): SafetyVerdict {
  const unsafe = texts.some((text) => {
    const matchText = toMatchText(text)

    return BLOCKED_PHRASES.some((phrase) => hasPhrase(matchText, phrase))
  })

  return { safe: !unsafe }
}
