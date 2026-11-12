import { Group, Image as KonvaImage } from 'react-konva'
import { ILLUSTRATION_SIZE, STAGE_WIDTH, illustrationGrid } from './mediaLayout'

interface QuestionIllustrationProps {
  /** Ảnh đã tải xong; chưa có (đang tải) thì không vẽ gì, chỗ trong bố cục đã được chừa sẵn. */
  image: HTMLImageElement | undefined
  y: number
  /** Số lần vẽ hình (câu đếm: "3 con vịt" vẽ 3 con trong cùng ô vuông). Mặc định 1. */
  count?: number
}

/** Ảnh minh hoạ vuông của câu hỏi, căn giữa canvas. Nhiều hình thì xếp lưới trong cùng ô (illustrationGrid), không đổi bố cục. */
export default function QuestionIllustration({ image, y, count = 1 }: QuestionIllustrationProps) {
  if (!image) return null
  return (
    <Group x={(STAGE_WIDTH - ILLUSTRATION_SIZE) / 2} y={y} listening={false}>
      {illustrationGrid(count).map((cell, i) => (
        <KonvaImage key={i} image={image} x={cell.x} y={cell.y} width={cell.size} height={cell.size} cornerRadius={count > 1 ? 6 : 16} />
      ))}
    </Group>
  )
}
