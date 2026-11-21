// Theo TeacherInfo (teacherId, fullName, email; spec còn có `role` kiểu ROLE_TEACHER | ROLE_ADMIN, backend chưa trả).
export interface AuthUser {
  teacherId?: string
  fullName?: string
  email: string
  role?: string
  [key: string]: unknown
}

// Refresh token không có ở đây: nằm trong cookie HttpOnly, trình duyệt tự gửi tới /auth/refresh.
export interface AuthSession {
  user: AuthUser | null
  token: string | null
}

export interface AuthContextValue extends AuthSession {
  login: (user: AuthUser, token: string) => void
  // Gọi API thu hồi refresh token rồi mới xóa phiên ở máy; API lỗi vẫn xóa để người dùng không bị kẹt.
  logout: () => Promise<void>
}
