import { PublishSettingsNotSupportedError } from './PublishSettingsApi'
import type { PublishSettingsApi } from './PublishSettingsApi'

// Endpoint còn đề xuất (API-CONTRACT 2.2). Khi Backend cài xong, thay bằng lời gọi axiosInstance.
export class RealPublishSettingsApi implements PublishSettingsApi {
  get(): Promise<never> {
    return Promise.reject(new PublishSettingsNotSupportedError('GET /games/{gameId} (cài đặt xuất bản)'))
  }

  update(): Promise<never> {
    return Promise.reject(new PublishSettingsNotSupportedError('PUT /games/{gameId}/publish-settings'))
  }
}
