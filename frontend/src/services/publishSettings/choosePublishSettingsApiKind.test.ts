import { describe, expect, it } from 'vitest'
import { choosePublishSettingsApiKind } from './choosePublishSettingsApiKind'

describe('choosePublishSettingsApiKind', () => {
  it('PROD luôn real', () => {
    expect(choosePublishSettingsApiKind(true, true)).toBe('real')
    expect(choosePublishSettingsApiKind(true, false)).toBe('real')
  })

  it('ngoài PROD theo cờ nhóm', () => {
    expect(choosePublishSettingsApiKind(false, true)).toBe('mock')
    expect(choosePublishSettingsApiKind(false, false)).toBe('real')
  })
})
