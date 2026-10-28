import { isMock } from '../../config/mockMode'
import { choosePublishSettingsApiKind } from './choosePublishSettingsApiKind'
import type { PublishSettingsApi } from './PublishSettingsApi'
import { RealPublishSettingsApi } from './realPublishSettingsApi'

export { PublishSettingsNotSupportedError } from './PublishSettingsApi'
export type { PublishSettings, PublishSettingsApi } from './PublishSettingsApi'

export async function getPublishSettingsApi(): Promise<PublishSettingsApi> {
  // Điều kiện PROD viết thẳng ở đây để Vite loại cả chunk mô phỏng khỏi bản build thật.
  if (!import.meta.env.PROD && choosePublishSettingsApiKind(import.meta.env.PROD, isMock('editor')) === 'mock') {
    const { MockPublishSettingsApi } = await import('./mockPublishSettingsApi')

    return new MockPublishSettingsApi()
  }

  return new RealPublishSettingsApi()
}
