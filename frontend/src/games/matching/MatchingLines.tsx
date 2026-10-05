import { Line } from 'react-konva'

export interface MatchingLine {
  /** Khoá ổn định cho React. */
  key: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: string
  /** Nét đứt dùng cho đáp án đúng được hiện thêm sau khi chấm sai. */
  dashed?: boolean
}

/** Các đường nối giữa hai cột. Không nhận chạm để không chắn cú chạm vào thẻ. */
export default function MatchingLines({ lines }: { lines: MatchingLine[] }) {
  return (
    <>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={[line.from.x, line.from.y, line.to.x, line.to.y]}
          stroke={line.color}
          strokeWidth={8}
          lineCap="round"
          dash={line.dashed ? [16, 12] : undefined}
          listening={false}
        />
      ))}
    </>
  )
}
