import { isMock } from '../../config/mockMode'
import type { RoomApi } from './RoomApi'

let mockInstance: RoomApi | undefined

export const usesMockRoom = () => !import.meta.env.PROD && isMock('sessions')

/** The two-tab adapter is only loaded by the development room screens. */
export async function getRoomApi(): Promise<RoomApi> {
  if (!import.meta.env.PROD) {
    const { TabRoomApi } = await import('./tabRoomApi')
    return (mockInstance ??= new TabRoomApi())
  }
  throw new Error('Room simulator is unavailable')
}
