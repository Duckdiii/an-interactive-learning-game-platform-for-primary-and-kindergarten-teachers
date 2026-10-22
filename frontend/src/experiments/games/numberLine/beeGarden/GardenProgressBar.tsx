import type Konva from 'konva'
import { useEffect, useMemo, useRef } from 'react'
import { Circle, Group, Image, Rect } from 'react-konva'
import useImage from 'use-image'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import { BeeFlight, BLOOM_TIMING } from './beeFlight'
import type { LayoutBox } from './beeGardenGeometry'
import { progressSlots } from './progressSlots'
import { flowerKeyword, PROGRESS_SEEDLING } from './gardenProgress'
import { konvaTweenFactory } from './konvaTween'

interface SlotProps {
  x: number
  y: number
  size: number
  /** Đã nở thành hoa. */
  filled: boolean
  index: number
  /** Bật hoạt ảnh «nở» khi vừa nở (tắt khi giảm chuyển động). */
  animate: boolean
  /** Màu quầng sáng sau hoa đã nở. */
  glow: string
}

/** Một ô: cây non (chưa nở) hoặc bông hoa (đã nở, có quầng sáng nhẹ); vừa nở thì phóng lên một nhịp rồi về. Không nhận chạm. */
function ProgressSlot({ x, y, size, filled, index, animate, glow }: SlotProps) {
  const seedling = useMemo(() => resolveImage(PROGRESS_SEEDLING).src, [])
  const flower = useMemo(() => resolveImage(flowerKeyword(index)).src, [index])
  const [seedImage] = useImage(seedling)
  const [flowerImage] = useImage(flower)
  const ref = useRef<Konva.Group>(null)
  const wasFilled = useRef(filled)
  useEffect(() => {
    const node = ref.current
    const justBloomed = filled && !wasFilled.current
    wasFilled.current = filled
    if (!justBloomed || !animate || !node) return
    const flight = new BeeFlight(konvaTweenFactory)
    flight.bounce(node, 1, 1.5, BLOOM_TIMING)
    return () => flight.cancel()
  }, [filled, animate])
  const image = filled ? flowerImage : seedImage
  return (
    <Group ref={ref} x={x} y={y} listening={false}>
      {filled && <Circle radius={size * 0.62} fill={glow} opacity={0.85} />}
      {image && <Image image={image} x={-size / 2} y={-size / 2} width={size} height={size} opacity={filled ? 1 : 0.7} />}
    </Group>
  )
}

interface GardenProgressBarProps {
  box: LayoutBox
  total: number
  /** Mỗi phần tử: `true` đúng ngay lần đầu (hoa nở), còn lại cây non. */
  filled: readonly boolean[]
  animate: boolean
  track: string
  border: string
  borderWidth: number
  glow: string
}

/**
 * Thanh tiến độ «vườn nở hoa» TRONG cảnh: một thanh bo tròn trên cùng, mỗi câu một ô cây non nở thành hoa khi đúng ngay lần đầu. Mỗi ô tự tô quầng sáng riêng
 * (không còn vạch tô theo số lượng che lên ô chưa nở). Bảng đề bài treo từ đáy thanh này. Không nhận chạm.
 */
export default function GardenProgressBar({ box, total, filled, animate, track, border, borderWidth, glow }: GardenProgressBarProps) {
  const slots = progressSlots(box, total)
  const [x, y, width, height] = slots.pill
  return (
    <Group listening={false}>
      <Rect x={x} y={y} width={width} height={height} cornerRadius={height / 2} fill={track} stroke={border} strokeWidth={borderWidth} />
      {slots.centers.map((cx, index) => (
        <ProgressSlot key={index} x={cx} y={slots.centerY} size={slots.icon} index={index} filled={filled[index] === true} animate={animate} glow={glow} />
      ))}
    </Group>
  )
}

interface ProgressFlyerProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  size: number
  index: number
  onDone: () => void
}

/** Bông hoa nhỏ bay từ hoa vừa chọn lên ô của nó trên thanh (tween chạy trực tiếp trên node, không qua React); bay xong thì gọi `onDone`. Chỉ dựng khi có chuyển động. */
export function ProgressFlyer({ from, to, size, index, onDone }: ProgressFlyerProps) {
  const [image] = useImage(resolveImage(flowerKeyword(index)).src)
  const ref = useRef<Konva.Image>(null)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    const node = ref.current
    if (!node || !image) return
    const flight = new BeeFlight(konvaTweenFactory)
    flight.start(node, { stops: [to.x], restY: to.y, arc: 24, hopSeconds: 0.9 }, { onArrive: () => undefined, onDone: () => done.current() })
    return () => flight.cancel()
    // chuyến bay chỉ khởi động một lần khi ảnh đã tải: `from`/`to` không đổi trong lúc bay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image])
  if (!image) return null
  return <Image ref={ref} image={image} x={from.x} y={from.y} width={size} height={size} offsetX={size / 2} offsetY={size / 2} listening={false} />
}
