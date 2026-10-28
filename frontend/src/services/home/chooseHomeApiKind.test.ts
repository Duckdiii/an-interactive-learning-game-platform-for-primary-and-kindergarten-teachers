import { describe, expect, it } from 'vitest'
import { chooseHomeApiKind } from './chooseHomeApiKind'

describe('chooseHomeApiKind', () => {
  it('PROD luôn real', () => {
    expect(chooseHomeApiKind(true, true)).toBe('real')
    expect(chooseHomeApiKind(true, false)).toBe('real')
  })

  it('ngoài PROD theo cờ nhóm', () => {
    expect(chooseHomeApiKind(false, true)).toBe('mock')
    expect(chooseHomeApiKind(false, false)).toBe('real')
  })
})
