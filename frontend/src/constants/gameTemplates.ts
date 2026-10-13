// Mẫu gợi ý cho trang "Tạo game mới": chọn mẫu thì điền sẵn môn, khối lớp và chủ đề; giáo viên vẫn sửa được.
// Đây là dữ liệu tĩnh ở frontend (chưa gọi API). Môn và khối lớp dùng đúng giá trị enum của API.
// LƯU Ý: chủ đề chỉ là gợi ý, cần giáo viên đối chiếu chương trình thực tế trước khi mở rộng.

export type TemplateLevel = 'KINDERGARTEN' | 'GRADE_1'

export interface GameTemplate {
  id: string
  level: TemplateLevel
  subject: 'MATH' | 'VIETNAMESE' | 'ENGLISH'
  title: string
  topic: string
}

// Độ dài tối đa của ô nhập chủ đề (giới hạn của giao diện, giữ chủ đề ngắn gọn). Đây KHÔNG phải ràng buộc của API:
// request tạo game dùng trường `idea` (10 đến 2000 ký tự) trong docs/openapi/openapi.yaml; khi endpoint được cài
// thì phải ánh xạ lại chủ đề sang `idea` theo contract.
export const TOPIC_MAX_LENGTH = 200

export const TEMPLATE_LEVELS: ReadonlyArray<{ value: TemplateLevel; label: string }> = [
  { value: 'KINDERGARTEN', label: 'Mầm non' },
  { value: 'GRADE_1', label: 'Lớp 1' },
]

export const GAME_TEMPLATES: ReadonlyArray<GameTemplate> = [
  {
    id: 'kg-math-count',
    level: 'KINDERGARTEN',
    subject: 'MATH',
    title: 'Đếm đồ vật từ 1 đến 5',
    topic: 'Đếm số lượng đồ vật quen thuộc từ 1 đến 5',
  },
  {
    id: 'kg-math-shapes',
    level: 'KINDERGARTEN',
    subject: 'MATH',
    title: 'Nhận biết hình tròn, vuông, tam giác',
    topic: 'Nhận biết hình tròn, hình vuông, hình tam giác',
  },
  {
    id: 'kg-viet-letters',
    level: 'KINDERGARTEN',
    subject: 'VIETNAMESE',
    title: 'Làm quen chữ cái a, ă, â',
    topic: 'Làm quen và nhận biết các chữ cái a, ă, â',
  },
  {
    id: 'kg-viet-objects',
    level: 'KINDERGARTEN',
    subject: 'VIETNAMESE',
    title: 'Gọi tên đồ vật trong lớp học',
    topic: 'Gọi tên các đồ vật quen thuộc trong lớp học',
  },
  {
    id: 'kg-eng-colors',
    level: 'KINDERGARTEN',
    subject: 'ENGLISH',
    title: 'Các màu sắc bằng tiếng Anh',
    topic: 'Tên các màu cơ bản bằng tiếng Anh: red, blue, yellow, green',
  },
  {
    id: 'kg-eng-animals',
    level: 'KINDERGARTEN',
    subject: 'ENGLISH',
    title: 'Con vật quen thuộc bằng tiếng Anh',
    topic: 'Tên các con vật quen thuộc bằng tiếng Anh: cat, dog, bird, fish',
  },
  {
    id: 'g1-math-add',
    level: 'GRADE_1',
    subject: 'MATH',
    title: 'Phép cộng trong phạm vi 10',
    topic: 'Phép cộng hai số trong phạm vi 10',
  },
  {
    id: 'g1-math-compare',
    level: 'GRADE_1',
    subject: 'MATH',
    title: 'So sánh số trong phạm vi 10',
    topic: 'So sánh các số trong phạm vi 10: lớn hơn, bé hơn, bằng nhau',
  },
  {
    id: 'g1-viet-vowels',
    level: 'GRADE_1',
    subject: 'VIETNAMESE',
    title: 'Ghép chữ cái thành tiếng',
    topic: 'Ghép phụ âm và nguyên âm thành tiếng đơn giản',
  },
  {
    id: 'g1-viet-words',
    level: 'GRADE_1',
    subject: 'VIETNAMESE',
    title: 'Đọc từ ngữ đơn giản',
    topic: 'Đọc và nhận biết các từ ngữ đơn giản quen thuộc',
  },
  {
    id: 'g1-eng-greetings',
    level: 'GRADE_1',
    subject: 'ENGLISH',
    title: 'Chào hỏi bằng tiếng Anh',
    topic: 'Các câu chào hỏi đơn giản bằng tiếng Anh: hello, goodbye, thank you',
  },
  {
    id: 'g1-eng-family',
    level: 'GRADE_1',
    subject: 'ENGLISH',
    title: 'Các thành viên trong gia đình',
    topic: 'Tên các thành viên trong gia đình bằng tiếng Anh: mom, dad, brother, sister',
  },
]

export const templatesForLevel = (level: TemplateLevel) =>
  GAME_TEMPLATES.filter((template) => template.level === level)
