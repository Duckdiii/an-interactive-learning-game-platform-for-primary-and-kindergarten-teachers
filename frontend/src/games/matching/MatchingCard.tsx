import { useEffect } from 'react'
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import type { PairSide } from '../../types/game-dsl.types'
import { bob, burstParticle, easeOutBack, progress, wiggle } from '../common/motion'
import { quantityPicture } from '../common/optionVisual'
import { OPTION_OBJECT_FILLS, type Palette } from '../common/palette'
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
  /** Màu "thẻ đồ chơi" (viền và bóng) theo thứ tự thẻ. */
  colorIndex?: number
  /** Đồng hồ hoạt ảnh (giây) và lúc chấm xong; 0 và null thì vẽ tĩnh. */
  time?: number
  reactedAt?: number | null
}

const fillOf = (palette: Palette): Record<MatchingCardState, string> => ({
  idle: palette.surface,
  selected: palette.selectedFill,
  linked: palette.surface,
  correct: palette.correctFill,
  wrong: palette.wrongFill,
})

const BURST = 6

/**
 * Một thẻ ở cột trái hoặc phải, vẽ như thẻ đồ chơi: viền và bóng màu kẹo, ảnh nhấp nhô nhẹ ("3 con vịt" vẽ 3 con vịt nhỏ).
 * Thẻ chỉ nhô/nảy/lắc vài px trong lúc chọn hoặc ngay sau khi chấm (đường nối lệch tối đa khoảng 6px, rồi khớp lại); ảnh bên trong nhấp nhô nhẹ.
 * Là component riêng vì `useImage` là hook, không gọi được trong vòng lặp của renderer.
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
  colorIndex = 0,
  time = 0,
  reactedAt = null,
}: MatchingCardProps) {
  const palette = useGamePalette()
  const [image, imageStatus] = useImage(content.imageUrl ?? '')
  const imageFailed = imageStatus === 'failed'
  // Ảnh lỗi thì chữ dự phòng thay chỗ ảnh (xem `sideDisplay`) và báo renderer tính lại bố cục.
  const { text, hasImage } = sideDisplay(content, imageFailed)

  useEffect(() => {
    if (imageFailed) onImageFailed?.()
  }, [imageFailed, onImageFailed])

  const toy = OPTION_OBJECT_FILLS[colorIndex % OPTION_OBJECT_FILLS.length]
  const emphasised = state === 'selected' || state === 'linked'
  const textWidth = cardTextWidth(hasImage)
  const textX = hasImage ? CARD_PADDING + CARD_IMAGE_SIZE + CARD_PADDING : CARD_PADDING

  const elapsed = reactedAt === null ? -1 : time - reactedAt
  const pop = state === 'correct' ? easeOutBack(progress(elapsed, 0.5)) : 0
  const shake = state === 'wrong' ? wiggle(elapsed, 0.9, 6) : 0
  // Thẻ đang chọn nhô lên một chút để trẻ thấy mình đã chọn ô nào.
  const lift = state === 'selected' ? -6 : -4 * pop
  const bursting = state === 'correct' && elapsed > 0 && elapsed < 0.9

  // Chỉ nhân bản ảnh khi ảnh là hình tự động của "N con X"; ảnh giáo viên tự đặt luôn vẽ một lần.
  const quantity = text ? quantityPicture(text) : null
  const count = quantity && quantity.imageUrl === content.imageUrl ? Math.min(quantity.count, 9) : 1
  const perRow = count > 4 ? 3 : count > 1 ? 2 : 1
  const mini = count > 1 ? Math.floor((CARD_IMAGE_SIZE - (perRow - 1) * 3) / perRow) : CARD_IMAGE_SIZE
  const rows = Math.ceil(count / perRow)
  // Căn giữa khối hình nhỏ theo chiều dọc trong ô ảnh.
  const imageTop = (height - CARD_IMAGE_SIZE) / 2 + (count > 1 ? (CARD_IMAGE_SIZE - rows * (mini + 3) + 3) / 2 : 0) + bob(time, colorIndex * 1.4, 3)

  return (
    <Group x={x + shake} y={y + lift} onClick={onPress} onTap={onPress}>
      <Rect width={width} height={height} y={6} cornerRadius={20} fill={toy} listening={false} />
      <Rect
        width={width}
        height={height}
        cornerRadius={20}
        fill={fillOf(palette)[state]}
        stroke={emphasised ? (accent ?? toy) : toy}
        strokeWidth={emphasised ? 8 : 5}
      />
      {hasImage && image
        ? Array.from({ length: count }, (_, i) => (
            <KonvaImage
              key={i}
              image={image}
              width={mini}
              height={mini}
              x={CARD_PADDING + (i % perRow) * (mini + 3)}
              y={imageTop + Math.floor(i / perRow) * (mini + 3)}
              cornerRadius={count > 1 ? 4 : 12}
              listening={false}
            />
          ))
        : null}
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
      {bursting
        ? Array.from({ length: BURST }, (_, i) => {
            const p = burstParticle(i, BURST, elapsed, 0.9, 70)
            return (
              <Rect
                key={`burst-${i}`}
                x={width / 2 + p.x}
                y={height / 2 + p.y}
                width={12}
                height={12}
                cornerRadius={3}
                rotation={p.rotation}
                fill={OPTION_OBJECT_FILLS[i % OPTION_OBJECT_FILLS.length]}
                opacity={p.opacity}
                listening={false}
              />
            )
          })
        : null}
    </Group>
  )
}
