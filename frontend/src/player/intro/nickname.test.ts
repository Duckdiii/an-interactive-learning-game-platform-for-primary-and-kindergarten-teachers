import { describe, expect, it } from 'vitest'
import { validateNickname } from './nickname'

describe('validateNickname', () => {
  it('"Bé An" dạng NFC và NFD đều hợp lệ, value là NFC', () => {
    for (const raw of ['Bé An', 'Bé An'.normalize('NFD')]) {
      expect(validateNickname(raw)).toEqual({ ok: true, value: 'Bé An'.normalize('NFC') })
    }
  })

  it('20 ký tự có dấu hợp lệ (kể cả NFD dài hơn 20 đơn vị), 21 thì tooLong', () => {
    const twenty = 'ế'.repeat(20)

    expect(validateNickname(twenty).ok).toBe(true)
    expect(validateNickname(twenty.normalize('NFD')).ok).toBe(true)
    expect(twenty.normalize('NFD').length).toBeGreaterThan(20)
    expect(validateNickname('ế'.repeat(21))).toEqual({ ok: false, reason: 'tooLong' })
  })

  it('chỉ khoảng trắng thì empty; trim hai đầu', () => {
    expect(validateNickname('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(validateNickname('')).toEqual({ ok: false, reason: 'empty' })
    expect(validateNickname('  Sao Băng  ')).toEqual({ ok: true, value: 'Sao Băng' })
  })
})
