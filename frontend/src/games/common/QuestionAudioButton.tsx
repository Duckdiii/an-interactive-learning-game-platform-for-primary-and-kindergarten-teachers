import { Group, Rect, Text } from 'react-konva'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from './mediaLayout'
import { useTheme } from '../../experiments/theme/useTheme'

interface QuestionAudioButtonProps {
  /** Toạ độ y của mép trên nút; do renderer tính để nút không đè lên phần khác. */
  y: number
  onPress: () => void
}

/**
 * Nút «Nghe lại» câu hỏi, căn giữa canvas. Quy ước UX của dự án: audio prompt luôn có nút nghe lại,
 * không giới hạn số lần bấm, và vẫn bấm được sau khi đã trả lời.
 */
export default function QuestionAudioButton({ y, onPress }: QuestionAudioButtonProps) {
  const { colors } = useTheme()
  return (
    <Group x={(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2} y={y} onClick={onPress} onTap={onPress}>
      <Rect
        width={AUDIO_BUTTON_WIDTH}
        height={AUDIO_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={colors.audioSurface}
        stroke={colors.audioBorder}
        strokeWidth={3}
      />
      <Text
        text="🔊 Nghe lại"
        fontSize={30}
        fontStyle="bold"
        fill={colors.text}
        width={AUDIO_BUTTON_WIDTH}
        height={AUDIO_BUTTON_HEIGHT}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}
