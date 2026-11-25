export const ROUTES = {
  dashboard: '/dashboard',
  createGame: '/games/new',
  results: '/results',
  classrooms: '/classrooms',
  teacherProfile: '/profile',
  login: '/login',
  register: '/register',
  // Quên/đặt lại mật khẩu (UC-15 luồng 2a); trang đặt lại nhận ?token=... từ liên kết trong email.
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  workspace: '/workspace',
  workspaceEditor: '/workspace/editor',
  // Trang học sinh (không đăng nhập): mở bằng mã chia sẻ hoặc mã QR.
  play: '/play/:shareCode',
  join: '/join',
  roomJoin: '/join/:pin',
  // Trình chiếu trên tivi lớp (giáo viên, toàn màn hình, không có thanh bên).
  present: '/present/:gameId',
  // Mở phòng thi đấu từ một game; `/rooms/:sessionId` để dành cho phòng đã có phiên ở Backend.
  roomHost: '/rooms/host/:gameId',
  // Màn hình trình chiếu Live Arena lớn trên máy chiếu / tivi
  liveArenaPresentation: '/presentation/:sessionId',
  // Màn hình điều khiển Live Arena của giáo viên (quản lý học sinh, kick, chuyển câu)
  liveArenaTeacherControl: '/rooms/:sessionId/control',
  // Phân hệ Quản trị viên (Admin Portal)
  adminDashboard: '/admin/dashboard',
  adminTeachers: '/admin/teachers',
  adminAuditLogs: '/admin/audit-logs',
  adminAiConfig: '/admin/ai-config',
} as const

export const presentPath = (gameId: string) => `/present/${encodeURIComponent(gameId)}`
export const roomHostPath = (gameId: string) => `/rooms/host/${encodeURIComponent(gameId)}`
export const roomJoinPath = (pin: string) => `/join/${encodeURIComponent(pin)}`
export const liveArenaPresentationPath = (sessionId: string) =>
  `/presentation/${encodeURIComponent(sessionId)}`
export const liveArenaTeacherControlPath = (sessionId: string) =>
  `/rooms/${encodeURIComponent(sessionId)}/control`

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
