import { useAuth } from './useAuth'

// Hai cách nhận diện giáo viên đang đăng nhập, dùng cho hai việc khác nhau:
//  - `teacherId`: MÃ giáo viên, bắt buộc cho thứ nằm lại trên máy (bản sao lưu nháp). Chưa có mã thì không lưu gì.
//  - `cacheOwner`: khóa phân tách bộ nhớ đệm truy vấn (mã, hoặc email khi phiên cũ chưa có mã). Chưa đăng nhập thì null và
//    các truy vấn của giáo viên không chạy, nên không bao giờ có "khóa chung" giữa hai người.
export function useTeacherIdentity() {
  const { user } = useAuth()
  // Chuỗi rỗng hoặc toàn khoảng trắng coi như chưa có: không bao giờ thành khóa chung giữa nhiều người.
  const teacherId = user?.teacherId?.trim() || null
  const email = user?.email?.trim() || null

  return { teacherId, cacheOwner: teacherId ?? email }
}
