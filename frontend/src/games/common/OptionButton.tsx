import { Group, Rect, Text } from 'react-konva'
import type { TextChoice } from '../../types/game-dsl.types'

export const OPTION_BUTTON_WIDTH = 340
export const OPTION_BUTTON_HEIGHT = 200
const GAP = 40
const START_X = 40
const START_Y = 150
const COLS = 2

interface OptionButtonProps {
  option: TextChoice
  index: number
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
export default function OptionButton({ option, index, isSelected, isCorrect, locked, onClick }: OptionButtonProps) {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  const x = START_X + col * (OPTION_BUTTON_WIDTH + GAP)
  const y = START_Y + row * (OPTION_BUTTON_HEIGHT + GAP)

  // Sai: KHÔNG dùng đỏ gắt — chỉ tô vàng nhẹ để biết đã chọn. Đúng: luôn tô xanh để trẻ học được.
  const fill = locked && isCorrect ? '#A5D6A7' : locked && isSelected ? '#FFE082' : '#FFFFFF'

  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick}>
      <Rect
        width={OPTION_BUTTON_WIDTH}
        height={OPTION_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={fill}
        stroke="#334155"
        strokeWidth={3}
      />
      <Text
        text={option.text}
        fontSize={28}
        fontStyle="bold"
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
