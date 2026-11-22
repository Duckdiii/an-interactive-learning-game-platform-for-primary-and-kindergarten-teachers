// Gợi ý ý tưởng soạn sẵn cho màn "Tạo game", theo môn × nhóm khối. Là nội dung biên tập tĩnh, không phải dữ liệu từ API.

export type IdeaGroup = 'KINDERGARTEN' | 'GRADE_1' | 'UPPER'
export type IdeaSubject = 'MATH' | 'VIETNAMESE' | 'ENGLISH'

export interface Idea {
  // Ký hiệu trên ô nghiêng: tối đa 2 ký tự.
  glyph: string
  title: string
  description: string
}

// Nhóm khối hiển thị ở hàng nút: Lớp 2–5 gộp thành một nhóm (API vẫn cần khối cụ thể).
export function ideaGroupOf(gradeLevel: string): IdeaGroup | '' {
  if (gradeLevel === 'KINDERGARTEN' || gradeLevel === 'GRADE_1') return gradeLevel

  return /^GRADE_[2-5]$/.test(gradeLevel) ? 'UPPER' : ''
}

export const IDEAS: Record<IdeaSubject, Record<IdeaGroup, Idea[]>> = {
  MATH: {
    KINDERGARTEN: [
      { glyph: '5', title: 'Đếm đồ vật từ 1 đến 5', description: 'Nhận biết số lượng qua tranh' },
      { glyph: '+', title: 'Nhiều hơn, ít hơn', description: 'So sánh hai nhóm đồ vật' },
      { glyph: '○', title: 'Nhận biết hình tròn, vuông, tam giác', description: 'Tìm hình trong đồ vật quen thuộc' },
      { glyph: '🎯', title: 'Hứng quả số chẵn, số lẻ', description: 'Di chuyển giỏ hứng quả rơi tương tác vật lý' },
    ],
    GRADE_1: [
      { glyph: '+', title: 'Phép cộng trong phạm vi 10', description: 'Cộng hai nhóm đồ vật rồi chọn kết quả' },
      { glyph: '−', title: 'Phép trừ trong phạm vi 10', description: 'Bớt đi một số đồ vật và đếm phần còn lại' },
      { glyph: '>', title: 'So sánh số: lớn hơn, bé hơn, bằng', description: 'Chọn dấu thích hợp cho hai số' },
      { glyph: '🏹', title: 'Bắn cung số chẵn số lẻ', description: 'Kéo ná bắn vỡ bong bóng năng lượng' },
    ],
    UPPER: [
      { glyph: '×', title: 'Bảng nhân 2 và 5', description: 'Nối phép nhân với kết quả đúng' },
      { glyph: '½', title: 'Làm quen với phân số', description: 'Nhận biết một nửa, một phần tư qua hình vẽ' },
      { glyph: '9h', title: 'Xem đồng hồ', description: 'Đọc giờ đúng và giờ rưỡi' },
      { glyph: '💥', title: 'Chạm nổ bong bóng phép tính', description: 'Chạm nổ bong bóng mang kết quả đúng' },
    ],
  },
  VIETNAMESE: {
    KINDERGARTEN: [
      { glyph: 'A', title: 'Làm quen chữ cái a, b, c', description: 'Nhận mặt chữ qua hình ảnh quen thuộc' },
      { glyph: '♪', title: 'Nghe và đọc theo vần', description: 'Nghe âm rồi chọn tranh đúng' },
      { glyph: 'M', title: 'Gọi tên con vật, đồ vật', description: 'Nối tranh với từ tương ứng' },
      { glyph: '☺', title: 'Tìm chữ cái đầu của tên em', description: 'Nhận ra chữ đầu trong tên bạn' },
    ],
    GRADE_1: [
      { glyph: 'ă', title: 'Chữ cái và dấu thanh', description: 'Phân biệt a, ă, â và các dấu' },
      { glyph: 'ng', title: 'Vần và tiếng có vần', description: 'Ghép âm đầu với vần thành tiếng' },
      { glyph: '✎', title: 'Ghép tiếng thành từ', description: 'Sắp xếp chữ cái thành từ đúng' },
      { glyph: '…', title: 'Điền chữ còn thiếu', description: 'Chọn chữ thích hợp điền vào chỗ trống' },
    ],
    UPPER: [
      { glyph: 'Aa', title: 'Từ chỉ sự vật, hoạt động, đặc điểm', description: 'Phân loại từ theo nhóm' },
      { glyph: '↔', title: 'Từ trái nghĩa', description: 'Nối các cặp từ có nghĩa ngược nhau' },
      { glyph: '.', title: 'Dấu chấm, dấu phẩy', description: 'Chọn dấu câu thích hợp cho câu văn' },
      { glyph: '≈', title: 'Từ đồng nghĩa', description: 'Tìm từ có nghĩa giống nhau' },
    ],
  },
  ENGLISH: {
    KINDERGARTEN: [
      { glyph: 'R', title: 'Màu sắc: red, blue, yellow', description: 'Nghe từ rồi chọn đúng màu' },
      { glyph: 'D', title: 'Con vật: dog, cat, bird', description: 'Nối tranh con vật với từ tiếng Anh' },
      { glyph: '1', title: 'Đếm one, two, three', description: 'Đếm đồ vật và nghe số bằng tiếng Anh' },
      { glyph: 'Hi', title: 'Chào hỏi: hello, goodbye', description: 'Làm quen các câu chào đơn giản' },
    ],
    GRADE_1: [
      { glyph: 'Ab', title: 'Bảng chữ cái tiếng Anh', description: 'Nối chữ cái hoa với chữ thường' },
      { glyph: 'B', title: 'Đồ vật trong lớp học', description: 'Nghe từ và chọn đúng đồ vật' },
      { glyph: 'F', title: 'Gia đình: mother, father, sister', description: 'Gọi tên các thành viên trong gia đình' },
      { glyph: '10', title: 'Số từ 1 đến 10', description: 'Nghe và chọn số đúng' },
    ],
    UPPER: [
      { glyph: 'I', title: 'Giới thiệu bản thân', description: 'Hoàn thành câu: My name is…, I am…' },
      { glyph: 'Ap', title: 'Đồ ăn, thức uống', description: 'Ghép từ vựng với hình ảnh' },
      { glyph: 'Mo', title: 'Các ngày trong tuần', description: 'Sắp xếp Monday đến Sunday đúng thứ tự' },
      { glyph: 'In', title: 'Giới từ chỉ vị trí: in, on, under', description: 'Chọn từ đúng theo tranh' },
    ],
  },
}
