import { useMemo } from 'react'
import { Circle, Group, Image, Line, Rect, Star } from 'react-konva'
import useImage from 'use-image'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import { fireflyPose, pollenPose, starPose, type Band } from './atmosphere'
import { MOTION_NAMES } from './gardenMotion'

/**
 * Các thành phần «không khí» của vườn (xem `atmosphere.ts` và biến thể thời điểm của theme): phấn hoa, sao, đom đóm, tia nắng, trăng, lớp phủ màu.
 * Mỗi hạt là một node Konva CÓ SẴN trong một bể cố định (số lượng theo dữ liệu theme, bị chặn bởi `ATMOSPHERE_LIMITS`); bộ chuyển động đặt lại vị trí và độ đục
 * mỗi khung hình theo thời gian, nên React không vẽ lại và không cấp phát thêm gì. Mọi thứ không nhận chạm. Giảm chuyển động: đứng yên ở dáng tại t = 0.
 */

/** Dải đặt hạt được lưu trên node (thuộc tính `motionBand`) để bộ chuyển động không cần biết bố cục. */
const bandProps = (band: Band) => ({ motionBand: [...band] })

interface FieldProps {
  count: number
  band: Band
}

/** Phấn hoa: chấm tròn nhỏ vàng nhạt trôi lên chậm. */
export function PollenField({ count, band }: FieldProps) {
  return (
    <Group listening={false}>
      {Array.from({ length: count }, (_, index) => {
        const pose = pollenPose(index, 0, band)
        return (
          <Circle
            key={index}
            name={MOTION_NAMES.pollen}
            motionIndex={index}
            {...bandProps(band)}
            x={pose.x}
            y={pose.y}
            radius={3}
            scaleX={pose.scale}
            scaleY={pose.scale}
            opacity={pose.opacity}
            fill="#FFF4B8"
          />
        )
      })}
    </Group>
  )
}

/** Sao nhấp nháy ban đêm: sao bốn cánh nhỏ màu vàng nhạt. */
export function StarField({ count, band }: FieldProps) {
  return (
    <Group listening={false}>
      {Array.from({ length: count }, (_, index) => {
        const pose = starPose(index, 0, band)
        return (
          <Star
            key={index}
            name={MOTION_NAMES.star}
            motionIndex={index}
            {...bandProps(band)}
            x={pose.x}
            y={pose.y}
            numPoints={4}
            innerRadius={2}
            outerRadius={7}
            scaleX={pose.scale}
            scaleY={pose.scale}
            opacity={pose.opacity}
            fill="#FFF8D6"
          />
        )
      })}
    </Group>
  )
}

/** Đom đóm: chấm sáng vàng xanh có quầng mờ (gradient vẽ sẵn, không dùng bộ lọc mỗi khung hình), lượn chậm và sáng tắt theo nhịp riêng. */
export function Fireflies({ count, band }: FieldProps) {
  return (
    <Group listening={false}>
      {Array.from({ length: count }, (_, index) => {
        const pose = fireflyPose(index, 0, band)
        return (
          <Circle
            key={index}
            name={MOTION_NAMES.firefly}
            motionIndex={index}
            {...bandProps(band)}
            x={pose.x}
            y={pose.y}
            radius={11}
            scaleX={pose.scale}
            scaleY={pose.scale}
            opacity={pose.opacity}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={11}
            fillRadialGradientColorStops={[0, 'rgba(255,248,170,1)', 0.35, 'rgba(214,255,120,0.75)', 1, 'rgba(214,255,120,0)']}
          />
        )
      })}
    </Group>
  )
}

interface BeamsProps {
  /** Tâm thiên thể (toạ độ cảnh), nơi các chùm tia toả ra. */
  x: number
  y: number
  /** Số chùm tia; mỗi chùm quét lệch pha nhau. */
  count?: number
}

/**
 * Tia nắng quét nhẹ: vài hình nêm mờ toả sang trái và xuống từ thiên thể, trắng ấm mờ dần theo chiều dài (gradient tuyến tính vẽ sẵn). Cả nhóm xoay ±4° chậm
 * (`beamSweep`). Không dùng bộ lọc nào nên không tốn khi vẽ lại.
 */
export function LightBeams({ x, y, count = 3 }: BeamsProps) {
  const angles = [-14, 8, 30]
  return (
    <Group x={x} y={y} listening={false}>
      {Array.from({ length: count }, (_, index) => (
        <Group key={index} name={MOTION_NAMES.beam} motionIndex={index}>
          <Line
            rotation={angles[index % angles.length] + 180}
            points={[0, 0, 330, -34, 330, 34]}
            closed
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 330, y: 0 }}
            fillLinearGradientColorStops={[0, 'rgba(255,250,214,0.34)', 1, 'rgba(255,250,214,0)']}
          />
        </Group>
      ))}
    </Group>
  )
}

/** Trăng: hình Fluent «mặt trăng» qua `resolveImage`, có quầng sáng dịu phía sau (gradient vẽ sẵn). */
export function Moon({ x, y }: { x: number; y: number }) {
  const src = useMemo(() => resolveImage('mặt trăng').src, [])
  const [image] = useImage(src)
  return (
    <Group x={x} y={y} listening={false}>
      <Circle
        radius={92}
        opacity={0.55}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={28}
        fillRadialGradientEndRadius={92}
        fillRadialGradientColorStops={[0, 'rgba(230,238,255,0.9)', 1, 'rgba(230,238,255,0)']}
      />
      {image && <Image image={image} x={-46} y={-46} width={92} height={92} />}
    </Group>
  )
}

/** Lớp phủ màu lên trời, mây và đồi (chồng thường, một hình chữ nhật): đổi không khí mà không đụng tới hoa, số và chú ong vẽ phía trên. */
export function SkyTint({ width, height, color, opacity }: { width: number; height: number; color: string; opacity: number }) {
  if (opacity <= 0) return null
  return <Rect width={width} height={height} fill={color} opacity={opacity} listening={false} />
}
