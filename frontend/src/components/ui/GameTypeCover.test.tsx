import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GAME_TYPE_VALUES } from '../../constants/labels'
import GameTypeCover from './GameTypeCover'

const markup = (gameType: string, subject = 'MATH', compact = false) =>
  render(<GameTypeCover gameType={gameType} subject={subject} compact={compact} />).container.innerHTML

describe('GameTypeCover', () => {
  it('mỗi loại game trong API có một hình riêng, không loại nào dùng chung hình với loại khác', () => {
    const images = GAME_TYPE_VALUES.map((type) => markup(type))

    expect(new Set(images).size).toBe(GAME_TYPE_VALUES.length)
  })

  it('loại lạ (backend thêm sau) rơi về hình ô chữ theo môn, không vỡ', () => {
    const unknown = markup('NEW_TYPE')

    expect(unknown).toContain('svg')
    expect(GAME_TYPE_VALUES.map((type) => markup(type))).not.toContain(unknown)
  })

  it('đổi màu theo môn học, chỉ để trang trí (aria-hidden)', () => {
    const math = markup('QUIZ', 'MATH')
    const viet = markup('QUIZ', 'VIETNAMESE')

    expect(math).not.toBe(viet)
    expect(math).toContain('aria-hidden="true"')
    expect(math).toContain('role="presentation"')
  })

  it('bản gọn cho điện thoại chỉ lấy phần giữa của hình', () => {
    expect(markup('MATCHING', 'MATH', true)).toContain('viewBox="80 0 160 180"')
    expect(markup('MATCHING', 'MATH', false)).toContain('viewBox="0 0 320 180"')
  })
})
