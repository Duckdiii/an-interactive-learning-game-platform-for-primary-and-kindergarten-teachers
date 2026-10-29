export const ROUTES = {
  dashboard: '/dashboard',
  createGame: '/games/new',
  results: '/results',
  login: '/login',
  register: '/register',
  workspace: '/workspace',
  workspaceEditor: '/workspace/editor',
  // Trang học sinh (không đăng nhập): mở bằng mã chia sẻ hoặc mã QR.
  play: '/play/:shareCode',
  join: '/join',
  // Trình chiếu trên tivi lớp (giáo viên, toàn màn hình, không có thanh bên).
  present: '/present/:gameId',
} as const

export const presentPath = (gameId: string) => `/present/${encodeURIComponent(gameId)}`

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
