// Thông báo lỗi tiếng Việt cho giáo viên, theo bảng mã lỗi trong docs/openapi/openapi.yaml (schema ErrorCode).
// Mỗi câu nói rõ chuyện gì đã xảy ra và nên làm gì tiếp, không xin lỗi chung chung, không lộ thuật ngữ kỹ thuật.
// Mã nào backend chưa cài (CONFLICT, RATE_LIMITED...) vẫn có sẵn câu để khi backend bật là hiển thị đúng.

export const ERROR_MESSAGES = new Map<string, string>([
  ['VALIDATION_ERROR', 'Thông tin chưa hợp lệ. Hãy kiểm tra lại các ô và thử lại.'],
  [
    'UNAUTHORIZED',
    'Phiên đăng nhập đã hết hạn hoặc thông tin đăng nhập chưa đúng. Hãy đăng nhập lại.',
  ],
  ['FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
  ['NOT_FOUND', 'Không tìm thấy nội dung bạn cần. Có thể nó đã bị xóa.'],
  [
    'FILE_TOO_LARGE_OR_INVALID_FORMAT',
    'Tệp quá lớn hoặc sai định dạng. Hãy chọn tệp khác.',
  ],
  [
    'UNSAFE_CONTENT',
    'Nội dung chưa phù hợp với học sinh nhỏ tuổi. Hãy đổi chủ đề hoặc cách diễn đạt rồi thử lại.',
  ],
  ['AI_GENERATION_TIMEOUT', 'Trợ lý AI trả lời quá lâu. Hãy thử lại sau ít phút.'],
  ['INTERNAL_ERROR', 'Hệ thống đang gặp sự cố. Hãy thử lại sau ít phút.'],
  [
    'CONFLICT',
    'Nội dung vừa được thay đổi ở nơi khác. Hãy tải lại trang rồi thử lại.',
  ],
  ['RATE_LIMITED', 'Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.'],
  ['ACCOUNT_LOCKED', 'Tài khoản này đang bị khóa. Hãy liên hệ quản trị viên.'],
  [
    'LOGIN_TEMPORARILY_LOCKED',
    'Bạn đã nhập sai quá nhiều lần. Hãy thử đăng nhập lại sau 15 phút.',
  ],
  [
    'CONTENT_NOT_AGE_APPROPRIATE',
    'Nội dung chưa phù hợp với lứa tuổi của lớp. Hãy điều chỉnh rồi thử lại.',
  ],
])

// Lỗi không có phản hồi từ máy chủ (không có mã lỗi của API).
export const CONNECTION_ERROR_MESSAGES = {
  network: 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
  timeout: 'Máy chủ phản hồi quá chậm. Hãy thử lại sau ít phút.',
} as const

// Phản hồi chỉ có mã HTTP, không có phần thân theo định dạng {success, error}.
export function errorCodeFromStatus(status: number): string | undefined {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'INTERNAL_ERROR'
  return undefined
}
