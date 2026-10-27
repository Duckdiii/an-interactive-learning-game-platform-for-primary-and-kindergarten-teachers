export const ROUTES = {
  dashboard: '/dashboard',
  createGame: '/games/new',
  login: '/login',
  register: '/register',
  workspace: '/workspace',
  workspaceEditor: '/workspace/editor',
  // Trang học sinh (không đăng nhập): mở bằng mã chia sẻ hoặc mã QR.
  play: '/play/:shareCode',
  join: '/join',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
