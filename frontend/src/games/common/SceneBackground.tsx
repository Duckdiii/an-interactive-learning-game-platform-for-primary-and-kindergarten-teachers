import { Image as KonvaImage, Rect } from 'react-konva'
import useImage from 'use-image'
import { useTheme } from '../../player/theme/useTheme'
import { STAGE_WIDTH } from './mediaLayout'
import { useGamePalette } from './useGamePalette'

/** Nền thế giới game theo theme (ảnh phủ kín sân khấu) và hai đám mây trôi chậm cho cảnh có sức sống. Dùng chung cho các renderer. */
export default function SceneBackground({ height, time }: { height: number; time: number }) {
  const theme = useTheme()
  const palette = useGamePalette()
  const [image] = useImage(theme.bgUrl ?? '')
  const cover = image ? Math.max(STAGE_WIDTH / image.width, height / image.height) : 1
  const drift = (speed: number, offset: number) => ((time * speed + offset) % (STAGE_WIDTH + 240)) - 160
  return (
    <>
      {image ? (
        <KonvaImage
          image={image}
          width={image.width * cover}
          height={image.height * cover}
          x={(STAGE_WIDTH - image.width * cover) / 2}
          y={(height - image.height * cover) / 2}
          listening={false}
        />
      ) : null}
      <Rect x={drift(14, 80)} y={18} width={150} height={44} cornerRadius={22} fill={palette.surface} opacity={0.8} listening={false} />
      <Rect x={drift(9, 520)} y={56} width={110} height={34} cornerRadius={17} fill={palette.surface} opacity={0.7} listening={false} />
    </>
  )
}

/** Bảng trắng mờ sau câu hỏi để chữ luôn đọc rõ trên nền cảnh. */
export function QuestionPanel({ y, height }: { y: number; height: number }) {
  const palette = useGamePalette()
  return <Rect x={24} y={y - 8} width={STAGE_WIDTH - 48} height={height + 16} cornerRadius={20} fill={palette.surface} opacity={0.92} listening={false} />
}
