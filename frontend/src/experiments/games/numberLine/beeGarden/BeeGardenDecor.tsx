import { Ellipse, Group, Image } from 'react-konva'
import useImage from 'use-image'
import { DECORATION_LIMITS, type DecorationLayer, type DecorationReaction } from '../../../theme/themeTypes'
import { depthStyle } from './decorDepth'
import { MOTION_NAMES } from './gardenMotion'
import type { ReactiveNode } from './decorReactions'
import type { ResolvedDecoration } from './useResolvedDecorations'

/** Báo trẻ vừa chạm một vật có phản ứng (node Konva của vật và loại phản ứng). */
export type DecorationReactHandler = (node: ReactiveNode, reaction: DecorationReaction | undefined) => void

function Decoration({ item, width, height, onReact, offset }: { item: ResolvedDecoration; width: number; height: number; onReact?: DecorationReactHandler; offset: { x: number; y: number } }) {
  const [image] = useImage(item.src)
  if (!image) return null
  const x = item.x * width
  // Vật trên cỏ đứng trong dải cỏ sát đáy khung và đung đưa quanh gốc (đáy hình) như cây nấm; vật ở trời đặt theo tỉ lệ chiều cao và quay quanh tâm.
  const ground = item.layer === 'ground'
  // Độ sâu: vật xa nhỏ và nhạt, vật gần to và đậm; cỡ trong dữ liệu là cỡ khi ở gần nhất nên mọi ràng buộc vị trí vẫn đúng.
  const { scale, opacity, shadowOpacity } = depthStyle(item.depth)
  const size = item.size * scale
  const pivotY = ground ? size : size / 2
  const baseY = ground ? height - DECORATION_LIMITS.groundStripTop + item.y * DECORATION_LIMITS.groundStrip : item.y * height
  const reactive = onReact !== undefined && item.reaction !== undefined && item.reaction !== 'none'
  const handleTouch = (event: { target: unknown }) => onReact?.(event.target as ReactiveNode, item.reaction)
  const motion = { motionBaseX: x, motionBaseY: baseY, motionAmplitude: item.amplitude, motionSpeed: item.speed, motionPhase: item.phase ?? 0 }
  return (
    <>
      {ground && (
        // Bóng đổ mềm dưới chân vật trên cỏ: chỉ trôi theo vật khi vật trôi ngang (đung đưa quanh gốc thì bóng đứng yên).
        <Ellipse
          name={MOTION_NAMES.decoration}
          x={x}
          y={baseY - size * 0.04}
          radiusX={size * 0.38}
          radiusY={size * 0.1}
          fill="#1F3A12"
          opacity={shadowOpacity}
          motionKind={item.motion === 'drift' ? 'drift' : 'still'}
          {...motion}
          listening={false}
        />
      )}
      <Image
        name={MOTION_NAMES.decoration}
        image={image}
        x={x}
        y={baseY}
        width={size}
        height={size}
        offsetX={size / 2}
        offsetY={pivotY}
        opacity={opacity}
        motionKind={item.motion}
        {...motion}
        reactY={0}
        reactRot={0}
        motionBaseOpacity={opacity}
        motionFade={ground ? 0 : 1}
        motionOffX={offset.x}
        motionOffY={offset.y}
        // Chỉ vật có phản ứng mới nhận chạm; chạm vào đó KHÔNG phải trả lời (không tới ô vườn bên dưới) và không đưa ong đi.
        listening={reactive}
        onClick={reactive ? handleTouch : undefined}
        onTap={reactive ? handleTouch : undefined}
      />
    </>
  )
}

interface GardenDecorationsProps {
  items: readonly ResolvedDecoration[]
  layer: DecorationLayer
  /** Khung cảnh (đơn vị thiết kế): `x`, `y` của vật là tỉ lệ của hai số này. */
  width: number
  height: number
  /** Có thì các vật có `reaction` nhận chạm và gọi hàm này; bỏ trống (xem lại bài, giảm chuyển động) thì mọi vật không nhận chạm. */
  onReact?: DecorationReactHandler
  /** Độ lệch của nhóm trang trí so với hệ toạ độ chú ong (để tính khoảng cách tới ong khi nhường chỗ); mặc định 0. */
  offset?: { x: number; y: number }
}

/**
 * Vật trang trí một tầng. Mặc định không nhận chạm (`listening` tắt) nên không bao giờ chặn vùng chạm của hoa, ong hay nút;
 * chỉ khi có `onReact` thì vật có phản ứng mới nhận chạm (bóng đổ không bao giờ nhận chạm).
 */
export function GardenDecorations({ items, layer, width, height, onReact, offset = { x: 0, y: 0 } }: GardenDecorationsProps) {
  return (
    <Group listening={onReact !== undefined}>
      {items
        .filter((item) => item.layer === layer)
        .map((item, index) => (
          <Decoration key={`${item.keyword}-${index}`} item={item} width={width} height={height} onReact={onReact} offset={offset} />
        ))}
    </Group>
  )
}
