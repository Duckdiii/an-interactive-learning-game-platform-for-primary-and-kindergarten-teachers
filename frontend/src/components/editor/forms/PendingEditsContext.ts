import { createContext, useContext } from 'react'

// Các ô chữ của form sửa tay chỉ áp nội dung vào game sau một nhịp (hẹn giờ + kiểm tra từ ngữ). Trong lúc đó nội dung giáo viên vừa
// gõ CHƯA có trong bản đang soạn, nên trang phải biết để không cho Lưu hoặc Chơi thử trên bản cũ rồi báo "Đã lưu".
// `begin()` đăng ký một chỉnh sửa đang chờ và trả về hàm báo đã xong.
export interface PendingEdits {
  begin: () => () => void
  // Còn chỉnh sửa chưa vào bản đang soạn: nút cần đọc bản đang soạn (ví dụ "AI làm lại") phải đợi.
  pending: boolean
}

export const PendingEditsContext = createContext<PendingEdits>({ begin: () => () => {}, pending: false })

export const usePendingEdits = () => useContext(PendingEditsContext)
