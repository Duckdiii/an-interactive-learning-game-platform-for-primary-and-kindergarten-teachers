// Theo TeacherInfo (teacherId, fullName, email; spec còn có `role` kiểu ROLE_TEACHER | ROLE_ADMIN, backend chưa trả).
// `id` là phần của contract cũ, giữ để không phá phiên đã lưu và các test cũ cho tới khi frontend auth chuyển hẳn
// sang teacherId (xem CLAUDE.md).
export interface AuthUser {
  teacherId?: string
  fullName?: string
  email: string
  id?: string
  role?: string
  [key: string]: unknown
}

export interface AuthSession {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
}

export interface AuthContextValue extends AuthSession {
  login: (user: AuthUser, token: string, refreshToken: string) => void
  logout: () => void
}
