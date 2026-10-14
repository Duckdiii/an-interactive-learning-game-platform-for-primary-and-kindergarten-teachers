import { SUBJECT_VALUES } from './labels'

// Môn học hiển thị trong ô chọn theo từng khối lớp. TÁCH RIÊNG để sửa một chỗ: nhóm đang chờ xác nhận Mầm non phân theo
// MÔN hay theo LĨNH VỰC PHÁT TRIỂN. Khi chốt, chỉ cần khai báo danh sách riêng cho KINDERGARTEN ở đây (ví dụ cắt bớt môn
// hoặc thêm lĩnh vực), không phải sửa trang Tạo game. Khối nào không khai báo thì dùng đủ các môn của API.
const SUBJECTS_BY_GRADE: Readonly<Record<string, ReadonlyArray<string>>> = {
  // KINDERGARTEN: [...]  // chờ xác nhận
}

export function subjectOptionsFor(gradeLevel: string): ReadonlyArray<string> {
  return SUBJECTS_BY_GRADE[gradeLevel] ?? SUBJECT_VALUES
}
