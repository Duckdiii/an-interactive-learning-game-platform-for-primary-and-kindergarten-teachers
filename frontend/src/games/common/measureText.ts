import Konva from 'konva'

interface MeasureTextOptions {
  text: string
  fontSize: number
  /** Độ rộng khung chữ — phải trùng với node `Text` thật để số dòng wrap giống nhau. */
  width: number
  /** Kiểu chữ của node thật (ví dụ `'bold'`): chữ đậm rộng hơn nên wrap khác chữ thường. */
  fontStyle?: string
}

/**
 * Đo chiều cao thật của đoạn chữ sau khi Konva wrap theo từ, bằng một node `Text` tạm cùng độ rộng và
 * cỡ chữ với node được vẽ. Dùng thay cho ước lượng theo số ký tự (Konva wrap theo độ rộng glyph nên số
 * dòng thật khó đoán, câu dài dễ bị cắt). Trả `null` nếu không đo được (ví dụ môi trường không có Canvas
 * như jsdom) để người gọi quay về phép ước lượng.
 */
export function measureWrappedTextHeight({
  text,
  fontSize,
  width,
  fontStyle,
}: MeasureTextOptions): number | null {
  try {
    const node = new Konva.Text({ text, fontSize, width, ...(fontStyle ? { fontStyle } : {}) })
    const height = node.height()
    node.destroy()
    return Number.isFinite(height) && height > 0 ? height : null
  } catch {
    return null
  }
}
