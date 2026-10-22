/** Nhóm tuổi của hồ sơ độ tuổi (xem kế hoạch T5.1); theme khai báo các nhóm nó phù hợp. */
export const AGE_BANDS = ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

/**
 * Cơ chế chơi mà theme có thể áp vào: hai renderer đã có (QUIZ, MATCHING) và ba loại thử nghiệm.
 * Không dùng `GameType` của DSL vì loại thử nghiệm không thuộc DSL 1.0.0 (đang đóng băng).
 */
export const KNOWN_MECHANICS = ['QUIZ', 'MATCHING', 'NUMBER_LINE', 'SYLLABLE_BUILDER', 'PREPOSITION_SCENE'] as const
export type Mechanic = (typeof KNOWN_MECHANICS)[number]

/**
 * Màu theo vai trò, dạng `#RGB` hoặc `#RRGGBB`. Chữ trên thẻ/nút nghe lại là `text`; chữ trên nền sân là
 * `onBackground`; chữ trên nút chính/nút khóa là `onAccent`/`onDisabled`. Các vai trò khớp từng màu đang viết cứng trong renderer QUIZ/MATCHING (xem `themes/neutral.ts`).
 */
export interface ThemeColors {
  /** Nền sân chơi; chỉ được vẽ khi `ThemeManifest.paintStageBackground` bật. */
  background: string
  /** Chữ vẽ thẳng lên nền sân (câu hỏi, câu dẫn). Tách khỏi `text` vì nền tối cần chữ sáng còn thẻ vẫn sáng chữ tối. */
  onBackground: string
  surface: string
  surfaceSelected: string
  /** Nền thẻ khi trả lời đúng. */
  surfaceCorrect: string
  /** Nền thẻ khi cần thử lại: màu dịu, không đỏ gắt (quy ước UX của dự án). */
  surfaceTryAgain: string
  text: string
  border: string
  accent: string
  accentBorder: string
  /** Chữ trên nền `accent` (ví dụ nút «Xong rồi!»). */
  onAccent: string
  /** Nút bị khóa. Không kiểm tương phản chữ/nền (WCAG miễn trừ thành phần bị vô hiệu hóa). */
  disabledSurface: string
  disabledBorder: string
  onDisabled: string
  /** Nút «Nghe lại»: chữ dùng `text`. */
  audioSurface: string
  audioBorder: string
  /** Màu đường nối cặp đúng / cần thử lại sau khi chấm (không phải màu nền thẻ). */
  lineCorrect: string
  lineTryAgain: string
  /** Bảng màu đường nối cặp trước khi chấm; cần ít nhất 6 màu (MATCHING có tối đa 6 cặp). */
  linkColors: readonly string[]
}

export interface ThemeFont {
  family: string
  /** Cỡ chữ cơ sở, đơn vị px thiết kế. */
  baseSize: number
}

/** Tài nguyên hình của theme: SVG nhúng sẵn (data URI), không tải từ bên ngoài. */
export interface ThemeAsset {
  id: string
  kind: 'svg'
  /** Phải bắt đầu bằng `data:image/svg+xml`. */
  src: string
  /** Mô tả ngắn cho trình đọc màn hình; ảnh trang trí vẫn cần mô tả hoặc đánh dấu rõ ở nơi dùng. */
  alt: string
}

/** Kiểu chuyển động nhẹ của một vật trang trí: trôi ngang, bồng bềnh, đung đưa, hoặc đứng yên. */
export const DECORATION_MOTIONS = ['drift', 'float', 'sway', 'still'] as const
export type DecorationMotion = (typeof DECORATION_MOTIONS)[number]

/** Phản ứng khi trẻ chạm vào vật trang trí (dưới 1,2 giây, xem `decorReactions`): nhảy, lắc, nảy, đập cánh; `none` hoặc bỏ trống là không phản ứng. */
export const DECORATION_REACTIONS = ['hop', 'wiggle', 'boing', 'flutter', 'none'] as const
export type DecorationReaction = (typeof DECORATION_REACTIONS)[number]

/** Vật trang trí nằm ở bầu trời (phía trên hàng hoa) hay trên mặt cỏ (phía dưới hàng hoa); không bao giờ ở tầng chữ số. */
export const DECORATION_LAYERS = ['sky', 'ground'] as const
export type DecorationLayer = (typeof DECORATION_LAYERS)[number]

/**
 * Một vật trang trí của cảnh, đặt bằng DỮ LIỆU để theme khác thay được mà không sửa component. Hình lấy từ từ khóa qua `resolveImage`
 * (bộ Fluent Emoji cục bộ); từ khóa chưa có hình thì bỏ qua vật đó (và được ghi vào sổ hình thiếu), không vẽ hình dự phòng lên cảnh.
 * `x` là tỉ lệ (0 đến 1) của bề rộng khung cảnh; `y` là tỉ lệ chiều cao khung (tầng sky) hoặc vị trí trong dải cỏ (tầng ground, xem `DECORATION_LIMITS`); `size` và `amplitude` tính bằng đơn vị thiết kế.
 */
export interface ThemeDecoration {
  keyword: string
  layer: DecorationLayer
  x: number
  y: number
  size: number
  motion: DecorationMotion
  /** Biên độ chuyển động: đơn vị thiết kế (trôi, bồng bềnh) hoặc độ (đung đưa). */
  amplitude: number
  /** Tốc độ (rad/giây). */
  speed: number
  /** Lệch pha (rad), để các vật cùng kiểu không chuyển động đồng bộ. */
  phase?: number
  /** Độ sâu 0 (xa) đến 1 (gần), mặc định 1: vật xa vẽ nhỏ và nhạt hơn, vật gần to và đậm hơn (xem `decorDepth`). */
  depth?: number
  /** Phản ứng khi chạm (mặc định không phản ứng). Chạm vật trang trí không bao giờ là trả lời. */
  reaction?: DecorationReaction
}

/** Giới hạn dữ liệu trang trí: giữ vật nằm ngoài tầng chữ số của hoa ở mọi chiều cao cảnh (xem `validateTheme`). */
export const DECORATION_LIMITS = {
  minSize: 16,
  maxSize: 64,
  maxAmplitude: 16,
  maxSpeed: 3,
  /** Vật ở bầu trời: tâm không thấp hơn 40% chiều cao cảnh (cảnh cao từ 440 trở lên; hàng đề bài ở trên cùng, hàng hoa ở dưới). */
  skyMaxY: 0.4,
  /**
   * Vật trên cỏ: `y` là vị trí TRONG dải cỏ ngay trên đáy khung (không phải tỉ lệ cả cảnh, vì hàng hoa neo theo đáy còn cảnh cao thấp tùy bố cục):
   * đáy hình ở `height - groundStripTop + y * groundStrip`. `y` không dưới `groundMinY` và cỡ không quá `groundMaxSize`, nên mọi vật nằm dưới
   * dải hoa và chữ số (kể cả lúc hoa nở to) ở mọi chiều cao cảnh.
   */
  groundMinY: 0.8,
  groundMaxSize: 40,
  groundStripTop: 46,
  groundStrip: 40,
  maxCount: 12,
  /** Kiểu vẽ theo độ sâu: vật xa nhất (depth 0) còn 65% cỡ và 70% độ đục; bóng dưới chân vật trên cỏ đậm từ 0,10 (xa) đến 0,22 (gần). */
  depth: { minScale: 0.65, minOpacity: 0.7, minShadow: 0.1, maxShadow: 0.22 },
} as const

/**
 * Màu của các vật giao diện nằm TRONG cảnh (bảng đề bài, huy hiệu số), tách khỏi màu cảnh: theme khác đổi chúng mà không vẽ lại cảnh.
 * Chữ trên mặt bảng và trên mặt huy hiệu phải đạt tương phản (xem `validateTheme`).
 */
export interface ThemeHud {
  signFace: string
  signBorder: string
  signInk: string
  badgeFace: string
  badgeBorder: string
  badgeInk: string
}

/**
 * Quy tắc nét viền (đơn vị thiết kế, nhân theo tỉ lệ sân), chốt theo hai nhóm để giao diện và cảnh không «lệch phong cách»:
 * - `ui`: viền của vật giao diện (nút, bảng, huy hiệu, ô số), dày và có BÓNG NỔI phía dưới (`uiShadow`, màu viền tối thêm 25%);
 * - `scene`: viền của cảnh (khung cảnh, đồi), mảnh hơn hẳn, không bóng, để cảnh là nền và giao diện nổi lên trên.
 */
export interface ThemeStrokes {
  ui: number
  uiShadow: number
  scene: number
}

/**
 * Biến thể theo thời điểm trong ngày của cảnh (sáng, hoàng hôn, đêm), làm bằng DỮ LIỆU để theme khác tự khai báo mà không sửa component. Mỗi biến thể là một
 * lớp phủ màu (color grading, vẽ một lần rồi cache) cộng với màu trời, thiên thể (mặt trời hay trăng), tia nắng, và bộ trang trí không khí (phấn hoa, sao, đom đóm).
 * Hoa, số trên hoa và chú ong KHÔNG bị lớp phủ che nên luôn đủ tương phản ở mọi biến thể; trời và đồi bị phủ nên màu trời phải giữ được tương phản với viền ong (xem `validateTheme` và test của theme).
 * Không đụng tới Game JSON DSL: biến thể chọn qua tham số của renderer, mặc định là `ThemeAmbience.default`.
 */
export const TIMES_OF_DAY = ['morning', 'sunset', 'night'] as const
export type TimeOfDay = (typeof TIMES_OF_DAY)[number]

export const CELESTIAL_BODIES = ['sun', 'moon'] as const
export type CelestialBody = (typeof CELESTIAL_BODIES)[number]

/** Giới hạn của không khí: đủ để cảnh sống động mà vẫn nhẹ cho máy yếu (mỗi hạt là một node trong bể đối tượng cố định, không cấp phát thêm). */
export const ATMOSPHERE_LIMITS = { maxPollen: 20, maxStars: 20, maxFireflies: 10, maxTintOpacity: 0.45, maxCelestialDrop: 60 } as const

export interface AmbienceVariant {
  /** Tên hiển thị cho người làm bài (nút chọn khi phát triển). */
  label: string
  /** Màu trời từ trên xuống dưới (hai màu, chuyển dần). */
  sky: readonly [top: string, bottom: string]
  /** Lớp phủ màu nhân (multiply) lên trời, mây và đồi; `opacity` 0 là không phủ. */
  tint: { color: string; opacity: number }
  /** Mặt trời (có quầng sáng) hay trăng (khuyết, sáng dịu). */
  celestial: CelestialBody
  /** Hạ thiên thể xuống bấy nhiêu đơn vị (hoàng hôn: mặt trời thấp sát đồi). */
  celestialDrop: number
  /** Tia nắng quét nhẹ từ thiên thể (chỉ có ý nghĩa với mặt trời). */
  beams: boolean
  /** Số hạt phấn hoa lơ lửng, số sao nhấp nháy, số đom đóm. */
  pollen: number
  stars: number
  fireflies: number
  /** Màu mây và độ đục của mây (đêm: mây xám xanh mờ). */
  cloud: { color: string; opacity: number }
  /** Bộ vật trang trí riêng của biến thể (thay hẳn `ThemeManifest.decorations`); bỏ trống thì dùng bộ chung. */
  decorations?: readonly ThemeDecoration[]
}

export interface ThemeAmbience {
  default: TimeOfDay
  variants: Readonly<Record<TimeOfDay, AmbienceVariant>>
}

/** Số màu tối thiểu của `linkColors` (bằng số cặp tối đa của MATCHING). */
export const MIN_LINK_COLORS = 6

export interface ThemeManifest {
  id: string
  name: string
  ageBands: readonly AgeBand[]
  colors: ThemeColors
  /** false: không vẽ nền sân (giữ nền trong suốt như renderer hiện tại). */
  paintStageBackground: boolean
  /** Mã tài nguyên (trong `assets`) dùng làm ô họa tiết lặp phủ lên nền sân; bỏ trống = chỉ màu đặc. Cần `paintStageBackground`. */
  backdropAssetId?: string
  font: ThemeFont
  compatibleMechanics: readonly Mechanic[]
  /** Cờ an toàn nội dung: theme cam kết không dùng hình ảnh/chủ đề bạo lực. Phải là `true`. */
  contentSafety: { noViolence: boolean }
  assets: readonly ThemeAsset[]
  /** Vật trang trí của cảnh (tùy chọn); chỉ trò có cảnh (Vườn hoa) đọc. */
  decorations?: readonly ThemeDecoration[]
  /** Màu bảng đề bài và huy hiệu số trong cảnh (tùy chọn); thiếu thì suy từ `colors`. */
  hud?: ThemeHud
  /** Quy tắc nét viền (tùy chọn); thiếu thì dùng `DEFAULT_STROKES`. */
  strokes?: ThemeStrokes
  /** Biến thể thời điểm trong ngày của cảnh (tùy chọn); thiếu thì cảnh dùng màu cố định như cũ. */
  ambience?: ThemeAmbience
}

export const DEFAULT_STROKES: ThemeStrokes = { ui: 4, uiShadow: 6, scene: 2 }
