import { Group, Rect, Text } from 'react-konva'
import { useTheme } from '../../experiments/theme/useTheme'
import type { TextChoice } from '../../types/game-dsl.types'
import { OPTION_BUTTON_HEIGHT, OPTION_BUTTON_WIDTH, optionPosition } from './optionGrid'
import { optionFill } from './optionTheme'

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
 * Ô đáp án dạng chữ, vẽ bằng Konva. Kích thước 340x200px — lớn hơn nhiều so với vùng chạm tối
 * thiểu 64px đã chốt, phù hợp trẻ mầm non/lớp 1 thao tác chưa chính xác.
 * Dùng chung cho các renderer dạng "chọn 1 trong nhiều đáp án chữ" (Quiz, OddOneOut sau này).
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
  const { colors } = useTheme()
  const { x, y } = optionPosition(index, originY)
  const fill = optionFill(colors, { locked, isCorrect, isSelected })

  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick}>
      <Rect
        width={OPTION_BUTTON_WIDTH}
        height={OPTION_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={fill}
        stroke={colors.border}
        strokeWidth={3}
      />
      <Text
        text={option.text}
        fontSize={28}
        fontStyle="bold"
        fill={colors.text}
        width={OPTION_BUTTON_WIDTH}
        height={OPTION_BUTTON_HEIGHT}
        align="center"
        verticalAlign="middle"
        padding={16}
        listening={false}
      />
    </Group>
  )
}
