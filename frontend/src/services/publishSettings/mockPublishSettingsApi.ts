import { runMock } from '../mock/mockRuntime'
import type { PublishSettings, PublishSettingsApi } from './PublishSettingsApi'

const DEFAULTS: PublishSettings = { uiOverride: 'AUTO', themeId: null, enabled: true, expiresAt: null }

// Lưu theo gameId trong bộ nhớ của module (mất khi tải lại trang), như các mock khác.
const store = new Map<string, PublishSettings>()

export const resetMockPublishSettings = () => store.clear()

export class MockPublishSettingsApi implements PublishSettingsApi {
  get(gameId: string) {
    return runMock(() => ({ ...(store.get(gameId) ?? DEFAULTS) }))
  }

  update(gameId: string, settings: PublishSettings) {
    return runMock(() => {
      store.set(gameId, { ...settings })

      return { ...settings }
    })
  }
}
