import { describe, expect, it } from 'vitest'
import { getSceneScale } from './visualClozeImageLayout'

describe('getSceneScale', () => {
  it('keeps a wide scene inside width and height using one scale', () => {
    expect(getSceneScale({ width: 1000, height: 600 }, { width: 500, height: 400 })).toBe(0.5)
  })

  it('fits a tall scene to the available height', () => {
    expect(getSceneScale({ width: 600, height: 1000 }, { width: 500, height: 400 })).toBe(0.4)
  })

  it('does not enlarge scenes beyond their source size', () => {
    expect(getSceneScale({ width: 300, height: 200 }, { width: 900, height: 800 })).toBe(1)
  })

  it('rejects invalid dimensions', () => {
    expect(getSceneScale({ width: 0, height: 10 }, { width: 100, height: 100 })).toBeNull()
    expect(getSceneScale({ width: 10, height: 10 }, { width: Number.NaN, height: 100 })).toBeNull()
  })
})
