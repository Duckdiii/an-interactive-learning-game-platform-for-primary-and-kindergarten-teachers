// Hình bìa mặc định của thẻ game khi chưa có ảnh: ba ô chữ nghiêng nhẹ theo môn học, màu lấy từ bảng màu ở index.css.
// Chỉ để trang trí (aria-hidden); tên môn đã có trong chữ của thẻ.

import { subjectTheme } from './subjectTheme'

// Góc xoay và vị trí của ba ô, cố định để hình luôn giống nhau giữa các lần hiển thị.
const TILE_LAYOUT = [
  { x: 36, y: 56, rotate: -7 },
  { x: 124, y: 46, rotate: 3 },
  { x: 212, y: 58, rotate: -4 },
]

export default function SubjectCover({ subject }: { subject: string }) {
  const theme = subjectTheme(subject)

  return (
    <div className={`aspect-[16/9] ${theme.cover}`} aria-hidden="true">
      <svg
        viewBox="0 0 320 180"
        className={`h-full w-full ${theme.mark}`}
        role="presentation"
      >
        {TILE_LAYOUT.map((tile, index) => (
          <g
            key={index}
            transform={`rotate(${tile.rotate} ${tile.x + 36} ${tile.y + 36})`}
          >
            <rect
              x={tile.x}
              y={tile.y}
              width="72"
              height="72"
              rx="18"
              fill="white"
              stroke="currentColor"
              strokeWidth="4"
            />
            <text
              x={tile.x + 36}
              y={tile.y + 52}
              textAnchor="middle"
              fontSize="42"
              fontWeight="800"
              fill="currentColor"
            >
              {theme.tiles[index]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
