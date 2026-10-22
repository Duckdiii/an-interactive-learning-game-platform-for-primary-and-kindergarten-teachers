import { describe, expect, it } from 'vitest'
import { buildKeywordIndex, exactKey, looseKey, type EmojiKeyword } from './keywordIndex'

const entry = (slug: string, name: string, aliases: string[] = []): EmojiKeyword => ({ slug, name, category: 'test', aliases })

const index = buildKeywordIndex([
  entry('cat-face', 'con mèo', ['meo', 'mèo', 'cat']),
  entry('honeybee', 'con ong', ['ong', 'bee']),
  entry('old-man', 'ông', ['grandfather']),
  entry('red-apple', 'quả táo', ['tao', 'apple']),
  entry('keycap-3', 'số 3', ['ba', 'three']),
  entry('old-woman', 'bà', ['grandmother']),
])

describe('chuẩn hóa', () => {
  it('exactKey: chữ thường, gộp khoảng trắng và dấu câu, giữ dấu tiếng Việt, về dạng NFC', () => {
    expect(exactKey('  Con   MÈO!! ')).toBe('con mèo')
    expect(exactKey('con-mèo_ ')).toBe('con mèo')
    expect(exactKey('mèo')).toBe('mèo') // dấu rời (NFD) được gộp
    expect(exactKey('')).toBe('')
    expect(exactKey('?!.')).toBe('')
  })
  it('looseKey: bỏ dấu, đ thành d, chữ hoa thành thường', () => {
    expect(looseKey('Đặt chú ong vào số')).toBe('dat chu ong vao so')
    expect(looseKey('MÈO')).toBe('meo')
    expect(looseKey('đồng hồ')).toBe('dong ho')
    expect(looseKey('Đ')).toBe('d')
  })
})

describe('khớp từ khóa', () => {
  it('khớp chính xác tên chính, bí danh có dấu, không dấu và tiếng Anh', () => {
    for (const query of ['con mèo', 'mèo', 'meo', 'cat', 'CAT', '  Cat  ', 'Con Mèo', 'cat face', 'cat-face']) {
      expect(index.find(query)?.entry.slug, query).toBe('cat-face')
    }
  })
  it('đúng dấu thắng không dấu: «ông» là người, «ong» là côn trùng', () => {
    expect(index.find('ông')).toMatchObject({ entry: { slug: 'old-man' }, kind: 'exact' })
    expect(index.find('ong')).toMatchObject({ entry: { slug: 'honeybee' }, kind: 'exact' })
    expect(index.find('ÔNG')?.entry.slug).toBe('old-man')
    expect(index.find('bà')?.entry.slug).toBe('old-woman')
    expect(index.find('ba')?.entry.slug).toBe('keycap-3')
  })
  it('gõ không dấu một từ có dấu thì khớp theo tầng không dấu', () => {
    expect(index.find('tao')).toMatchObject({ entry: { slug: 'red-apple' }, kind: 'exact' }) // «tao» là bí danh khai sẵn
    expect(index.find('qua tao')).toMatchObject({ entry: { slug: 'red-apple' }, kind: 'classifier' }) // bỏ «qua» rồi khớp bí danh «tao»
    expect(index.find('con meo')).toMatchObject({ entry: { slug: 'cat-face' }, kind: 'classifier' })
    const clock = buildKeywordIndex([entry('alarm-clock', 'đồng hồ báo thức')])
    expect(clock.find('dong ho bao thuc')).toMatchObject({ entry: { slug: 'alarm-clock' }, kind: 'loose' })
    expect(clock.find('con dong ho bao thuc')).toMatchObject({ entry: { slug: 'alarm-clock' }, kind: 'classifier' })
  })
  it('khớp chính xác (kể cả sau khi bỏ từ loại) thắng khớp không dấu: «nấm» không trôi sang «năm» (số 5)', () => {
    const idx = buildKeywordIndex([entry('keycap-5', 'số 5', ['nam', 'five']), entry('mushroom', 'cây nấm', ['mushroom'])])
    expect(idx.find('nấm')).toMatchObject({ entry: { slug: 'mushroom' }, kind: 'exact' }) // khóa suy ra từ «cây nấm»
    expect(idx.find('nam')?.entry.slug).toBe('keycap-5') // không dấu «nam» vẫn là số 5 (đã khai)
    expect(idx.find('cây nấm')).toMatchObject({ entry: { slug: 'mushroom' }, kind: 'exact' })
  })
  it('bỏ từ loại đứng đầu: «con cat», «quả apple», «cái gì» không bỏ khi không khớp', () => {
    expect(index.find('con cat')).toMatchObject({ entry: { slug: 'cat-face' }, kind: 'classifier' })
    expect(index.find('quả apple')).toMatchObject({ entry: { slug: 'red-apple' }, kind: 'classifier' })
    expect(index.find('chiếc cat')?.entry.slug).toBe('cat-face')
    expect(index.find('con rồng bay')).toBeNull()
  })
  it('từ loại đứng một mình không được bỏ thành rỗng', () => {
    expect(index.find('con')).toBeNull()
    expect(index.find('quả')).toBeNull()
  })
  it('không khớp thì null', () => {
    expect(index.find('khủng long')).toBeNull()
    expect(index.find('zzz')).toBeNull()
  })
  it('đầu vào lạ không ném lỗi: không phải chuỗi, rỗng, chỉ dấu câu', () => {
    for (const query of [undefined, null, 5, {}, [], '', '   ', '?!', Symbol('x')]) expect(index.find(query)).toBeNull()
  })
  it('khớp theo slug có gạch nối', () => {
    expect(index.find('red-apple')?.entry.slug).toBe('red-apple')
  })
})

describe('soát dữ liệu', () => {
  it('khóa chính xác trùng giữa hai mục khác nhau được liệt kê (mục đứng trước thắng)', () => {
    const dirty = buildKeywordIndex([entry('a', 'một', ['x']), entry('b', 'hai', ['x'])])
    expect(dirty.conflictingExactKeys()).toEqual(['x'])
    expect(dirty.find('x')?.entry.slug).toBe('a')
  })
  it('khóa không dấu mơ hồ được liệt kê', () => {
    const idx = buildKeywordIndex([entry('a', 'con bò'), entry('b', 'con bọ')])
    expect(idx.ambiguousLooseKeys()).toEqual(['con bo'])
    expect(idx.find('con bò')?.entry.slug).toBe('a') // đúng dấu vẫn đúng mục
    expect(idx.find('con bọ')?.entry.slug).toBe('b')
    expect(idx.find('con bo')?.entry.slug).toBe('a') // không dấu: mục đứng trước
  })
  it('cùng một mục lặp khóa không bị coi là va chạm', () => {
    const idx = buildKeywordIndex([entry('a', 'mèo', ['meo', 'mèo', 'MÈO'])])
    expect(idx.conflictingExactKeys()).toEqual([])
    expect(idx.ambiguousLooseKeys()).toEqual([])
  })
  it('chỉ mục rỗng hoạt động', () => {
    const idx = buildKeywordIndex([])
    expect(idx.size).toBe(0)
    expect(idx.find('mèo')).toBeNull()
  })
})
