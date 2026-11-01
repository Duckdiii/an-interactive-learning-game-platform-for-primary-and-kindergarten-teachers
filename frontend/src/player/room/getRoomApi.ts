import { PlayerApiNotSupportedError } from '../api'
import type { RoomApi } from './RoomApi'

const realRoomApi: RoomApi = {
  open: () => Promise.reject(new PlayerApiNotSupportedError('openRoom')),
  findByPin: () => Promise.resolve(null),
  join: () => Promise.reject(new PlayerApiNotSupportedError('joinRoom')),
}

let mockInstance: RoomApi | undefined

/** Phòng chạy được khi nào: hiện chỉ bản dev (mô phỏng hai tab). Có Backend thì đổi hàm này cùng `getRoomApi`. */
export const isRoomAvailable = () => !import.meta.env.PROD

/** Điều kiện PROD viết thẳng ở đây để Vite loại mô phỏng phòng khỏi bản build thật (như `getPlayerApi`). */
export async function getRoomApi(): Promise<RoomApi> {
  if (!import.meta.env.PROD) {
    const { TabRoomApi } = await import('./tabRoomApi')

    return (mockInstance ??= new TabRoomApi())
  }

  return realRoomApi
}
