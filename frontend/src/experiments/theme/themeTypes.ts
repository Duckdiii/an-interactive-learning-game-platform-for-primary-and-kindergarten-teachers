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
 * Màu theo vai trò, dạng `#RGB` hoặc `#RRGGBB`. Chữ (`text`) dùng chung cho mọi bề mặt, trừ `onAccent` và
 * `onDisabled`. Các vai trò khớp từng màu đang viết cứng trong renderer QUIZ/MATCHING (xem `themes/neutral.ts`).
 */
export interface ThemeColors {
  /** Nền sân chơi; chỉ được vẽ khi `ThemeManifest.paintStageBackground` bật. */
  background: string
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

/** Số màu tối thiểu của `linkColors` (bằng số cặp tối đa của MATCHING). */
export const MIN_LINK_COLORS = 6

export interface ThemeManifest {
  id: string
  name: string
  ageBands: readonly AgeBand[]
  colors: ThemeColors
  /** false: không vẽ nền sân (giữ nền trong suốt như renderer hiện tại). */
  paintStageBackground: boolean
  font: ThemeFont
  compatibleMechanics: readonly Mechanic[]
  /** Cờ an toàn nội dung: theme cam kết không dùng hình ảnh/chủ đề bạo lực. Phải là `true`. */
  contentSafety: { noViolence: boolean }
  assets: readonly ThemeAsset[]
}
