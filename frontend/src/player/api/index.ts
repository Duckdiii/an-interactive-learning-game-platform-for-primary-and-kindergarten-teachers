import { isMock } from '../../config/mockMode'
import { choosePlayerApiKind } from './choosePlayerApiKind'
import type { PlayerApi } from './PlayerApi'
import { RealPlayerApi } from './realPlayerApi'

export { PlayerApiNotSupportedError } from './PlayerApi'
export type { PlayerApi } from './PlayerApi'

let mockInstance: PlayerApi | undefined
let realInstance: PlayerApi | undefined

/** `VITE_PLAYER_API=mock|real` quyết định; bỏ trống thì theo nhóm mô phỏng `sessions` của `VITE_USE_MOCK` (bật khi `npm run dev`). Bản build thật luôn dùng API thật. */
export async function getPlayerApi(): Promise<PlayerApi> {
  const kind = choosePlayerApiKind({
    isProd: import.meta.env.PROD,
    setting: (import.meta.env.VITE_PLAYER_API as string | undefined)?.trim().toLowerCase(),
    sessionsMocked: isMock('sessions'),
  })

  // Điều kiện PROD viết thẳng ở đây để Vite loại cả nhánh lẫn chunk mô phỏng (có đáp án mẫu) khỏi bản build thật.
  if (!import.meta.env.PROD && kind === 'mock') {
    const { MockPlayerApi } = await import('./mockPlayerApi')

    return (mockInstance ??= new MockPlayerApi())
  }

  return (realInstance ??= new RealPlayerApi())
}
