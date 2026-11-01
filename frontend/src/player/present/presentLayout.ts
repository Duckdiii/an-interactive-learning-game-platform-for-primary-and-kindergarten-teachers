export const PRESENT_WIDTH = 1280
export const PRESENT_HEIGHT = 720

/** Tỉ lệ để khung 1280×720 vừa trọn màn hình mà không méo (phần thừa thành viền). */
export const fitScale = (width: number, height: number) => Math.min(width / PRESENT_WIDTH, height / PRESENT_HEIGHT)

/** Hệ số thu nhỏ để nội dung cao `contentHeight` vừa trong `availableHeight`; không phóng to, chưa đo được thì giữ 1. */
export const heightScale = (availableHeight: number, contentHeight: number) =>
  availableHeight > 0 && contentHeight > availableHeight ? availableHeight / contentHeight : 1
