import type { Context } from 'konva/lib/Context'
import type { Shape as KonvaShape } from 'konva/lib/Shape'
import type Konva from 'konva'
import { useRef, useState, type Ref } from 'react'
import { Circle, Ellipse, Group, Line, Rect, RegularPolygon, Shape, Star, Text } from 'react-konva'
import {
  FLOWER_CENTER_FILL,
  FLOWER_CENTER_RADIUS,
  FLOWER_CENTER_STROKE,
  FLOWER_NUMBER_FILL,
  FLOWER_RADIUS,
  HILL_DESIGN_HEIGHT,
  GARDEN_BUSHES,
  HILL_PAD,
  PARALLAX,
  PARALLAX_NAME,
  GARDEN_CLOUDS,
  GARDEN_WIDTH,
  SUN_GLOW_RADIUS,
  SUN_X,
  SUN_Y,
  type CloudSpec,
  PETAL_STROKE,
  petalColor,
  type ConfettiParticle,
} from './beeGardenGeometry'
import { GARDEN_COLORS } from './beeGardenColors'
import { MOTION_NAMES } from './gardenMotion'
import { gardenUi } from './gardenUi'
import { useGardenFont } from './useGardenFont'
import { useTheme } from '../../../theme/useTheme'
import { TRAIL_SLOTS } from './sparkleTrail'
import { useStaticCache } from './useStaticCache'
import { overlayColor } from './atmosphere'
import { Fireflies, LightBeams, Moon, PollenField, SkyTint, StarField } from './BeeGardenAtmosphere'
import type { AmbienceVariant } from '../../../theme/themeTypes'

/** Đồi xa mờ nhẹ (bán kính làm mờ, điểm ảnh của ảnh đệm): làm mờ MỘT lần lúc chụp đệm. Dải trời đặt sao ban đêm. */
const FAR_HILL_BLUR = 2
/** Tỉ lệ độ đục lớp phủ áp lên đồi trước và bụi (so với trời và đồi sau). */
const FOREGROUND_TINT_SHARE = 0.85
const STAR_BAND = [0, 24, GARDEN_WIDTH, 190] as const

/** Đường bo góc cho `clipFunc`: cắt đồi cỏ theo khung vườn bo tròn. */
function roundedRectPath(ctx: Context, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

const CORNER = 28

/**
 * Bầu trời, mặt trời, mây, ba lớp đồi phía sau (xa, giữa) theo thứ tự từ sau ra trước. Vẽ ở toạ độ gốc là góc trên trái của vườn.
 * Hình tĩnh (nền trời, đồi) được chụp thành ảnh đệm một lần; chỉ mặt trời và mây (có chuyển động) vẽ lại mỗi khung hình.
 */
export function GardenBackdrop({ height, variant }: { height: number; variant?: AmbienceVariant }) {
  const skyRef = useRef<Konva.Group>(null)
  const farRef = useRef<Konva.Group>(null)
  const backRef = useRef<Konva.Group>(null)
  const skyTop = variant?.sky[0] ?? GARDEN_COLORS.skyTop
  const skyBottom = variant?.sky[1] ?? GARDEN_COLORS.skyBottom
  useStaticCache(skyRef, GARDEN_WIDTH, height, { version: `${skyTop}|${skyBottom}` })
  useStaticCache(farRef, GARDEN_WIDTH + 2 * HILL_PAD, height, { x: -HILL_PAD, blur: FAR_HILL_BLUR })
  useStaticCache(backRef, GARDEN_WIDTH + 2 * HILL_PAD, height, { x: -HILL_PAD })
  return (
    <Group clipFunc={(ctx) => roundedRectPath(ctx, 0, 0, GARDEN_WIDTH, height, CORNER)} listening={false}>
      <Group ref={skyRef}>
        <Rect
          width={GARDEN_WIDTH}
          height={height}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: height }}
          fillLinearGradientColorStops={[0, skyTop, 1, skyBottom]}
        />
      </Group>
      {/* Hàng đề bài chiếm phần trên cùng của trời: mặt trời và mây hạ xuống dưới hàng đó (mặt trời lấp ló sau nút nghe lại). */}
      {variant && variant.stars > 0 && <StarField count={variant.stars} band={STAR_BAND} />}
      {variant?.celestial === 'moon' ? <Moon x={SUN_X} y={SUN_Y + variant.celestialDrop - 30} /> : <Sun x={SUN_X} y={SUN_Y + (variant?.celestialDrop ?? 0)} />}
      {(variant?.beams ?? true) && variant?.celestial !== 'moon' && <LightBeams x={SUN_X} y={SUN_Y + (variant?.celestialDrop ?? 0)} />}
      {GARDEN_CLOUDS.map((cloud, index) => (
        <Cloud key={index} {...cloud} color={variant?.cloud.color ?? '#FFFFFF'} opacity={cloud.opacity * (variant?.cloud.opacity ?? 1)} />
      ))}
      {/* Đồi xa và đồi sau trượt ngược chiều ong một chút (thị sai, `applyGardenMotion`); mỗi lớp là một ảnh đệm riêng nên dịch chuyển không phải vẽ lại. */}
      <Group name={PARALLAX_NAME} parallaxBaseX={0} parallaxK={PARALLAX.farHill}>
      <Group ref={farRef}>
        <Group y={height - HILL_DESIGN_HEIGHT}>
          <Shape
            fill={GARDEN_COLORS.hillFar}
            sceneFunc={(ctx: Context, shape: KonvaShape) => {
              ctx.beginPath()
              ctx.moveTo(-HILL_PAD, 236)
              ctx.lineTo(0, 236)
              ctx.bezierCurveTo(140, 196, 300, 244, 470, 212)
              ctx.bezierCurveTo(600, 188, 700, 226, GARDEN_WIDTH, 208)
              ctx.lineTo(GARDEN_WIDTH + HILL_PAD, 208)
              ctx.lineTo(GARDEN_WIDTH + HILL_PAD, HILL_DESIGN_HEIGHT)
              ctx.lineTo(-HILL_PAD, HILL_DESIGN_HEIGHT)
              ctx.closePath()
              ctx.fillShape(shape)
            }}
          />
        </Group>
      </Group>
      </Group>
      <Group name={PARALLAX_NAME} parallaxBaseX={0} parallaxK={PARALLAX.backHill}>
      <Group ref={backRef}>
        <Group y={height - HILL_DESIGN_HEIGHT}>
          <Shape
            fill={GARDEN_COLORS.hillBack}
            sceneFunc={(ctx: Context, shape: KonvaShape) => {
              ctx.beginPath()
              ctx.moveTo(-HILL_PAD, 270)
              ctx.lineTo(0, 270)
              ctx.bezierCurveTo(180, 232, 380, 292, 560, 250)
              ctx.bezierCurveTo(650, 230, 720, 258, GARDEN_WIDTH, 246)
              ctx.lineTo(GARDEN_WIDTH + HILL_PAD, 246)
              ctx.lineTo(GARDEN_WIDTH + HILL_PAD, HILL_DESIGN_HEIGHT)
              ctx.lineTo(-HILL_PAD, HILL_DESIGN_HEIGHT)
              ctx.closePath()
              ctx.fillShape(shape)
            }}
          />
        </Group>
      </Group>
      </Group>
      {variant && <SkyTint width={GARDEN_WIDTH} height={height} color={variant.tint.color} opacity={variant.tint.opacity} />}
      {variant && variant.pollen > 0 && <PollenField count={variant.pollen} band={[0, 180, GARDEN_WIDTH, height - 240]} />}
    </Group>
  )
}

/** Bụi cây tiền cảnh: ba khối tròn xếp chồng, đáy sát mép dưới khung (`GARDEN_BUSHES`: thấp hơn hàng hoa nên không che chữ số). */
function Bush({ x, width, height, bottom, dark, light }: { x: number; width: number; height: number; bottom: number; dark: string; light: string }) {
  return (
    <>
      <Circle x={x - width * 0.28} y={bottom - height * 0.3} radius={height * 0.48} fill={dark} />
      <Circle x={x + width * 0.28} y={bottom - height * 0.3} radius={height * 0.48} fill={dark} />
      <Circle x={x} y={bottom - height * 0.38} radius={height * 0.62} fill={dark} />
      <Circle x={x - width * 0.08} y={bottom - height * 0.52} radius={height * 0.26} fill={light} />
    </>
  )
}

/** Đồi cỏ và bụi cây phía trước: vẽ SAU hàng hoa để che gốc cuống (ảnh đệm một lần vì tĩnh). */
/** `frameWidth`: nét viền khung cảnh (mảnh hơn nét giao diện, xem `ThemeStrokes.scene`). */
export function GardenForeground({ height, frameWidth, variant }: { height: number; frameWidth: number; variant?: AmbienceVariant }) {
  const frontRef = useRef<Konva.Group>(null)
  // Đồi trước và bụi được «nhuộm» sẵn cùng màu lớp phủ (nhẹ hơn một chút) để ban đêm và hoàng hôn không còn mảng cỏ sáng chói lạc tông. Nhuộm vào MÀU (không vẽ lớp phủ chồng lên)
  // nên hoa vẽ phía dưới không bị phủ; cache chụp lại khi đổi biến thể.
  const grade = (color: string) => (variant ? overlayColor(color, variant.tint.color, variant.tint.opacity * FOREGROUND_TINT_SHARE) : color)
  const hillColor = grade(GARDEN_COLORS.hillFront)
  useStaticCache(frontRef, GARDEN_WIDTH + 2 * HILL_PAD, height, { x: -HILL_PAD, version: hillColor })
  return (
    <Group clipFunc={(ctx) => roundedRectPath(ctx, 0, 0, GARDEN_WIDTH, height, CORNER)} listening={false}>
      <Group name={PARALLAX_NAME} parallaxBaseX={0} parallaxK={PARALLAX.frontHill}>
      <Group ref={frontRef}>
        <Group y={height - HILL_DESIGN_HEIGHT}>
          <Shape
            fill={hillColor}
            sceneFunc={(ctx: Context, shape: KonvaShape) => {
              ctx.beginPath()
              ctx.moveTo(-HILL_PAD, 306)
              ctx.lineTo(0, 306)
              ctx.bezierCurveTo(160, 284, 330, 326, 520, 300)
              ctx.bezierCurveTo(620, 288, 700, 300, GARDEN_WIDTH, 292)
              ctx.lineTo(GARDEN_WIDTH + HILL_PAD, 292)
              ctx.lineTo(GARDEN_WIDTH + HILL_PAD, HILL_DESIGN_HEIGHT)
              ctx.lineTo(-HILL_PAD, HILL_DESIGN_HEIGHT)
              ctx.closePath()
              ctx.fillShape(shape)
            }}
          />
        </Group>
        {GARDEN_BUSHES.map((bush) => (
          <Bush key={bush.x} {...bush} bottom={height} dark={grade(GARDEN_COLORS.bushDark)} light={grade(GARDEN_COLORS.bushLight)} />
        ))}
      </Group>
      </Group>
      {variant && variant.fireflies > 0 && <Fireflies count={variant.fireflies} band={[20, height - 250, GARDEN_WIDTH - 40, 200]} />}
      <Rect width={GARDEN_WIDTH} height={height} cornerRadius={CORNER} stroke={GARDEN_COLORS.bubbleBorder} strokeWidth={frameWidth} />
    </Group>
  )
}

function Sun({ x, y }: { x: number; y: number }) {
  return (
    <Group x={x} y={y} name={PARALLAX_NAME} parallaxBaseX={x} parallaxK={PARALLAX.sun}>
      {/* Vầng sáng mềm thở chậm (`gardenMotion`): chuyển màu từ vàng nhạt ở giữa ra trong suốt ở rìa. */}
      <Circle
        name={MOTION_NAMES.sunGlow}
        radius={SUN_GLOW_RADIUS}
        opacity={0.55}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={30}
        fillRadialGradientEndRadius={SUN_GLOW_RADIUS}
        fillRadialGradientColorStops={[0, GARDEN_COLORS.sunHalo, 1, 'rgba(255,230,128,0)']}
      />
      <Group name={MOTION_NAMES.sunRays}>
        {Array.from({ length: 12 }, (_, index) => (
          <Group key={index} rotation={index * 30}>
            <Rect x={-4} y={-64} width={8} height={20} cornerRadius={4} fill="#FFC53D" />
          </Group>
        ))}
      </Group>
      <Circle radius={40} fill="#FFD93D" stroke="#FFB703" strokeWidth={4} />
      <Circle x={-14} y={-6} radius={4.5} fill={GARDEN_COLORS.ink} />
      <Circle x={14} y={-6} radius={4.5} fill={GARDEN_COLORS.ink} />
      <Line points={[-12, 10, 0, 20, 12, 10]} tension={0.6} stroke={GARDEN_COLORS.ink} strokeWidth={3.5} lineCap="round" />
      <Circle x={-26} y={8} radius={7} fill="#FF9EB5" opacity={0.6} />
      <Circle x={26} y={8} radius={7} fill="#FF9EB5" opacity={0.6} />
    </Group>
  )
}

/** Mây trôi qua lại quanh `x` (biên độ `amplitude`, tốc độ `speed`): `gardenMotion` đặt lại x mỗi khung hình theo các thuộc tính này. */
function Cloud({ x, y, scale, amplitude, speed, opacity, color }: CloudSpec & { color: string }) {
  return (
    <Group name={MOTION_NAMES.cloud} motionBaseX={x} motionAmplitude={amplitude} motionSpeed={speed} parallaxK={PARALLAX.cloud} x={x} y={y} scaleX={scale} scaleY={scale} opacity={opacity}>
      <Circle x={-30} y={6} radius={24} fill={color} />
      <Circle x={0} y={-6} radius={32} fill={color} />
      <Circle x={34} y={6} radius={24} fill={color} />
      <Rect x={-54} y={6} width={108} height={24} cornerRadius={12} fill={color} />
    </Group>
  )
}

/** Vùng chụp ảnh đệm của đầu hoa: vuông quanh tâm, rộng hơn bán kính cả bông hoa (cánh + nét viền). */
const FLOWER_CACHE_SIZE = 120

export type FlowerGlow = 'none' | 'hint' | 'correct'

interface FlowerProps {
  x: number
  /** y của tâm đầu hoa, và y của mặt cỏ (gốc cuống) trong cùng hệ toạ độ. */
  headY: number
  groundY: number
  scale: number
  index: number
  /** Chữ số trên nhụy; `null` thì chỉ vẽ nhụy trơn (thang dài chỉ ghi số thưa). */
  label: string | null
  glow: FlowerGlow
  /** Họ phông của số trên nhụy (theme). */
  fontFamily?: string
  /** Node Konva của hoa, để chuyến bay làm hoa nảy khi ong đi qua (tween chạy thẳng trên node, không qua React). */
  nodeRef?: Ref<Konva.Group>
}

/**
 * Gợi ý: quầng sáng vàng nhấp nháy dịu (thở chậm, `gardenMotion` đổi cỡ) kèm vài hạt lấp lánh xoay quanh. Khác hẳn khung chọn nét đứt của giao diện: không có nét đứt, không có viền dày.
 * Vẫn có một vòng liền mảnh màu đậm (`ringHint`) để đạt tương phản với nền cho người khó phân biệt màu.
 */
function HintGlow() {
  return (
    <>
      <Circle
        name={MOTION_NAMES.hintGlow}
        radius={FLOWER_RADIUS + 34}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={FLOWER_RADIUS - 8}
        fillRadialGradientEndRadius={FLOWER_RADIUS + 34}
        fillRadialGradientColorStops={[0, 'rgba(255,214,90,1)', 1, 'rgba(255,226,122,0)']}
      />
      <Circle name={MOTION_NAMES.hintGlow} radius={FLOWER_RADIUS + 8} stroke={GARDEN_COLORS.ringHint} strokeWidth={3} opacity={0.75} />
      <Group name={MOTION_NAMES.hintSpark}>
        {[0, 72, 144, 216, 288].map((angle) => (
          <Group key={angle} rotation={angle}>
            <Star name="hint-star" y={-(FLOWER_RADIUS + 14)} numPoints={4} innerRadius={3} outerRadius={9} fill="#FFF3B0" stroke="#E0A800" strokeWidth={1.5} />
          </Group>
        ))}
      </Group>
    </>
  )
}

/** Một bông hoa có cuống, lá, 8 cánh và chữ số trên nhụy. Là «vạch» của trục số. */
export function Flower({ x, headY, groundY, scale, index, label, glow, fontFamily, nodeRef }: FlowerProps) {
  const stem = Math.max(20, (groundY - headY) / scale + 14)
  const color = petalColor(index)
  // Đầu hoa (cánh, nhụy, số) là hình tĩnh chỉ bị XOAY mỗi khung hình: chụp một lần rồi xoay ảnh đệm, khỏi vẽ lại 8 cánh × 11 hoa mỗi khung.
  const headRef = useRef<Konva.Group>(null)
  useStaticCache(headRef, FLOWER_CACHE_SIZE, FLOWER_CACHE_SIZE, { x: -FLOWER_CACHE_SIZE / 2, y: -FLOWER_CACHE_SIZE / 2, version: `${label}|${fontFamily}|${color}` })
  return (
    <Group ref={nodeRef} x={x} y={headY} scaleX={scale} scaleY={scale} listening={false}>
      <Line points={[0, 0, 0, stem]} stroke={GARDEN_COLORS.stem} strokeWidth={9} lineCap="round" />
      <Ellipse x={-18} y={stem * 0.55} radiusX={16} radiusY={7} rotation={-28} fill={GARDEN_COLORS.stem} />
      <Ellipse x={18} y={stem * 0.4} radiusX={16} radiusY={7} rotation={28} fill={GARDEN_COLORS.stem} />
      {glow === 'correct' && (
        <>
          <Circle radius={FLOWER_RADIUS + 22} fill={GARDEN_COLORS.glowCorrect} opacity={0.85} />
          <Circle radius={FLOWER_RADIUS + 12} stroke={GARDEN_COLORS.ringCorrect} strokeWidth={7} />
        </>
      )}
      {glow === 'hint' && <HintGlow />}
      {/* Đầu hoa (cánh, nhụy, số) đung đưa nhẹ quanh gốc cuống: `gardenMotion` xoay nhóm này mỗi khung hình. */}
      <Group ref={headRef} name={MOTION_NAMES.sway} motionIndex={index}>
      {Array.from({ length: 8 }, (_, petal) => (
        <Group key={petal} rotation={petal * 45}>
          <Ellipse y={-36} radiusX={13} radiusY={15} fill={color} stroke={PETAL_STROKE} strokeWidth={2} />
        </Group>
      ))}
      <Circle radius={FLOWER_CENTER_RADIUS} fill={FLOWER_CENTER_FILL} stroke={FLOWER_CENTER_STROKE} strokeWidth={3} />
      {label !== null && (
        <Text
          text={label}
          x={-FLOWER_CENTER_RADIUS}
          y={-FLOWER_CENTER_RADIUS}
          width={FLOWER_CENTER_RADIUS * 2}
          height={FLOWER_CENTER_RADIUS * 2}
          align="center"
          verticalAlign="middle"
          fontSize={label.length <= 1 ? 44 : label.length === 2 ? 36 : label.length === 3 ? 26 : 19}
          fontStyle="bold"
          fontFamily={fontFamily}
          fill={FLOWER_NUMBER_FILL}
        />
      )}
      </Group>
    </Group>
  )
}

/**
 * Vệt lấp lánh sau chú ong: một nhóm ngôi sao nhỏ vô hình (opacity 0) có tên và chỉ số ô; `gardenMotion` thả hạt và đặt dáng mỗi khung hình
 * theo `SparkleTrail`. Đặt TRƯỚC chú ong cùng nhóm cha (cùng toạ độ) để vệt nằm sau ong. Không nhận chạm.
 */
export function SparkleTrailStars() {
  return (
    <Group listening={false}>
      {Array.from({ length: TRAIL_SLOTS }, (_, index) => (
        <Star key={index} name={MOTION_NAMES.trail} motionIndex={index} opacity={0} numPoints={4} innerRadius={4} outerRadius={11} fill="#FFE27A" stroke="#FFFFFF" strokeWidth={1.5} />
      ))}
    </Group>
  )
}

/**
 * Sao rải khi đúng. Mỗi hạt là một ngôi sao vô hình (opacity 0) có tên và chỉ số: `gardenMotion` đặt vị trí, xoay và độ mờ mỗi khung hình
 * theo thời gian từ lúc có kết quả, nên React không vẽ lại gì trong lúc sao bay.
 */
export function Confetti({ x, y, particles }: { x: number; y: number; particles: readonly ConfettiParticle[] }) {
  return (
    <Group x={x} y={y} listening={false}>
      {particles.map((particle, index) => (
        <Star
          key={index}
          name={MOTION_NAMES.confetti}
          motionIndex={index}
          opacity={0}
          numPoints={5}
          innerRadius={particle.size * 0.45}
          outerRadius={particle.size}
          fill={particle.color}
          stroke="#FFFFFF"
          strokeWidth={1.5}
        />
      ))}
    </Group>
  )
}

interface PressableProps {
  x: number
  y: number
  width: number
  height: number
  disabled: boolean
  onPress: () => void
  children: React.ReactNode
}

/**
 * Nhóm bấm được, hơi co lại khi đang nhấn (cho trẻ thấy nút «nghe» tay mình). Hình vẽ co quanh tâm trong nhóm con, còn vùng chạm là
 * một hình chữ nhật trong suốt đủ kích thước nằm ngoài phần co: vùng chạm không dịch chỗ, mép nút không «rớt» khi đang nhấn.
 * Nhấn bị hủy (cảm ứng bị ngắt khi trang cuộn) cũng trả nút về cỡ cũ.
 */
function Pressable({ x, y, width, height, disabled, onPress, children }: PressableProps) {
  const [down, setDown] = useState(false)
  const press = disabled ? undefined : onPress
  const release = () => setDown(false)
  const shrink = down && !disabled ? 0.94 : 1
  return (
    <Group
      x={x}
      y={y}
      onClick={press}
      onTap={press}
      onMouseDown={() => !disabled && setDown(true)}
      onTouchStart={() => !disabled && setDown(true)}
      onMouseUp={release}
      onMouseLeave={release}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      <Rect width={width} height={height} fill="#000000" opacity={0.001} />
      <Group x={width / 2} y={height / 2} offsetX={width / 2} offsetY={height / 2} scaleX={shrink} scaleY={shrink} listening={false}>
        {children}
      </Group>
    </Group>
  )
}

type ToneName = 'primary' | 'secondary' | 'audio'

interface ChunkyButtonProps {
  x: number
  y: number
  width: number
  height: number
  tone: ToneName
  disabled: boolean
  onPress: () => void
  /** `faceHeight`: chiều cao mặt nút (đã trừ bóng nổi), để căn nội dung giữa mặt nút. */
  children: (ink: string, font: string, faceHeight: number) => React.ReactNode
}

/**
 * Kiểu nút chung của cả trò: mặt phẳng bo tròn, viền dày, bóng đổ phía dưới (cho cảm giác «bấm được») và cùng độ co khi nhấn.
 * Mũi tên, «Xong rồi!» và «Nghe lại» đều dùng nó, chỉ khác màu và nội dung; nên cùng một hình, cùng độ cao, thẳng hàng với nhau.
 */
export function ChunkyButton({ x, y, width, height, tone, disabled, onPress, children }: ChunkyButtonProps) {
  const ui = gardenUi(useTheme())
  const colors = ui[tone]
  const { ui: strokeWidth, uiShadow: lift } = ui.strokes
  const font = useGardenFont()
  const radius = Math.min(width, height) * 0.28
  return (
    <Pressable x={x} y={y} width={width} height={height} disabled={disabled} onPress={onPress}>
      <Rect y={lift} width={width} height={height - lift} cornerRadius={radius} fill={disabled ? colors.borderOff : colors.shadow} />
      <Rect width={width} height={height - lift} cornerRadius={radius} fill={disabled ? colors.faceOff : colors.face} stroke={disabled ? colors.borderOff : colors.border} strokeWidth={strokeWidth} />
      {children(disabled ? colors.inkOff : colors.ink, font, height - lift)}
    </Pressable>
  )
}

interface ArrowButtonProps {
  x: number
  y: number
  size: number
  direction: 'left' | 'right'
  disabled: boolean
  onPress: () => void
}

/** Nút mũi tên xanh lá vuông `size` đơn vị. */
export function ArrowButton({ x, y, size, direction, disabled, onPress }: ArrowButtonProps) {
  return (
    <ChunkyButton x={x} y={y} width={size} height={size} tone="secondary" disabled={disabled} onPress={onPress}>
      {(ink, _font, faceHeight) => (
        <RegularPolygon
          x={size / 2 + (direction === 'left' ? -4 : 4)}
          y={faceHeight / 2}
          sides={3}
          radius={size * 0.26}
          rotation={direction === 'left' ? -90 : 90}
          fill={disabled ? '#FFFFFF' : ink}
          listening={false}
        />
      )}
    </ChunkyButton>
  )
}

interface GoButtonProps {
  x: number
  y: number
  width: number
  height: number
  label: string
  disabled: boolean
  onPress: () => void
}

/** Nút «Xong rồi!» màu cam có ngôi sao ở bên trái. */
export function GoButton({ x, y, width, height, label, disabled, onPress }: GoButtonProps) {
  const star = height * 0.2
  return (
    <ChunkyButton x={x} y={y} width={width} height={height} tone="primary" disabled={disabled} onPress={onPress}>
      {(ink, font, faceHeight) => (
        <>
          <Star
            x={height * 0.4}
            y={faceHeight / 2}
            numPoints={5}
            innerRadius={star * 0.5}
            outerRadius={star}
            fill={disabled ? '#FFFFFF' : '#FFF3B0'}
            stroke={ink}
            strokeWidth={3}
            listening={false}
          />
          <Text
            text={label}
            x={height * 0.7}
            width={width - height * 0.8}
            height={faceHeight}
            align="center"
            verticalAlign="middle"
            fontSize={34}
            fontStyle="bold"
            fontFamily={font}
            fill={ink}
            listening={false}
          />
        </>
      )}
    </ChunkyButton>
  )
}
