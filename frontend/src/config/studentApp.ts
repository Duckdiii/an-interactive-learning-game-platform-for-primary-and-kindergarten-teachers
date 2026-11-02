import { safeHttpUrl } from '../utils/safeUrl'

// Địa chỉ gốc của TRANG HỌC SINH (nơi học sinh mở mã chia sẻ). shareUrl do Backend trả về luôn được ưu tiên; biến môi trường
// VITE_STUDENT_APP_BASE_URL chỉ là dự phòng cho dữ liệu mô phỏng (và khi Backend chưa trả shareUrl). Trang đích (/play/:shareCode) do nhóm
// phụ trách phần học sinh làm (xem docs/decisions.md), nên hiện liên kết chỉ để sao chép.

/** Địa chỉ gốc, không có dấu "/" cuối. Biến trống hoặc không phải http(s) thì dùng chính địa chỉ đang mở ứng dụng. */
export function studentAppBaseUrl(raw: unknown = import.meta.env.VITE_STUDENT_APP_BASE_URL, fallbackOrigin: string = window.location.origin) {
  const configured = safeHttpUrl(typeof raw === 'string' ? raw : null)
  const base = configured ?? safeHttpUrl(fallbackOrigin) ?? 'http://localhost'

  // Giữ phần đường dẫn nếu có (ví dụ https://truong.edu.vn/hoc-sinh), bỏ dấu "/" thừa ở cuối.
  return base.replace(/\/+$/, '')
}

/**
 * Địa chỉ chia sẻ của một game: shareUrl của Backend nếu là http(s) hợp lệ; nếu không thì ghép từ địa chỉ gốc và mã chia sẻ.
 * Backend trả địa chỉ không an toàn (giao thức lạ) cũng bị bỏ và dùng địa chỉ ghép.
 */
export function resolveShareUrl(shareCode: string, backendUrl?: string | null) {
  return safeHttpUrl(backendUrl) ?? `${studentAppBaseUrl()}/play/${encodeURIComponent(shareCode)}`
}
