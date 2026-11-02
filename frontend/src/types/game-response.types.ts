import type { GameDsl } from './game-dsl.types'

// Theo `GameResponse` trong docs/openapi/openapi.yaml: envelope DSL cộng ba trường do server quản lý (gameId, status,
// updatedAt). Bản nháp SPOT_THE_TARGET có thể thiếu `hitRegion` ở từng câu (giáo viên chạm ảnh để chọn sau).
export interface GameManagement {
  gameId: string
  // DRAFT hoặc PUBLISHED (giá trị lạ vẫn hiển thị được, xem constants/labels.ts).
  status: string
  // Thời điểm ISO 8601.
  updatedAt: string
}

export type GameResponse = GameDsl & GameManagement

// Thân của `PUT /games/{gameId}`: chỉ phần envelope DSL; id, status, updatedAt do server quản.
export type GameEnvelopeBody = GameDsl
