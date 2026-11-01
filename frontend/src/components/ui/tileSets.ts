// Các bộ ô chữ/số cho LetterTiles, theo màu từng môn (màu định nghĩa trong index.css).
// Chuỗi class viết đủ để Tailwind nhìn thấy khi quét mã nguồn.

export interface Tile {
  glyph: string
  className: string
}

export const MATH_TILES: ReadonlyArray<Tile> = [
  { glyph: '1', className: 'bg-math-soft text-math-ink border-math-mark' },
  { glyph: '2', className: 'bg-white text-math-ink border-math-mark' },
  { glyph: '3', className: 'bg-math-soft text-math-ink border-math-mark' },
]

export const VIET_TILES: ReadonlyArray<Tile> = [
  { glyph: 'A', className: 'bg-viet-soft text-viet-ink border-viet-mark' },
  { glyph: 'Ă', className: 'bg-white text-viet-ink border-viet-mark' },
  { glyph: 'Â', className: 'bg-viet-soft text-viet-ink border-viet-mark' },
]

export const ENG_TILES: ReadonlyArray<Tile> = [
  { glyph: 'A', className: 'bg-eng-soft text-eng-ink border-eng-mark' },
  { glyph: 'B', className: 'bg-white text-eng-ink border-eng-mark' },
  { glyph: 'C', className: 'bg-eng-soft text-eng-ink border-eng-mark' },
]

// Bộ ô tổng hợp ba môn, dùng khi chưa nói tới môn cụ thể (màn đăng nhập, trạng thái trống).
export const MIXED_TILES: ReadonlyArray<Tile> = [
  { glyph: '1', className: 'bg-math-soft text-math-ink border-math-mark' },
  { glyph: 'A', className: 'bg-viet-soft text-viet-ink border-viet-mark' },
  { glyph: 'B', className: 'bg-eng-soft text-eng-ink border-eng-mark' },
  { glyph: '2', className: 'bg-white text-math-ink border-math-mark' },
]
