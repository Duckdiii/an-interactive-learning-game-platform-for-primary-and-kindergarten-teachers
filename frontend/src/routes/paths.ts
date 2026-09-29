export const ROUTES = {
  dashboard: '/dashboard',
  createGame: '/games/new',
  login: '/login',
  register: '/register',
  workspace: '/workspace',
  workspaceEditor: '/workspace/editor',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
