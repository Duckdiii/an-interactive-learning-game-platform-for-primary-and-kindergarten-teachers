import type Konva from 'konva'
import { useRef } from 'react'
import { Arc, Circle, Group, Line, Rect, Text } from 'react-konva'
import { useTheme } from '../../../theme/useTheme'
import { ChunkyButton } from './BeeGardenArt'
import { BADGE_NUMBER_FONT_SIZE, type LayoutBox } from './beeGardenGeometry'
import { MOTION_NAMES } from './gardenMotion'
import { gardenUi, shade } from './gardenUi'
import { useGardenFont } from './useGardenFont'
import { useStaticCache } from './useStaticCache'

/**
 * Các vật giao diện nằm TRONG cảnh: bảng gỗ đề bài, huy hiệu số lớn, nút nghe lại. Cùng quy tắc nét với nút (viền dày `strokes.ui`, bóng nổi
 * `strokes.uiShadow`), khác với cảnh (viền mảnh, không bóng): giao diện nổi lên trên cảnh. Màu lấy từ `theme.hud`/`gardenUi`.
 * Mọi thứ ở đây nhận chạm (không tắt `listening`) để chạm lên bảng hay huy hiệu KHÔNG bị tính là chạm vườn và không đưa ong đi.
 */

interface HudSignProps {
  box: LayoutBox
  /** Hộp chữ (toạ độ sân): chữ đề bài căn giữa trong hộp này. */
  textBox: { x: number; y: number; width: number; height: number }
  text: string
  fontSize: number
  /** Độ dài dây treo (từ mép trên bảng lên mép trên cảnh). */
  ropeLength: number
}

/** Bảng gỗ treo hai dây từ mép trên của cảnh, có vân gỗ và bốn đinh; chữ đề bài nhỏ hơn con số trên huy hiệu. */
export function HudSign({ box, textBox, text, fontSize, ropeLength }: HudSignProps) {
  const ui = gardenUi(useTheme())
  const font = useGardenFont()
  const [x, y, width, height] = box
  const { signFace, signBorder, signInk } = ui.hud
  const { ui: strokeWidth, uiShadow: lift } = ui.strokes
  const radius = Math.min(26, height * 0.3)
  // Bảng gỗ (nhiều nét + chữ) là hình tĩnh: chụp một lần (kèm dây treo và bóng nổi) thay vì vẽ lại mỗi khung hình; chụp lại khi đổi chữ hoặc phông.
  const ref = useRef<Konva.Group>(null)
  useStaticCache(ref, width + 8, height + lift + ropeLength + 8, { x: -4, y: -ropeLength - 4, version: `${text}|${font}|${fontSize}|${width}|${height}` })
  return (
    <Group ref={ref} x={x} y={y}>
      {ropeLength > 0 && (
        <>
          <Line points={[width * 0.2, 0, width * 0.2, -ropeLength]} stroke={signBorder} strokeWidth={4} lineCap="round" listening={false} />
          <Line points={[width * 0.8, 0, width * 0.8, -ropeLength]} stroke={signBorder} strokeWidth={4} lineCap="round" listening={false} />
        </>
      )}
      <Rect y={lift} width={width} height={height} cornerRadius={radius} fill={shade(signBorder, 0.25)} />
      <Rect width={width} height={height} cornerRadius={radius} fill={signFace} stroke={signBorder} strokeWidth={strokeWidth} />
      <Line points={[radius, height * 0.3, width - radius, height * 0.3]} stroke={signBorder} strokeWidth={2} opacity={0.22} lineCap="round" listening={false} />
      <Line points={[radius, height * 0.72, width - radius, height * 0.72]} stroke={signBorder} strokeWidth={2} opacity={0.22} lineCap="round" listening={false} />
      {[
        [14, 14],
        [width - 14, 14],
        [14, height - 14],
        [width - 14, height - 14],
      ].map(([nx, ny], index) => (
        <Circle key={index} x={nx} y={ny} radius={4} fill={signBorder} opacity={0.7} listening={false} />
      ))}
      <Text
        text={text}
        x={textBox.x - x}
        y={textBox.y - y}
        width={textBox.width}
        height={textBox.height}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        fontStyle="bold"
        fontFamily={font}
        fill={signInk}
        ellipsis
        listening={false}
      />
    </Group>
  )
}

interface HudBadgeProps {
  box: LayoutBox
  value: string
}

/** Huy hiệu số lớn (con số đích): giọt mật ong tròn, chữ số rất lớn. Số nhiều chữ số thì co lại để vừa. */
export function HudBadge({ box, value }: HudBadgeProps) {
  const ui = gardenUi(useTheme())
  const font = useGardenFont()
  const [x, y, size] = box
  const { badgeFace, badgeBorder, badgeInk } = ui.hud
  const { ui: strokeWidth, uiShadow: lift } = ui.strokes
  const ref = useRef<Konva.Group>(null)
  useStaticCache(ref, size + 8, size + lift + 8, { x: -size / 2 - 4, y: -size / 2 - 4, version: `${value}|${font}|${size}` })
  const fontSize = value.length <= 1 ? BADGE_NUMBER_FONT_SIZE : value.length === 2 ? Math.round(BADGE_NUMBER_FONT_SIZE * 0.78) : Math.round(BADGE_NUMBER_FONT_SIZE * 0.58)
  return (
    <Group ref={ref} x={x + size / 2} y={y + size / 2}>
      <Circle y={lift} radius={size / 2} fill={shade(badgeBorder, 0.25)} />
      <Circle radius={size / 2} fill={badgeFace} stroke={badgeBorder} strokeWidth={strokeWidth} />
      <Circle radius={size / 2 - strokeWidth - 7} stroke={badgeBorder} strokeWidth={2} opacity={0.3} listening={false} />
      <Text
        text={value}
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        fontStyle="bold"
        fontFamily={font}
        fill={badgeInk}
        listening={false}
      />
    </Group>
  )
}

interface HudSpeakerProps {
  box: LayoutBox
  onPress: () => void
  /** Giọng đọc đang phát: loa rung nhẹ và ba vòng sóng sáng lần lượt (`gardenMotion`). */
  speaking: boolean
  /** Bật chuyển động. Tắt (giảm chuyển động) thì đang đọc vẫn hiện sóng ở dạng tĩnh. */
  animate: boolean
}

/**
 * Nút nghe lại: biểu tượng loa VẼ BẰNG KONVA (thân + một cung luôn hiện + ba cung sóng chớp khi đang đọc), màu mực đậm của nút để nhìn rõ là nút bấm được
 * (hình Fluent xám nhạt trông như bị vô hiệu). Mọi cung nằm gọn trong mặt nút. Luôn bấm được, không giới hạn số lần.
 */
export function HudSpeaker({ box, onPress, speaking, animate }: HudSpeakerProps) {
  const [x, y, size] = box
  return (
    <ChunkyButton x={x} y={y} width={size} height={size} tone="audio" disabled={false} onPress={onPress}>
      {(ink, font, faceHeight) => {
        const u = (faceHeight * 0.5) / 2 // nửa cạnh biểu tượng
        const cy = faceHeight * 0.38
        const arc = (radius: number, key: string | number, props: Record<string, unknown> = {}) => (
          <Arc key={key} x={0.3 * u} innerRadius={radius - 2} outerRadius={radius + 2} angle={90} rotation={-45} fill={ink} listening={false} {...props} />
        )
        return (
          <>
            <Group x={size / 2 - 0.35 * u} y={cy} name={MOTION_NAMES.speaker} listening={false}>
              <Line points={[-0.9 * u, -0.38 * u, -0.4 * u, -0.38 * u, 0.1 * u, -0.85 * u, 0.1 * u, 0.85 * u, -0.4 * u, 0.38 * u, -0.9 * u, 0.38 * u]} closed fill={ink} stroke={ink} strokeWidth={3} lineJoin="round" />
              {arc(0.62 * u, 'static')}
              {[0, 1, 2].map((index) =>
                arc((0.9 + 0.38 * index) * u, index, { name: MOTION_NAMES.wave, motionIndex: index, opacity: speaking && !animate ? 0.85 : 0 }),
              )}
            </Group>
            <Text
              text="Nghe lại"
              y={faceHeight * 0.68}
              width={size}
              align="center"
              fontSize={Math.round(size * 0.17)}
              fontStyle="bold"
              fontFamily={font}
              fill={ink}
              listening={false}
            />
          </>
        )
      }}
    </ChunkyButton>
  )
}
