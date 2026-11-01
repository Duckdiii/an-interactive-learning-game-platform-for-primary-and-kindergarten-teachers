import { describe, expect, it } from 'vitest'
import { PROFILES } from '../profile/profiles'
import { interactionRules } from './interaction'

describe('interactionRules', () => {
  it('khung Bé: không đếm giờ, gợi ý sau hintAfterMs, chạm là chấm, thời gian chặn ở giới hạn câu', () => {
    const rules = interactionRules(PROFILES.be)

    expect(rules.countdownSeconds(30)).toBeNull()
    expect(rules.hintDelayMs).toBe(PROFILES.be.interaction.hintAfterMs)
    expect(rules.hintDelayMs).not.toBeNull()
    expect(rules.autoSubmitWhenComplete).toBe(true)
    expect(rules.timeSpentMs(120_000, 30)).toBe(30_000)
    expect(rules.timeSpentMs(5_000, 30)).toBe(5_000)
  })

  it('khung Học sinh: đếm giờ theo giới hạn câu, không gợi ý, có nút xác nhận, thời gian thật', () => {
    const rules = interactionRules(PROFILES.hocSinh)

    expect(rules.countdownSeconds(30)).toBe(30)
    expect(rules.hintDelayMs).toBeNull()
    expect(rules.autoSubmitWhenComplete).toBe(false)
    expect(rules.timeSpentMs(120_000, 30)).toBe(120_000)
  })
})
