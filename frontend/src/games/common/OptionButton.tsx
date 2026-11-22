import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import type { PresentationLayout, TextChoice } from '../../types/game-dsl.types'
import { bob, breathe, burstParticle, easeOutBack, progress, wiggle } from './motion'
import { colorWordOf, quantityPicture, singlePicture, type OptionObjectKind } from './optionVisual'
import { COLOR_WORD_FILLS, OPTION_OBJECT_FILLS } from './palette'
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
  /** Vật đại diện theo thế giới game. */
  kind?: OptionObjectKind
  /** Bố cục lưới đáp án và tổng số lựa chọn (để đặt ô lẻ cuối vào giữa). */
  layout?: PresentationLayout
  count?: number
  /** Đồng hồ hoạt ảnh (giây) và lúc bắt đầu phản hồi đúng/sai; 0 và null thì vẽ tĩnh. */
  time?: number
  reactedAt?: number | null
}

const CX = OPTION_BUTTON_WIDTH / 2
const CY = OPTION_BUTTON_HEIGHT / 2
const BURST = 8

/**
 * Lựa chọn vẽ thành một vật trong cảnh (bóng bay, bong bóng, hành tinh, quả, thẻ, cá, bông hoa) thay cho ô chữ, chữ đáp án nằm trên nhãn trắng viền đậm.
 * Đáp án là tên màu thì vật mang đúng màu đó; "3 con vịt" thì vẽ 3 con vịt. Giữ nguyên ô 340x200 và vị trí lưới nên bố cục không đổi.
 * Chỉ dùng Group/Rect/Text/Image (các test giả lập react-konva chỉ có những phần này).
 */
export default function OptionButton({
  option,
  index,
  originY,
  isSelected,
  isCorrect,
  locked,
  onClick,
  kind = 'balloon',
  layout = 'row',
  count = 0,
  time = 0,
  reactedAt = null,
}: OptionButtonProps) {
  const palette = useGamePalette()
  const { x, y } = optionPosition(index, originY, count, layout)
  const extra = option as unknown as { imageUrl?: string }

  const color = colorWordOf(option.text)
  const fill = color ? COLOR_WORD_FILLS[color] : OPTION_OBJECT_FILLS[index % OPTION_OBJECT_FILLS.length]
  const quantity = extra.imageUrl ? null : quantityPicture(option.text)
  const pictureUrl = extra.imageUrl || (quantity ? quantity.imageUrl : singlePicture(option.text))
  const [picture] = useImage(pictureUrl ?? '')

  const elapsed = reactedAt === null ? -1 : time - reactedAt
  const showCorrect = locked && isCorrect
  const showWrong = locked && isSelected && !isCorrect
  const pop = showCorrect ? easeOutBack(progress(elapsed, 0.5)) : 0
  const scale = breathe(time, index * 1.3) * (1 + 0.05 * pop)
  const offsetY = bob(time, index * 1.1) - 8 * pop
  const offsetX = showWrong ? wiggle(elapsed) : 0
  // Sai thì vật mờ đi một chút (không đỏ), đáp án đúng sáng viền vàng để trẻ học được.
  const opacity = locked && !isCorrect ? (showWrong ? 0.75 : 0.55) : 1

  const labelLong = option.text.length > 14
  const labelWidth = Math.min(OPTION_BUTTON_WIDTH - 20, Math.max(96, Math.ceil(option.text.length * (labelLong ? 13 : 18)) + 36))
  const labelHeight = labelLong ? 72 : 52
  const pictures = quantity ? Math.min(quantity.count, 10) : picture && pictureUrl ? 1 : 0
  const pictureSize = pictures > 4 ? 32 : pictures > 1 ? 36 : 56
  // Tối đa 4 hình mỗi hàng (4 x 36px) để nằm gọn trong thân vật rộng khoảng 150px.
  const perRow = Math.min(pictures, 4)
  const labelY = pictures > 0 ? 72 - labelHeight : -labelHeight / 2
  // Vòng vàng trên vật màu vàng khó thấy: đổi sang màu chính.
  const ringColor = color === 'yellow' ? palette.primary : palette.dotYellow
  // Hạt mừng chỉ vẽ trong lúc hiệu ứng chạy (giảm chuyển động: đồng hồ đứng ở 0 nên không vẽ, tránh hạt kẹt che chữ).
  const bursting = showCorrect && elapsed > 0 && elapsed < 0.9

  return (
    <Group x={x + CX + offsetX} y={y + CY + offsetY} onClick={onClick} onTap={onClick} opacity={opacity}>
      <Group scaleX={scale} scaleY={scale}>
        {showCorrect ? (
          <Rect x={-96} y={-96} width={192} height={184} cornerRadius={92} stroke={ringColor} strokeWidth={8} listening={false} />
        ) : null}
        {/* Câu về màu: bong bóng gần như đặc, không để nền xuyên qua làm sai màu (đỏ trên cát hóa cam). */}
        <ObjectShape kind={kind} fill={fill} outline={palette.outline} highlight={palette.surface} solid={color !== null} />
        {pictures > 0 && picture
          ? Array.from({ length: pictures }, (_, i) => {
              const row = Math.floor(i / perRow)
              const inRow = Math.min(perRow, pictures - row * perRow)
              const col = i % perRow
              return (
                <KonvaImage
                  key={i}
                  image={picture}
                  x={(col - (inRow - 1) / 2) * (pictureSize + 4) - pictureSize / 2}
                  y={-70 + row * (pictureSize + 4)}
                  width={pictureSize}
                  height={pictureSize}
                  listening={false}
                />
              )
            })
          : null}
        <Rect
          x={-labelWidth / 2}
          y={labelY}
          width={labelWidth}
          height={labelHeight}
          cornerRadius={labelHeight / 2}
          fill={palette.surface}
          stroke={palette.ink}
          strokeWidth={3}
          listening={false}
        />
        <Text
          text={option.text}
          x={-labelWidth / 2}
          y={labelY}
          width={labelWidth}
          height={labelHeight}
          align="center"
          verticalAlign="middle"
          fontSize={labelLong ? 20 : 26}
          fontStyle="bold"
          padding={8}
          fill={palette.ink}
          listening={false}
        />
      </Group>
      {bursting
        ? Array.from({ length: BURST }, (_, i) => {
            const p = burstParticle(i, BURST, elapsed, 0.9, 96)
            return (
              <Rect
                key={`burst-${i}`}
                x={p.x}
                y={p.y}
                width={14}
                height={14}
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

/** Thân vật, tâm ở (0, 0), cao khoảng 190px (vừa ô 200px kể cả lúc nhấp nhô). */
function ObjectShape({ kind, fill, outline, highlight, solid }: { kind: OptionObjectKind; fill: string; outline: string; highlight: string; solid: boolean }) {
  if (kind === 'bubble') {
    return (
      <Group>
        <Rect x={-84} y={-84} width={168} height={168} cornerRadius={84} fill={fill} opacity={solid ? 0.95 : 0.45} stroke={fill} strokeWidth={5} />
        <Rect x={-56} y={-66} width={40} height={22} cornerRadius={11} fill={highlight} opacity={0.75} rotation={-25} />
      </Group>
    )
  }
  if (kind === 'planet') {
    return (
      <Group>
        <Rect x={-82} y={-82} width={164} height={164} cornerRadius={82} fill={fill} stroke={outline} strokeWidth={3} />
        <Rect x={-112} y={-14} width={224} height={28} cornerRadius={14} stroke={outline} strokeWidth={4} rotation={-12} opacity={0.6} />
        <Rect x={-50} y={-60} width={30} height={18} cornerRadius={9} fill={highlight} opacity={0.5} />
      </Group>
    )
  }
  if (kind === 'fruit') {
    // Quả tròn có cuống và lá.
    return (
      <Group>
        <Rect x={-3} y={-100} width={6} height={22} fill={outline} />
        <Rect x={4} y={-104} width={34} height={18} cornerRadius={9} fill={COLOR_WORD_FILLS.green} stroke={outline} strokeWidth={2} rotation={-20} />
        <Rect x={-82} y={-80} width={164} height={164} cornerRadius={82} fill={fill} stroke={outline} strokeWidth={3} />
        <Rect x={-54} y={-56} width={26} height={36} cornerRadius={13} fill={highlight} opacity={0.5} rotation={20} />
      </Group>
    )
  }
  if (kind === 'card') {
    // Thẻ bo góc có viền trong.
    return (
      <Group>
        <Rect x={-90} y={-86} width={180} height={172} cornerRadius={22} fill={fill} stroke={outline} strokeWidth={3} />
        <Rect x={-76} y={-72} width={152} height={144} cornerRadius={16} stroke={highlight} strokeWidth={4} opacity={0.7} />
      </Group>
    )
  }
  if (kind === 'fish') {
    // Thân cá bầu dục, đuôi hai vây chéo, mắt.
    return (
      <Group>
        <Rect x={64} y={-46} width={56} height={40} cornerRadius={10} fill={fill} stroke={outline} strokeWidth={3} rotation={30} />
        <Rect x={64} y={6} width={56} height={40} cornerRadius={10} fill={fill} stroke={outline} strokeWidth={3} rotation={-30} />
        <Rect x={-96} y={-70} width={176} height={140} cornerRadius={70} fill={fill} stroke={outline} strokeWidth={3} />
        <Rect x={-66} y={-34} width={18} height={18} cornerRadius={9} fill={outline} />
      </Group>
    )
  }
  if (kind === 'flower') {
    // Năm cánh hoa quanh nhị tròn.
    const petals = [0, 72, 144, 216, 288]
    return (
      <Group>
        {/* Xoay cả nhóm quanh tâm hoa (Rect tự xoay quanh góc trên-trái nên cánh sẽ văng ra ngoài ô). */}
        {petals.map((angle) => (
          <Group key={angle} rotation={angle}>
            <Rect x={-30} y={-92} width={60} height={84} cornerRadius={30} fill={fill} stroke={outline} strokeWidth={2} />
          </Group>
        ))}
        <Rect x={-50} y={-50} width={100} height={100} cornerRadius={50} fill={highlight} stroke={outline} strokeWidth={3} />
      </Group>
    )
  }
  // Bóng bay: thân bầu dục, nút thắt và sợi dây.
  return (
    <Group>
      <Rect x={-1} y={78} width={2} height={20} fill={outline} opacity={0.7} />
      <Rect x={-7} y={68} width={14} height={14} rotation={45} fill={fill} stroke={outline} strokeWidth={2} />
      <Rect x={-76} y={-88} width={152} height={160} cornerRadius={76} fill={fill} stroke={outline} strokeWidth={3} />
      <Rect x={-52} y={-70} width={26} height={40} cornerRadius={13} fill={highlight} opacity={0.5} rotation={18} />
    </Group>
  )
}
