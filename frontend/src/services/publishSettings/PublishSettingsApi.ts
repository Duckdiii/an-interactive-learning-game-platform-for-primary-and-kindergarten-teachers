import type { UiOverride } from '../../types/game-student.types'

// Cài đặt xuất bản mà Backend CHƯA có (đề xuất ở docs/ui/API-CONTRACT.md mục 2.2). Lưu ở thông tin xuất bản, không nằm trong JSON game.
export interface PublishSettings {
  uiOverride: UiOverride
  /** null = tự chọn theo môn học. */
  themeId: string | null
  /** false = tắt mã (học sinh nhận GAME_DISABLED). */
  enabled: boolean
  /** ISO 8601; null = mở không giới hạn. */
  expiresAt: string | null
}

export interface PublishSettingsApi {
  /** `GET /games/{gameId}` (các trường cài đặt xuất bản) */
  get(gameId: string): Promise<PublishSettings>
  /** `PUT /games/{gameId}/publish-settings` */
  update(gameId: string, settings: PublishSettings): Promise<PublishSettings>
}

/** Endpoint còn ở mức đề xuất: giao diện khóa hàng cài đặt kèm "Sắp có", không báo lỗi. */
export class PublishSettingsNotSupportedError extends Error {
  constructor(operation: string) {
    super(`Chưa hỗ trợ: Backend chưa cài endpoint "${operation}".`)
    this.name = 'PublishSettingsNotSupportedError'
  }
}
