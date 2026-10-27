/** Các trạng thái chuẩn của nhân vật (SPEC mục 1): chào, nói, hỏi, vui, an ủi, ăn mừng. Khung chỉ biết các trạng thái này, không biết hình cụ thể. */
export const MASCOT_STATES = ['greet', 'speak', 'ask', 'happy', 'comfort', 'celebrate'] as const
export type MascotState = (typeof MASCOT_STATES)[number]

/**
 * Một theme: nhân vật và biểu tượng tiến độ (nền và âm thanh theo theme làm cùng token ở bước sau). Theme chưa có nhân vật riêng
 * (`mascotBase = null`) thì dùng biểu tượng nền tảng. Hình hiện là ký tự emoji làm chỗ chừa, thay bằng hình thật không đổi hợp đồng.
 */
export interface Theme {
  id: string
  name: string
  /** Hình nhân vật; `null` là dùng biểu tượng nền tảng. */
  mascotBase: string | null
  /** Biểu tượng tiến độ cho khung Bé: đã qua / chưa tới. */
  progress: { filled: string; empty: string }
}
