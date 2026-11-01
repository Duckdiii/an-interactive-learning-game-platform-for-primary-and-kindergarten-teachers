import { Group, Rect, Text } from 'react-konva'
import { STAGE_WIDTH } from './mediaLayout'
import { useGamePalette } from './useGamePalette'

interface ConfirmButtonProps {
  y: number
  label?: string
  width?: number
  height?: number
  enabled: boolean
  onPress: () => void
}

/**
 * Nút «Xong rồi!» chuẩn cho các game nhiều phần tử (Matching, Drag & Drop, Word Scramble).
 * Touch target tối thiểu 64px theo quy ước UX trẻ nhỏ (mặc định cao 72px, rộng 260px).
 */
export default function ConfirmButton({
  y,
  label = 'Xong rồi!',
  width = 260,
  height = 72,
  enabled,
  onPress,
}: ConfirmButtonProps) {
  const palette = useGamePalette()
  const handlePress = enabled ? onPress : undefined

  return (
    <Group x={(STAGE_WIDTH - width) / 2} y={y} onClick={handlePress} onTap={handlePress}>
      <Rect
        width={width}
        height={height}
        cornerRadius={20}
        fill={enabled ? palette.primary : palette.disabledFill}
        stroke={enabled ? palette.primaryStrong : palette.disabledStroke}
        strokeWidth={3}
      />
      <Text
        text={label}
        fontSize={28}
        fontStyle="bold"
        fill={enabled ? palette.primaryInk : palette.disabledInk}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}
