import { describe, expect, it } from 'vitest'
import { passwordStrength } from './passwordStrength'

// Luật của Backend (RegisterRequest.java), dùng làm chuẩn: mức 3 khi và chỉ khi regex này khớp và không quá 72 byte.
const BACKEND = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/u
const backendAccepts = (p: string) => BACKEND.test(p) && new TextEncoder().encode(p).length <= 72

describe('passwordStrength', () => {
  it('7 ký tự là quá ngắn; 8 ký tự đủ 4 nhóm là đạt', () => {
    expect(passwordStrength('').level).toBe(0)
    expect(passwordStrength('Abc1!xy')).toMatchObject({ level: 0, label: 'Quá ngắn · ít nhất 8 ký tự' })
    expect(passwordStrength('Abc1!xyz')).toMatchObject({ level: 3, label: 'Đạt yêu cầu' })
  })

  it('nêu đúng nhóm còn thiếu; thiếu một nhóm là mức 2, thiếu từ hai nhóm là mức 1', () => {
    expect(passwordStrength('Abcd1234')).toMatchObject({ level: 2, label: 'Còn thiếu: ký tự đặc biệt' })
    expect(passwordStrength('abcd1234')).toMatchObject({ level: 1, label: 'Còn thiếu: chữ hoa (A–Z), ký tự đặc biệt' })
  })

  it('chữ có dấu không tính là chữ hoa/thường (như Backend): "Đườngđi1!" thiếu chữ hoa A–Z', () => {
    expect(passwordStrength('Đườngđi1!')).toMatchObject({ level: 2, label: 'Còn thiếu: chữ hoa (A–Z)' })
  })

  it('quá 72 ký tự hoặc quá 72 byte UTF-8 là không đạt', () => {
    expect(passwordStrength('Aa1!'.repeat(19))).toMatchObject({ level: 0, label: 'Quá dài · tối đa 72 ký tự' })
    // 30 ký tự nhưng 74 byte: Backend từ chối theo byte.
    const accented = 'Aa1!' + 'ế'.repeat(26)

    expect(new TextEncoder().encode(accented).length).toBeGreaterThan(72)
    expect(passwordStrength(accented).level).toBe(0)
  })

  it('mức 3 trùng khớp với luật Backend trên các mẫu biên', () => {
    const samples = ['Abc1!xyz', 'Abcd1234', 'abcd123!', 'ABCD123!', 'Abcdefg!', 'Đườngđi1!', 'Duongdi1!', 'Aa1!'.repeat(18), 'Aa1!'.repeat(18) + 'x', 'Aa1!ếếếế', 'Aa1 bcde']

    for (const sample of samples) expect(passwordStrength(sample).level === 3, sample).toBe(backendAccepts(sample))
  })
})
