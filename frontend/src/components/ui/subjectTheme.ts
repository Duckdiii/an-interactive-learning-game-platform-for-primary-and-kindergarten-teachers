// Màu theo môn học dùng cho hình bìa và nhãn trên thẻ game (màu định nghĩa ở index.css).

export interface SubjectTheme {
  cover: string
  chip: string
  mark: string
  tiles: [string, string, string]
}

// Chuỗi class viết đủ (không ghép) để Tailwind nhìn thấy khi quét mã nguồn.
const SUBJECT_THEMES = new Map<string, SubjectTheme>([
  [
    'MATH',
    {
      cover: 'bg-math-soft',
      chip: 'bg-math-soft text-math-ink',
      mark: 'text-math-mark',
      tiles: ['1', '2', '3'],
    },
  ],
  [
    'VIETNAMESE',
    {
      cover: 'bg-viet-soft',
      chip: 'bg-viet-soft text-viet-ink',
      mark: 'text-viet-mark',
      tiles: ['A', 'Ă', 'Â'],
    },
  ],
  [
    'ENGLISH',
    {
      cover: 'bg-eng-soft',
      chip: 'bg-eng-soft text-eng-ink',
      mark: 'text-eng-mark',
      tiles: ['A', 'B', 'C'],
    },
  ],
])

const DEFAULT_THEME: SubjectTheme = {
  cover: 'bg-brand-soft',
  chip: 'bg-brand-soft text-brand-strong',
  mark: 'text-brand',
  tiles: ['★', '★', '★'],
}

export const subjectTheme = (subject: string) =>
  SUBJECT_THEMES.get(subject) ?? DEFAULT_THEME
