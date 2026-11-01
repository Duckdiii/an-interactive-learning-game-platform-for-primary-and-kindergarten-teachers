import type { PublishErrorKind } from '../join/joinCode'

export interface ErrorScreenProps {
  kind: PublishErrorKind
  /** Mã lỗi cho người lớn (xem errorCodeOf). */
  code: string
  /** Chỉ truyền khi thử lại có ích; thiếu thì không hiện nút "Thử lại". */
  onRetry?: () => void
  /** Đang thử lại: khóa nút để bấm liên tục không gửi thêm yêu cầu. */
  busy?: boolean
}
