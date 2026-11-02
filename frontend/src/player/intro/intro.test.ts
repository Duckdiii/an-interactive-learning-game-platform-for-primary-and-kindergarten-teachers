import { describe, expect, it } from 'vitest'
import BeIntro from './BeIntro'
import { INTROS } from './index'
import StudentIntro from './StudentIntro'

describe('INTROS', () => {
  it('mỗi khung đúng một màn vào, không khóa thừa', () => {
    expect(INTROS.be).toBe(BeIntro)
    expect(INTROS.hocSinh).toBe(StudentIntro)
    expect(Object.keys(INTROS).sort()).toEqual(['be', 'hocSinh'])
  })
})
