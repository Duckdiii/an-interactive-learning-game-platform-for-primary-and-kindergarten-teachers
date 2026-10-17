import { Group, Rect, Text } from 'react-konva'
import { STAGE_WIDTH } from '../common/mediaLayout'
import { CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH } from './matchingLayout'
import { useTheme } from '../../experiments/theme/useTheme'

interface MatchingConfirmButtonProps {
  y: number
  label: string
  /** Tắt khi chưa nối đủ cặp hoặc đang chấm: vẫn hiện để trẻ biết còn bước cuối, nhưng không bấm được. */
  enabled: boolean
  onPress: () => void
}

/** Nút «Xong rồi!» lớn (96px) nộp bài sau khi nối đủ mọi cặp. Màu xanh dương: xanh lá dành cho «đúng». */
export default function MatchingConfirmButton({ y, label, enabled, onPress }: MatchingConfirmButtonProps) {
  const { colors } = useTheme()
  const press = enabled ? onPress : undefined
  return (
    <Group x={(STAGE_WIDTH - CONFIRM_BUTTON_WIDTH) / 2} y={y} onClick={press} onTap={press}>
      <Rect
        width={CONFIRM_BUTTON_WIDTH}
        height={CONFIRM_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={enabled ? colors.accent : colors.disabledSurface}
        stroke={enabled ? colors.accentBorder : colors.disabledBorder}
        strokeWidth={3}
      />
      <Text
        text={label}
        fontSize={32}
        fontStyle="bold"
        fill={enabled ? colors.onAccent : colors.onDisabled}
        width={CONFIRM_BUTTON_WIDTH}
        height={CONFIRM_BUTTON_HEIGHT}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}
