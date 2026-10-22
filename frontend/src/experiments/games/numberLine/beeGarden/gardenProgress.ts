/**
 * Tiến trình «vườn nở hoa»: mỗi câu đúng ngay lần đầu thì một ô cây non nở thành một bông hoa. Từ khóa hình lấy qua `resolveImage` (bộ Fluent cục bộ);
 * dữ liệu ở đây để theme khác đổi loại hoa mà không sửa component.
 */
export const PROGRESS_SEEDLING = 'cây non'
/** Các loài hoa xoay vòng theo thứ tự ô, để vườn cuối lượt nhiều màu chứ không phải một bông lặp lại. */
export const PROGRESS_FLOWERS: readonly string[] = ['hoa hướng dương', 'hoa anh đào', 'hoa tulip', 'hoa dâm bụt', 'bông hoa']
export const PROGRESS_HONEY = 'hũ mật ong'
export const PROGRESS_UNIT = 'bông hoa'

/** Loài hoa của ô thứ `index` (từ 0), xoay vòng; chỉ số lạ thì lấy loài đầu. */
export function flowerKeyword(index: number): string {
  if (!Number.isFinite(index)) return PROGRESS_FLOWERS[0]
  const size = PROGRESS_FLOWERS.length
  return PROGRESS_FLOWERS[((Math.trunc(index) % size) + size) % size]
}
