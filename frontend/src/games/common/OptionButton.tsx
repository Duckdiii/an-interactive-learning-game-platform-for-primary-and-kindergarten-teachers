import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import type { TextChoice } from '../../types/game-dsl.types'
import { resolveAssetUrl } from '../../utils/assetResolver'
import { useGamePalette } from './useGamePalette'
import { OPTION_BUTTON_HEIGHT, OPTION_BUTTON_WIDTH, optionPosition } from './optionGrid'

interface OptionButtonProps {
  option: TextChoice
  index: number
  /** Toạ độ y của mép trên lưới đáp án; do renderer tính để lưới không đè lên phần phía trên. */
  originY: number
  isSelected: boolean
  /** true khi đã khoá VÀ đây là đáp án đúng — luôn tô để trẻ học, bất kể có chọn hay không. */
  isCorrect: boolean
  locked: boolean
  onClick: () => void
}

/**
 * Ô đáp án dạng chữ và/hoặc hình ảnh minh họa vector OpenMoji, vẽ bằng Konva. Kích thước 340x200px.
 * Tự động gắn Visual Association vector từ Asset Bank nếu có tương ứng với chữ đáp án.
 */
export default function OptionButton({
  option,
  index,
  originY,
  isSelected,
  isCorrect,
  locked,
  onClick,
}: OptionButtonProps) {
  const palette = useGamePalette()
  const { x, y } = optionPosition(index, originY)

  // Tự động tìm hình ảnh minh họa vector liên tưởng (Visual Association)
  const optionImageUrl = (option as unknown as { imageUrl?: string }).imageUrl || resolveAssetUrl(option.text)
  const [image] = useImage(optionImageUrl ?? '')
  const hasImage = Boolean(optionImageUrl && image)

  // Sai: KHÔNG dùng đỏ gắt — chỉ tô vàng nhẹ để biết đã chọn. Đúng: luôn tô xanh để trẻ học được.
  const fill = locked && isCorrect ? palette.correctFill : locked && isSelected ? palette.wrongFill : palette.surface

  const ICON_SIZE = 48
  const ICON_PAD = 16
  const textX = hasImage ? ICON_PAD + ICON_SIZE + 12 : 0
  const textWidth = hasImage ? OPTION_BUTTON_WIDTH - textX - ICON_PAD : OPTION_BUTTON_WIDTH

  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick}>
      <Rect
        width={OPTION_BUTTON_WIDTH}
        height={OPTION_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={fill}
        stroke={palette.outline}
        strokeWidth={3}
      />
      {hasImage && image ? (
        <KonvaImage
          image={image}
          x={ICON_PAD}
          y={(OPTION_BUTTON_HEIGHT - ICON_SIZE) / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
          cornerRadius={10}
          listening={false}
        />
      ) : null}
      <Text
        text={option.text}
        fontSize={28}
        fontStyle="bold"
        x={textX}
        width={textWidth}
        height={OPTION_BUTTON_HEIGHT}
        align={hasImage ? 'left' : 'center'}
        verticalAlign="middle"
        padding={hasImage ? 4 : 16}
        fill={palette.ink}
        listening={false}
      />
    </Group>
  )
}
