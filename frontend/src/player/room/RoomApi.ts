import type { GameResponse } from '../../types/game-response.types'
import type { PublishInfo, StudentGame } from '../../types/game-student.types'
import type { StudentRoomClient, TeacherRoomClient } from './RoomClient'

export interface HostedRoom {
  pin: string
  teacher: TeacherRoomClient
  close: () => void
}

export interface JoinedRoom {
  client: StudentRoomClient
  leave: () => void
}

export interface FoundRoom {
  info: PublishInfo
  game: StudentGame
}

/** Tạo và vào phòng, phần trước khi có kết nối thời gian thực (`POST /games/{id}/sessions`, `GET /sessions/by-code`, `POST /sessions/{id}/join`). */
export interface RoomApi {
  open(game: GameResponse): Promise<HostedRoom>
  /** Không có phòng thì `null`, để `/join` thử tiếp mã chia sẻ. */
  findByPin(pin: string): Promise<FoundRoom | null>
  /** Ném `RoomJoinError` khi phòng đóng, đã bắt đầu hoặc đủ người. */
  join(pin: string, nickname: string): Promise<JoinedRoom>
}
