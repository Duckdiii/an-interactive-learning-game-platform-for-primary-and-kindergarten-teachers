// Họa tiết đặc trưng của giao diện: những ô chữ/số nghiêng nhẹ như đồ chơi xếp hình của lớp học. Dùng ở màn đăng nhập,
// khối tạo game và trạng thái trống để cả sản phẩm cùng một "giọng", thay vì mỗi nơi một hình minh họa.
// Chỉ để trang trí nên aria-hidden.
import type { Tile } from './tileSets'

const SIZES = {
  md: 'h-14 w-14 rounded-2xl text-3xl',
  lg: 'h-20 w-20 rounded-3xl text-5xl',
} as const

const TILTS = ['-rotate-6', 'rotate-3', '-rotate-3', 'rotate-6']

export default function LetterTiles({
  tiles,
  size = 'md',
  className = '',
}: {
  tiles: ReadonlyArray<Tile>
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div aria-hidden="true" className={`flex items-end gap-3 ${className}`}>
      {tiles.map((tile, index) => (
        <span
          key={tile.glyph + index}
          className={[
            'grid shrink-0 place-items-center border-2 border-b-4 font-extrabold shadow-sm',
            SIZES[size],
            TILTS[index % TILTS.length],
            index % 2 === 1 ? '-translate-y-2' : '',
            tile.className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {tile.glyph}
        </span>
      ))}
    </div>
  )
}
