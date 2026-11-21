import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import type { StudentImageOption } from '../../types/game-student.types'
import { useGamePalette } from '../common/useGamePalette'
import { wordCardText } from '../common/optionVisual'

interface OptionImageProps {
  option: StudentImageOption
  x: number
  y: number
  size: number
  imageInset?: number
  transparentBackground?: boolean
  state: 'idle' | 'selected' | 'correct' | 'wrong'
  disabled: boolean
  onSelect: () => void
}

export default function OptionImage({ option, x, y, size, imageInset = 8, transparentBackground = false, state, disabled, onSelect }: OptionImageProps) {
  const palette = useGamePalette()
  const border = { idle: palette.outline, selected: palette.audioStroke, correct: palette.audioVisualCorrectLine, wrong: palette.audioVisualWrongLine }
  // Lựa chọn chỉ có chữ ("Thẻ chữ cân", backend dặn AI viết vậy khi không có hình đúng nghĩa) hiện đúng chữ đó.
  const word = option.imageUrl ? null : wordCardText(option.visualPrompt)
  const imageUrl = option.imageUrl
  const [image, status] = useImage(imageUrl ?? '', 'anonymous')
  const loading = Boolean(imageUrl) && status === 'loading'
  const showImage = Boolean(imageUrl) && status === 'loaded' && image
  const imageWidth = image?.naturalWidth || image?.width || 1
  const imageHeight = image?.naturalHeight || image?.height || 1
  const contentSize = Math.max(0, size - imageInset * 2)
  const scale = Math.min(contentSize / imageWidth, contentSize / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return (
    <Group name={`avm-option-${option.id}`} x={x} y={y} onClick={disabled ? undefined : onSelect} onTap={disabled ? undefined : onSelect}>
      <Rect width={size} height={size} cornerRadius={16} fill={transparentBackground ? 'transparent' : palette.surface} stroke={border[state]} strokeWidth={state === 'idle' ? 2 : 4} />
      {showImage ? (
        <KonvaImage image={image} x={(size - width) / 2} y={(size - height) / 2} width={width} height={height} listening={false} />
      ) : word ? (
        <Text text={word} width={size} height={size} padding={8} align="center" verticalAlign="middle" fontSize={Math.round(size / 4)} fontStyle="bold" listening={false} />
      ) : (
        <Text text={loading ? 'Đang tải hình' : `🖼️ ${option.visualPrompt}`} width={size} height={size} padding={8} align="center" verticalAlign="middle" fontSize={22} listening={false} />
      )}
    </Group>
  )
}
