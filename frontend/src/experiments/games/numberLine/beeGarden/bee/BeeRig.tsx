import type Konva from 'konva'
import type { Ref } from 'react'
import { Circle, Ellipse, Group, Line, Rect } from 'react-konva'
import { GARDEN_COLORS } from '../beeGardenColors'
import { BEE_SCALE } from '../beeGardenGeometry'
import { BEE_NAMES } from './beeMotion'
import { BEE_POSES, SHADOW_BASE_OPACITY, type BeeState } from './beePoses'

/**
 * Chú ong dạng cutout: mỗi bộ phận là một node Konva riêng có tên (thân + sọc, hai cánh, hai râu, mắt, miệng, má). Cánh vỗ, râu lắc, chớp mắt do
 * `applyBeeMotion` làm trên node mỗi khung hình; hình mắt/miệng đổi theo `state` (React vẽ lại chỉ khi đổi trạng thái). Dùng lại ở game khác chỉ cần
 * đưa `state` và vị trí; bộ chuyển động nền của game (`applyGardenMotion`) lo nhún, nhảy cẫng, lắc đầu và các bộ phận.
 */
export interface BeeRigProps {
  x: number
  /** y lúc nghỉ; nhún nhảy, ăn mừng và lắc đầu do bộ chuyển động cộng thêm lên node mỗi khung hình. */
  y: number
  state: BeeState
  /** Bán kính vùng bắt chạm (đơn vị thiết kế); luôn có, kể cả khi không kéo được. */
  hitRadius: number
  draggable: boolean
  onDragMove?: (x: number) => void
  onDragEnd?: (x: number) => void
  minX: number
  maxX: number
  /** Node Konva của ong, để chuyến bay điều khiển x/y bằng tween. */
  groupRef?: Ref<Konva.Group>
}

const INK = GARDEN_COLORS.beeStroke

/** Mắt vẽ quanh tâm (0, 0) của nhóm `eyes` đặt ở y = -6, để co theo chiều dọc (chớp mắt) mà không lệch tâm. */
function Eyes({ state }: { state: BeeState }) {
  const pose = BEE_POSES[state]
  if (pose.eyes === 'closed') {
    return (
      <>
        <Line points={[-24, 0, -16, 4, -8, 0]} tension={0.5} stroke={INK} strokeWidth={4} lineCap="round" />
        <Line points={[8, 0, 16, 4, 24, 0]} tension={0.5} stroke={INK} strokeWidth={4} lineCap="round" />
      </>
    )
  }
  if (pose.eyes === 'happy') {
    return (
      <>
        <Line points={[-24, 4, -16, -6, -8, 4]} tension={0.5} stroke={INK} strokeWidth={4} lineCap="round" />
        <Line points={[8, 4, 16, -6, 24, 4]} tension={0.5} stroke={INK} strokeWidth={4} lineCap="round" />
      </>
    )
  }
  const { left, right } = pose.pupil
  return (
    <>
      <Circle x={-16} radius={11} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
      <Circle x={16} radius={11} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
      <Circle x={left.x} y={left.y + 6} radius={5.5} fill={INK} />
      <Circle x={right.x} y={right.y + 6} radius={5.5} fill={INK} />
      <Circle x={left.x + 2} y={left.y + 6 - 2} radius={1.8} fill="#FFFFFF" />
      <Circle x={right.x + 2} y={right.y + 6 - 2} radius={1.8} fill="#FFFFFF" />
    </>
  )
}

function Mouth({ state }: { state: BeeState }) {
  switch (BEE_POSES[state].mouth) {
    case 'grin':
      return <Line points={[-12, 8, 0, 24, 12, 8]} tension={0.5} stroke={INK} strokeWidth={4} lineCap="round" />
    case 'o':
      return <Ellipse x={0} y={15} radiusX={5} radiusY={6.5} fill={INK} />
    case 'flat':
      return <Line points={[-7, 15, 0, 14, 7, 15]} tension={0.4} stroke={INK} strokeWidth={3.5} lineCap="round" />
    default:
      return <Line points={[-9, 10, 0, 18, 9, 10]} tension={0.6} stroke={INK} strokeWidth={3.5} lineCap="round" />
  }
}

/** Một râu: gốc ở thân, quay quanh gốc (nhóm tên `antenna`), đầu râu là chấm hồng. */
function Antenna({ side }: { side: -1 | 1 }) {
  return (
    <Group name={BEE_NAMES.antenna} motionSide={side} x={side * 14} y={-30} listening={false}>
      <Line points={[0, 0, side * 14, -26]} stroke={INK} strokeWidth={4} lineCap="round" />
      <Circle x={side * 14} y={-28} radius={6} fill="#FF9EB5" stroke={INK} strokeWidth={2.5} />
    </Group>
  )
}

export function BeeRig({ x, y, state, hitRadius, draggable, onDragMove, onDragEnd, minX, maxX, groupRef }: BeeRigProps) {
  return (
    <Group
      ref={groupRef}
      name={BEE_NAMES.root}
      motionRestY={y}
      scaleX={BEE_SCALE}
      scaleY={BEE_SCALE}
      x={x}
      y={y}
      draggable={draggable}
      onDragMove={(event) => {
        // Kẹp trong toạ độ của nút (không dùng dragBoundFunc: nó nhận toạ độ tuyệt đối đã nhân tỉ lệ sân).
        const node = event.target
        const clamped = Math.min(maxX, Math.max(minX, node.x()))
        node.x(clamped)
        node.y(y)
        onDragMove?.(clamped)
      }}
      onDragEnd={(event) => onDragEnd?.(event.target.x())}
    >
      {/* Vùng bắt chạm trong suốt, rộng 144 đơn vị: trẻ nhỏ không cần chạm trúng thân ong. */}
      <Circle radius={hitRadius / BEE_SCALE} fill="#000000" opacity={0.001} />
      <Ellipse name={BEE_NAMES.wing} x={-26} y={-34} radiusX={20} radiusY={30} rotation={-24} fill="rgba(255,255,255,0.88)" stroke="#8CCBF0" strokeWidth={3} listening={false} />
      <Ellipse name={BEE_NAMES.wing} x={26} y={-34} radiusX={20} radiusY={30} rotation={24} fill="rgba(255,255,255,0.88)" stroke="#8CCBF0" strokeWidth={3} listening={false} />
      <Antenna side={-1} />
      <Antenna side={1} />
      <Group
        listening={false}
        clipFunc={(ctx) => {
          ctx.beginPath()
          ctx.ellipse(0, 0, 44, 38, 0, 0, Math.PI * 2)
          ctx.closePath()
        }}
      >
        <Ellipse radiusX={44} radiusY={38} fill={GARDEN_COLORS.beeBody} />
        <Rect x={-46} y={14} width={92} height={10} fill={INK} />
        <Rect x={-46} y={30} width={92} height={10} fill={INK} />
      </Group>
      <Ellipse radiusX={44} radiusY={38} stroke={INK} strokeWidth={4} listening={false} />
      <Group listening={false}>
        <Group name={BEE_NAMES.eyes} y={-6}>
          <Eyes state={state} />
        </Group>
        <Circle x={-30} y={8} radius={7} fill="#FF9EB5" opacity={0.65} />
        <Circle x={30} y={8} radius={7} fill="#FF9EB5" opacity={0.65} />
        <Mouth state={state} />
      </Group>
    </Group>
  )
}

interface BeeShadowProps {
  x: number
  /** Toạ độ y của mặt đất dưới ong (bóng nằm cố định ở đây, chỉ trượt ngang theo ong). */
  y: number
  /** Nửa bề rộng bóng lúc ong nghỉ. */
  radius?: number
}

/**
 * Bóng đổ dưới ong: bầu dục mờ nằm trên mặt đất, trượt ngang theo ong; `applyBeeMotion` đặt x, cỡ và độ đục mỗi khung hình (bay càng cao bóng càng nhỏ và mờ).
 * Đặt TRƯỚC (dưới) hoa và ong trong cùng nhóm toạ độ. Không nhận chạm.
 */
export function BeeShadow({ x, y, radius = 34 }: BeeShadowProps) {
  return <Ellipse name={BEE_NAMES.shadow} x={x} y={y} radiusX={radius} radiusY={radius * 0.24} fill="#1F3A12" opacity={SHADOW_BASE_OPACITY} listening={false} />
}
