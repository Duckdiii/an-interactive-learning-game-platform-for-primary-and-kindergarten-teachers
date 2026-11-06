import type { CpfGame } from './cpf-game.types'
import type { GameDsl, GameType } from './game-dsl.types'

/**
 * Enum `GameType` của API (openapi.yaml): 10 loại DSL cộng `CUSTOM` (game CPF). `GameType` của DSL cố ý không có
 * `CUSTOM` (DSL v1.0.0 đóng băng), nên chỗ nhận giá trị từ API dùng kiểu này.
 */
export type ApiGameType = GameType | 'CUSTOM'

// Theo `GameResponse` trong docs/openapi/openapi.yaml: envelope DSL cộng ba trường do server quản lý (gameId, status,
// updatedAt). Bản nháp SPOT_THE_TARGET có thể thiếu `hitRegion` ở từng câu (giáo viên chạm ảnh để chọn sau).
export interface GameManagement {
  gameId: string
  // DRAFT hoặc PUBLISHED (giá trị lạ vẫn hiển thị được, xem constants/labels.ts).
  status: string
  // Thời điểm ISO 8601.
  updatedAt: string
}

/**
 * Nhánh DSL v1.0.0 của `GameResponse` (`DslGameResponse` trong openapi.yaml): 10 loại preset. Giữ tên cũ để không đổi
 * các chỗ đang dùng; `GameResponse` đầy đủ của API (gồm CPF) ở đây là `AnyGameResponse`.
 */
export type GameResponse = GameDsl & GameManagement

/** Nhánh CPF của `GameResponse` (`CpfGameResponse` trong openapi.yaml): game ngoài danh mục, nội dung nằm trong `cpf`. */
export interface CpfGameResponse extends GameManagement {
  gameType: 'CUSTOM'
  cpf: CpfGame
}

/** `GameResponse` đầy đủ của API: phân biệt bằng `gameType` (`CUSTOM` là CPF). */
export type AnyGameResponse = GameResponse | CpfGameResponse

export const isCpfGameResponse = (game: AnyGameResponse): game is CpfGameResponse => game.gameType === 'CUSTOM'

// Thân của `PUT /games/{gameId}`: chỉ phần envelope DSL; id, status, updatedAt do server quản.
export type GameEnvelopeBody = GameDsl

/** Thân của `PUT /games/{gameId}` cho game `CUSTOM`: nguyên game CPF (`CpfGameEnvelope`). */
export type CpfGameEnvelopeBody = CpfGame
