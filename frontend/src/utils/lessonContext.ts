import { hasPhrase, toMatchText } from './phraseMatch'

export interface LessonContext {
  gradeLevel: string
  subject: string
}

// MOCK: suy ra khối lớp và môn từ ý tưởng bằng cụm từ khóa (so khớp không dấu, theo ranh giới từ, xem phraseMatch). Khi có
// AI thật, thay hàm này bằng lời gọi API ở hook `useLessonContext`; phần còn lại của giao diện không đổi.
// Không suy ra được thì trả chuỗi rỗng.
const GRADE_KEYWORDS: ReadonlyArray<[string, ReadonlyArray<string>]> = [
  ['KINDERGARTEN', ['mam non', 'mau giao', 'nha tre', '3 4 tuoi', '4 5 tuoi', '5 6 tuoi', 'be 5 tuoi']],
]

const SUBJECT_KEYWORDS: ReadonlyArray<[string, ReadonlyArray<string>]> = [
  ['MATH', ['mon toan', 'bai toan', 'toan hoc', 'dem so', 'dem den', 'so luong', 'phep cong', 'phep tru', 'hinh tron', 'hinh vuong', 'tam giac', 'so sanh so', 'bang cuu chuong', 'chu so']],
  ['VIETNAMESE', ['tieng viet', 'chu cai', 'hoc van', 'ghep van', 'tap doc', 'chinh ta', 'tu ngu', 'cau van', 'dau thanh']],
  ['ENGLISH', ['tieng anh', 'english', 'colors', 'colours', 'animals', 'vocabulary']],
]

const GRADE_NUMBER = /\blop ([1-5])\b/

function firstMatch(text: string, table: ReadonlyArray<[string, ReadonlyArray<string>]>) {
  for (const [value, keywords] of table) {
    if (keywords.some((keyword) => hasPhrase(text, keyword))) return value
  }

  return ''
}

export function inferLessonContext(idea: string): LessonContext {
  const text = toMatchText(idea)
  const numbered = GRADE_NUMBER.exec(text)
  const gradeLevel = numbered ? `GRADE_${numbered[1]}` : firstMatch(text, GRADE_KEYWORDS)

  return { gradeLevel, subject: firstMatch(text, SUBJECT_KEYWORDS) }
}
