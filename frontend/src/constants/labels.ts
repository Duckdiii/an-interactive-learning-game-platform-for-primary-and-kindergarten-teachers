// Nhãn tiếng Việt cho giá trị enum của API. Chỉ dùng để HIỂN THỊ; giá trị gửi lên API vẫn là enum gốc
// (contract đã freeze, xem docs/openapi/openapi.yaml: Subject, GradeLevel, GameStatus).

const SUBJECT_LABELS = new Map([
  ['MATH', 'Toán'],
  ['VIETNAMESE', 'Tiếng Việt'],
  ['ENGLISH', 'Tiếng Anh'],
])

const GRADE_LEVEL_LABELS = new Map([
  ['KINDERGARTEN', 'Mầm non'],
  ['GRADE_1', 'Lớp 1'],
  ['GRADE_2', 'Lớp 2'],
  ['GRADE_3', 'Lớp 3'],
  ['GRADE_4', 'Lớp 4'],
  ['GRADE_5', 'Lớp 5'],
])

const GAME_STATUS_LABELS = new Map([
  ['DRAFT', 'Bản nháp'],
  ['PUBLISHED', 'Đã đăng'],
])

// Loại game theo enum GameType của API (docs/openapi/openapi.yaml). Tên gọi ngắn, dễ hiểu với giáo viên.
const GAME_TYPE_LABELS = new Map([
  ['QUIZ', 'Trắc nghiệm'],
  ['AUDIO_VISUAL_MATCH', 'Nghe và chọn hình'],
  ['ODD_ONE_OUT', 'Tìm vật khác loại'],
  ['SPOT_THE_TARGET', 'Tìm đúng vật'],
  ['WORD_SCRAMBLE', 'Sắp xếp chữ cái'],
  ['MATCHING', 'Nối cặp'],
  ['MEMORY_CARD', 'Lật thẻ ghi nhớ'],
  ['DRAG_DROP', 'Kéo thả'],
  ['ORDERING', 'Sắp xếp thứ tự'],
  ['VISUAL_CLOZE', 'Điền vào chỗ trống'],
])

// Danh sách giá trị hợp lệ theo thứ tự hiển thị, dùng cho ô chọn ở form (khớp enum Subject, GradeLevel của API).
export const SUBJECT_VALUES = [...SUBJECT_LABELS.keys()]
export const GRADE_LEVEL_VALUES = [...GRADE_LEVEL_LABELS.keys()]
export const GAME_TYPE_VALUES = [...GAME_TYPE_LABELS.keys()]

// Giá trị chưa có trong bảng (ví dụ backend thêm enum mới) vẫn hiển thị được, không làm vỡ giao diện.
export function fallbackLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Thứ tự hiển thị trong ô chọn: theo thứ tự khai báo ở trên (Mầm non trước Lớp 1...), giá trị lạ xếp sau theo chữ cái.
function orderComparator(labels: Map<string, string>) {
  const order = [...labels.keys()]
  const rank = (value: string) => {
    const index = order.indexOf(value)
    return index === -1 ? order.length : index
  }

  return (a: string, b: string) => rank(a) - rank(b) || a.localeCompare(b)
}

export const compareGradeLevels = orderComparator(GRADE_LEVEL_LABELS)

export const subjectLabel = (value: string) =>
  SUBJECT_LABELS.get(value) ?? fallbackLabel(value)

export const gradeLevelLabel = (value: string) =>
  GRADE_LEVEL_LABELS.get(value) ?? fallbackLabel(value)

export const gameStatusLabel = (value: string) =>
  GAME_STATUS_LABELS.get(value) ?? fallbackLabel(value)

export const gameTypeLabel = (value: string) =>
  GAME_TYPE_LABELS.get(value) ?? fallbackLabel(value)
