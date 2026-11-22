import { describe, expect, it } from 'vitest'
import { burstParticle, easeOutBack, progress, wiggle } from './motion'
import { colorWordOf, illustrationCount, wordCardText, objectKindForTheme, quantityPicture, singlePicture } from './optionVisual'

describe('colorWordOf', () => {
  it.each([
    ['Red', 'red'],
    ['màu đỏ', 'red'],
    ['Xanh dương', 'blue'],
    ['xanh lá cây', 'green'],
    ['Màu vàng', 'yellow'],
    ['Green', 'green'],
  ])('"%s" là màu %s', (text, color) => {
    expect(colorWordOf(text)).toBe(color)
  })

  it.each(['quả cam chín ngọt lắm', 'Con mèo', 'cảm ơn', 'cái đèn', '5000 m', 'Con mèo đen', 'quả cam', 'Red apple', 'Con cá vàng', 'xanh'])('"%s" không phải tên màu', (text) => {
    expect(colorWordOf(text)).toBeNull()
  })
})

describe('quantityPicture', () => {
  it('"3 con vịt" vẽ 3 con vịt', () => {
    expect(quantityPicture('3 con vịt')).toEqual({ count: 3, imageUrl: '/assets/animals/duck.svg' })
  })

  it.each(['50 m', '5000 m', '3 kg', '7 m 5 cm', '12 quả táo', '0 con mèo', 'con vịt'])('"%s" không hình hóa', (text) => {
    expect(quantityPicture(text)).toBeNull()
  })
})

describe('singlePicture', () => {
  it('tên một con vật thì có hình, có số thì không', () => {
    expect(singlePicture('Con mèo')).toBe('/assets/animals/cat.svg')
    expect(singlePicture('5 con mèo')).toBeNull()
    expect(singlePicture('Số 5')).toBeNull()
  })
})

describe('objectKindForTheme', () => {
  it('đại dương là bong bóng, vũ trụ là hành tinh, còn lại bóng bay', () => {
    expect(objectKindForTheme('ocean')).toBe('bubble')
    expect(objectKindForTheme('space')).toBe('planet')
    expect(objectKindForTheme('farm')).toBe('balloon')
    expect(objectKindForTheme(undefined)).toBe('balloon')
  })
})

describe('motion', () => {
  it('easeOutBack đi từ 0 tới 1 và vượt nhẹ ở giữa', () => {
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
    expect(Math.max(...[0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1)
  })

  it('wiggle tắt hẳn sau thời gian hiệu ứng và không vượt biên độ', () => {
    expect(wiggle(-0.1)).toBe(0)
    expect(wiggle(0.95)).toBe(0)
    for (let t = 0; t < 0.9; t += 0.05) expect(Math.abs(wiggle(t))).toBeLessThanOrEqual(10)
  })

  it('hạt mừng mờ dần và biến mất ở cuối', () => {
    expect(burstParticle(0, 6, 0.9).opacity).toBe(0)
    expect(burstParticle(0, 6, -1).opacity).toBe(0)
    expect(progress(5, 0)).toBe(1)
  })
})

describe('illustrationCount', () => {
  it('câu đếm vẽ đủ số con theo mô tả hình khi ảnh là hình tự động của vật đó', () => {
    expect(illustrationCount('3 con vịt vàng đang bơi dưới ao', '/assets/animals/duck.svg')).toBe(3)
  })

  it('ảnh khác hình tự động, mô tả không có số hoặc thiếu ảnh thì vẽ một lần', () => {
    expect(illustrationCount('3 con vịt', '/uploads/anh-cua-co.png')).toBe(1)
    expect(illustrationCount('Con vịt bơi dưới ao', '/assets/animals/duck.svg')).toBe(1)
    expect(illustrationCount(undefined, '/assets/animals/duck.svg')).toBe(1)
    expect(illustrationCount('3 con vịt', undefined)).toBe(1)
  })
})

describe('quantityPicture với số viết bằng chữ', () => {
  it('"Ba con vịt" cũng vẽ 3 con như "3 con vịt" (lỗi thật ở thử nghiệm lần 5)', () => {
    expect(quantityPicture('Ba con vịt')?.count).toBe(3)
    expect(quantityPicture('Hai con vịt')?.imageUrl).toBe(quantityPicture('2 con vịt')?.imageUrl)
    expect(illustrationCount('Năm con vịt', quantityPicture('5 con vịt')?.imageUrl)).toBe(5)
  })

  it('chữ trùng nghĩa khác không bị coi là số lượng', () => {
    expect(quantityPicture('năm học mới')).toBeNull()
    expect(quantityPicture('ba mẹ')).toBeNull()
  })
})

describe('wordCardText', () => {
  it('nhận ra lựa chọn là thẻ chữ và trả lại đúng chữ cần hiện', () => {
    expect(wordCardText('Thẻ chữ bàn')).toBe('bàn')
    expect(wordCardText('thẻ chữ khăn.')).toBe('khăn')
    expect(wordCardText('Tấm thẻ chữ "cân"')).toBe('cân')
    expect(wordCardText('thẻ từ quả bóng')).toBe('quả bóng')
    expect(wordCardText('chữ sân')).toBe('sân')
  })

  it('lấy chữ trong ngoặc khi AI viết kiểu "Từ c... (cân)" (lỗi thật ở thử nghiệm lần 4)', () => {
    expect(wordCardText('Từ c... (cân)')).toBe('cân')
    expect(wordCardText('Từ kh... (khăn)')).toBe('khăn')
    expect(wordCardText('Từ c… (cân)')).toBe('cân')
    expect(wordCardText('Từ điển (nhỏ)')).toBeNull()
  })

  it('mô tả hình bình thường không phải thẻ chữ', () => {
    expect(wordCardText('Con rắn')).toBeNull()
    expect(wordCardText('Quả nhãn chín')).toBeNull()
    expect(wordCardText('Tiếng chuông reo')).toBeNull()
    expect(wordCardText('Chữ cái A')).toBeNull()
    expect(wordCardText('Từ điển')).toBeNull()
    expect(wordCardText(undefined)).toBeNull()
  })
})
