import { Group, Rect, Text } from 'react-konva'
import { useGamePalette } from './useGamePalette'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from './mediaLayout'
import { useQuestionAudio } from './useQuestionAudio'

type QuestionAudioButtonProps = {
  /** Toạ độ y của mép trên nút; do renderer tính để nút không đè lên phần khác. */
  y: number
} & (
  | { onPress: () => void; audioUrl?: never; autoPlayOnMount?: never }
  | { onPress?: never; audioUrl?: string; autoPlayOnMount?: boolean }
)

/**
 * Nút «Nghe lại» câu hỏi, căn giữa canvas. Quy ước UX của dự án: audio prompt luôn có nút nghe lại,
 * không giới hạn số lần bấm, và vẫn bấm được sau khi đã trả lời.
 */
export default function QuestionAudioButton({ y, onPress, audioUrl, autoPlayOnMount }: QuestionAudioButtonProps) {
  const palette = useGamePalette()
  const playAudio = useQuestionAudio(audioUrl, { autoPlayOnMount: autoPlayOnMount ?? !onPress, html5: true })
  const handlePress = onPress ?? playAudio

  return (
    <Group x={(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2} y={y} onClick={handlePress} onTap={handlePress}>
      <Rect
        width={AUDIO_BUTTON_WIDTH}
        height={AUDIO_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={palette.audioFill}
        stroke={palette.audioStroke}
        strokeWidth={3}
      />
      <Text
        text="🔊 Nghe lại"
        fontSize={30}
        fontStyle="bold"
        width={AUDIO_BUTTON_WIDTH}
        height={AUDIO_BUTTON_HEIGHT}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}
