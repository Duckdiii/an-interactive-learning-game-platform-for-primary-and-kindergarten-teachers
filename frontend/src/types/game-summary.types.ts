export interface GameSummary {
  id: string
  title: string
  subject: string
  gradeLevel: string
  status: string
  thumbnailUrl: string | null
}

export interface GameFilters {
  subject: string
  gradeLevel: string
  status: string
}
