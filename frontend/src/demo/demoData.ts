import heroImage from '../assets/hero.png'
import type { AuthUser } from '../types/auth'
import type { GameFilters, GameSummary } from '../types/game'

export const demoTeacher: AuthUser = {
  id: 'demo-teacher',
  email: 'demo@example.com',
  fullName: 'Giáo viên demo',
  role: 'TEACHER',
}

const demoGames: GameSummary[] = [
  {
    id: 'demo-counting',
    title: 'Đếm số từ 1 đến 10',
    subject: 'MATH',
    gradeLevel: 'ELEMENTARY',
    status: 'PUBLISHED',
    thumbnailUrl: heroImage,
  },
  {
    id: 'demo-letters',
    title: 'Bé làm quen chữ cái',
    subject: 'VIETNAMESE',
    gradeLevel: 'KINDERGARTEN',
    status: 'DRAFT',
    thumbnailUrl: heroImage,
  },
  {
    id: 'demo-colors',
    title: 'Làm quen màu sắc tiếng Anh',
    subject: 'ENGLISH',
    gradeLevel: 'KINDERGARTEN',
    status: 'PUBLISHED',
    thumbnailUrl: heroImage,
  },
]

export function getDemoGames(filters: GameFilters) {
  return demoGames.filter((game) =>
    (Object.keys(filters) as (keyof GameFilters)[]).every(
      (field) => !filters[field] || game[field] === filters[field],
    ),
  )
}
