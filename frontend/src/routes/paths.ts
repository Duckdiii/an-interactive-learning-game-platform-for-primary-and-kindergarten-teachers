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
  roomJoin: '/join/:pin',
  // Trình chiếu trên tivi lớp (giáo viên, toàn màn hình, không có thanh bên).
  present: '/present/:gameId',
  // Mở phòng thi đấu từ một game; `/rooms/:sessionId` để dành cho phòng đã có phiên ở Backend.
  roomHost: '/rooms/host/:gameId',
} as const

export const presentPath = (gameId: string) => `/present/${encodeURIComponent(gameId)}`
export const roomHostPath = (gameId: string) => `/rooms/host/${encodeURIComponent(gameId)}`
export const roomJoinPath = (pin: string) => `/join/${encodeURIComponent(pin)}`

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
