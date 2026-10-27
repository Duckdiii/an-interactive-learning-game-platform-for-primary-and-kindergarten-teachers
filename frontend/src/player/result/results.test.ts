import { describe, expect, it } from 'vitest'
import BeResult from './BeResult'
import { RESULTS } from './index'
import StudentResult from './StudentResult'

describe('RESULTS', () => {
  it('mỗi khung đúng một màn kết quả', () => {
    expect(RESULTS.be).toBe(BeResult)
    expect(RESULTS.hocSinh).toBe(StudentResult)
    expect(Object.keys(RESULTS).sort()).toEqual(['be', 'hocSinh'])
  })
})
