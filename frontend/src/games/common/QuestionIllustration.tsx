import { Image as KonvaImage } from 'react-konva'
import { ILLUSTRATION_SIZE, STAGE_WIDTH } from './mediaLayout'

interface QuestionIllustrationProps {
  /** Ảnh đã tải xong; chưa có (đang tải) thì không vẽ gì, chỗ trong bố cục đã được chừa sẵn. */
  image: HTMLImageElement | undefined
  y: number
}

/** Ảnh minh hoạ vuông của câu hỏi, căn giữa canvas. */
export default function QuestionIllustration({ image, y }: QuestionIllustrationProps) {
  if (!image) return null
  return (
    <KonvaImage
      image={image}
      width={ILLUSTRATION_SIZE}
      height={ILLUSTRATION_SIZE}
      x={(STAGE_WIDTH - ILLUSTRATION_SIZE) / 2}
      y={y}
      cornerRadius={16}
    />
  )
}
