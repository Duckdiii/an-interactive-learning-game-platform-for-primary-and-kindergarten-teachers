/** Bản build thật luôn dùng API thật; ngoài PROD thì theo cờ nhóm mô phỏng tương ứng. */
export function chooseHomeApiKind(isProd: boolean, groupMocked: boolean): 'mock' | 'real' {
  return !isProd && groupMocked ? 'mock' : 'real'
}
