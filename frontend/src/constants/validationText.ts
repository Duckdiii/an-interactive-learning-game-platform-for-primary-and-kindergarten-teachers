// Câu thông báo cho giáo viên khi nội dung game chưa hợp lệ (luật ở `utils/gameValidation.ts`, giới hạn ở
// `utils/questionSpecs.ts`). Mẫu dùng {n} (số thứ tự câu), {label}, {min}, {max}. Câu tổng quát lấy đúng theo SRS
// (UC-04 luồng 5a, UC-07 luồng 2c).

export type IssueCode =
  | 'required'
  | 'tooLong'
  | 'tooShort'
  | 'count'
  | 'range'
  | 'notInteger'
  | 'noCorrect'
  | 'badRef'
  | 'duplicate'
  | 'duplicateId'
  | 'needContent'
  | 'blankCount'
  | 'scrambleMismatch'
  | 'scrambleSame'
  | 'positions'
  | 'emptyZone'
  | 'hasSpace'
  | 'missingHit'
  | 'badId'
  | 'badPositionalId'
  | 'badLetter'
  | 'unknownType'

export const ISSUE_TEMPLATES: Readonly<Record<IssueCode, string>> = {
  required: 'cần nhập {label}.',
  tooLong: '{label} tối đa {max} ký tự.',
  tooShort: '{label} cần ít nhất {min} ký tự.',
  count: '{label} cần từ {min} đến {max}.',
  range: '{label} phải từ {min} đến {max}.',
  notInteger: '{label} phải là số nguyên.',
  noCorrect: 'chưa có đáp án đúng.',
  badRef: '{label} không khớp với danh sách.',
  duplicate: '{label} bị trùng nhau.',
  duplicateId: 'mã của {label} bị trùng nhau.',
  needContent: '{label} cần có chữ hoặc mô tả hình.',
  blankCount: 'câu cần có đúng một chỗ trống "___".',
  scrambleMismatch: 'các chữ cái xáo trộn phải đúng là các chữ của từ đáp án.',
  scrambleSame: 'thứ tự chữ cái xáo trộn phải khác thứ tự của từ đáp án.',
  positions: 'thứ tự đúng phải là các số từ 1 đến {max}, không trùng nhau.',
  emptyZone: 'mỗi vùng thả cần có ít nhất một vật.',
  hasSpace: '{label} không được có khoảng trắng.',
  missingHit: 'chưa chọn vùng đúng trên ảnh.',
  badId: 'mã của {label} chưa đúng định dạng (ví dụ q1, q2).',
  badPositionalId: 'mã của {label} phải theo thứ tự a, b, c...',
  badLetter: 'mỗi ô chỉ nhập một chữ cái, không có khoảng trắng.',
  unknownType: 'loại trò chơi chưa được hỗ trợ.',
}

export const validationText = {
  // Tiền tố của từng thông báo.
  questionPrefix: 'Câu {n}: ',
  gamePrefix: 'Trò chơi: ',
  // Thông báo tổng quát theo SRS.
  summaryNoCorrect:
    'Hệ thống phát hiện một số câu hỏi của bạn chưa có đáp án đúng. Vui lòng kiểm tra và bổ sung đầy đủ trước khi lưu hoặc xuất bản.',
  summarySave:
    'Trò chơi còn nội dung chưa hợp lệ. Hãy kiểm tra và điều chỉnh các câu được nêu trước khi lưu hoặc xuất bản.',
  summaryPublish: 'Bạn hãy kiểm tra và điều chỉnh lại nội dung.',
  labels: {
    title: 'Tên trò chơi',
    topic: 'Chủ đề',
    subject: 'Môn học',
    gradeLevel: 'Khối lớp',
    questions: 'Số câu hỏi',
    timeLimitSeconds: 'Thời gian trả lời (giây)',
    points: 'Điểm',
    audioText: 'Lời đọc',
    visualPrompt: 'Mô tả hình ảnh',
    questionText: 'Nội dung câu hỏi',
    options: 'Số đáp án',
    optionText: 'Nội dung đáp án',
    optionTexts: 'Các đáp án',
    correctOption: 'Đáp án đúng',
    correctImage: 'Hình đúng',
    distractors: 'Số hình nhiễu',
    distractorTexts: 'Các lựa chọn nhiễu',
    items: 'Số phần tử',
    itemText: 'Nội dung phần tử',
    itemTexts: 'Các phần tử',
    oddOne: 'Phần tử khác loại',
    targetDescription: 'Mô tả vật cần tìm',
    hitRegion: 'Vùng đúng trên ảnh',
    correctWord: 'Từ đáp án',
    letters: 'Số chữ cái xáo trộn',
    letter: 'Chữ cái xáo trộn',
    pairs: 'Số cặp',
    pairIds: 'cặp',
    pairSide: 'Một phía của cặp',
    leftSides: 'Các mục bên trái',
    rightSides: 'Các mục bên phải',
    contents: 'Nội dung các thẻ',
    dropZones: 'Số vùng thả',
    zoneLabel: 'Tên vùng thả',
    zoneLabels: 'Tên các vùng thả',
    zoneIds: 'vùng thả',
    itemIds: 'vật',
    dragItems: 'Số vật cần kéo',
    targetZone: 'Vùng thả của vật',
    steps: 'Số bước',
    stepText: 'Nội dung bước',
    stepIds: 'bước',
    sentenceTemplate: 'Câu có chỗ trống',
    correctAnswer: 'Từ đúng',
    distractorText: 'Từ nhiễu',
    questionIds: 'câu hỏi',
    question: 'Câu hỏi',
  },
} as const
