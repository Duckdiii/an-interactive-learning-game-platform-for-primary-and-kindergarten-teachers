import { useEffect } from 'react'
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import type { PairSide } from '../../types/game-dsl.types'
import type { Palette } from '../common/palette'
import { useGamePalette } from '../common/useGamePalette'
import { CARD_FONT_SIZE, CARD_IMAGE_SIZE, CARD_PADDING, cardTextWidth } from './matchingLayout'
import { sideDisplay } from './matchingView'

/**
 * - idle: chưa làm gì. selected: ô trái đang được chọn. linked: đã nối (viền theo màu cặp).
 * - correct / wrong: sau khi chấm (xanh / vàng nhẹ, tuyệt đối không dùng đỏ).
 */
export type MatchingCardState = 'idle' | 'selected' | 'linked' | 'correct' | 'wrong'

interface MatchingCardProps {
  x: number
  y: number
  width: number
  height: number
  content: PairSide
  state: MatchingCardState
  /** Màu viền của cặp (chỉ dùng khi `linked`/`selected`). */
  accent?: string
  onPress: () => void
  /**
   * Gọi khi ảnh của thẻ tải lỗi, để renderer tính lại chiều cao hàng: chữ dự phòng (`visualPrompt`) có thể
   * dài hơn chỗ đã chừa cho ảnh. Có thể được gọi lặp lại; người nhận cần bỏ qua lần trùng.
   */
  onImageFailed?: () => void
}

const fillOf = (palette: Palette): Record<MatchingCardState, string> => ({
  idle: palette.surface,
  selected: palette.selectedFill,
  linked: palette.surface,
  correct: palette.correctFill,
  wrong: palette.wrongFill,
})

/**
 * Một thẻ ở cột trái hoặc phải: chữ và/hoặc ảnh (ảnh bên trái, chữ bên phải). Cả thẻ là vùng chạm. Là
 * component riêng vì `useImage` là hook, không gọi được trong vòng lặp của renderer.
 */
export default function MatchingCard({
  x,
  y,
  width,
  height,
  content,
  state,
  accent,
  onPress,
  onImageFailed,
}: MatchingCardProps) {
  const palette = useGamePalette()
  const [image, imageStatus] = useImage(content.imageUrl ?? '')
  const imageFailed = imageStatus === 'failed'
  // Ảnh lỗi thì chữ dự phòng thay chỗ ảnh (xem `sideDisplay`) và báo renderer tính lại bố cục.
  const { text, hasImage } = sideDisplay(content, imageFailed)

  useEffect(() => {
    if (imageFailed) onImageFailed?.()
  }, [imageFailed, onImageFailed])

  const emphasised = state === 'selected' || state === 'linked'
  const textWidth = cardTextWidth(hasImage)
  const textX = hasImage ? CARD_PADDING + CARD_IMAGE_SIZE + CARD_PADDING : CARD_PADDING

  return (
    <Group x={x} y={y} onClick={onPress} onTap={onPress}>
      <Rect
        width={width}
        height={height}
        cornerRadius={20}
        fill={fillOf(palette)[state]}
        stroke={emphasised ? (accent ?? palette.outline) : palette.outline}
        strokeWidth={emphasised ? 8 : 4}
        shadowColor={palette.outline}
        shadowBlur={6}
        shadowOffset={{ x: 0, y: 3 }}
        shadowOpacity={0.12}
      />
      {hasImage && image && (
        <KonvaImage
          image={image}
          width={CARD_IMAGE_SIZE}
          height={CARD_IMAGE_SIZE}
          x={CARD_PADDING}
          y={(height - CARD_IMAGE_SIZE) / 2}
          cornerRadius={12}
          listening={false}
        />
      )}
      {text && (
        <Text
          text={text}
          fontSize={CARD_FONT_SIZE}
          fontStyle="bold"
          x={textX}
          y={CARD_PADDING}
          width={textWidth}
          height={height - 2 * CARD_PADDING}
          align={hasImage ? 'left' : 'center'}
          verticalAlign="middle"
          fill={palette.ink}
          wrap="word"
          listening={false}
        />
      )}
    </Group>
  )
}
