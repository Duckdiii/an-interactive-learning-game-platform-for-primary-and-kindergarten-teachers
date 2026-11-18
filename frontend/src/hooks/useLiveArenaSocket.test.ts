import { describe, expect, it } from 'vitest'
import { resolveLiveArenaWsUrl } from './useLiveArenaSocket'

describe('useLiveArenaSocket', () => {
  describe('resolveLiveArenaWsUrl', () => {
    it('ghép đúng endpoint ws/live-arena kèm token query', () => {
      const url = resolveLiveArenaWsUrl('jwt-sample-token')
      expect(url).toContain('/ws/live-arena?token=jwt-sample-token')
    })

    it('tạo url không có token query khi token rỗng hoặc null', () => {
      const url = resolveLiveArenaWsUrl(null)
      expect(url).toContain('/ws/live-arena')
      expect(url).not.toContain('?token=')
    })
  })
})
