/** Chiều rộng khung xem thử: điện thoại, máy tính bảng, máy tính. */
export const FRAME_WIDTHS = [390, 768, 1280] as const
export type FrameWidth = (typeof FRAME_WIDTHS)[number]
