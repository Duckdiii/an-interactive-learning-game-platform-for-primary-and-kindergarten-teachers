/** Bản build thật luôn dùng API thật; ngoài PROD thì theo cờ nhóm mô phỏng `editor`. */
export function choosePublishSettingsApiKind(isProd: boolean, groupMocked: boolean): 'mock' | 'real' {
  return !isProd && groupMocked ? 'mock' : 'real'
}
