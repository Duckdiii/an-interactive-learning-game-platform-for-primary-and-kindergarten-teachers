/**
 * Địa chỉ http hoặc https đã chuẩn hóa, hoặc null. Mọi địa chỉ đưa vào liên kết, mã QR hay nút sao chép (kể cả do Backend trả về) phải qua hàm này:
 * giao thức khác (javascript:, data:, file:...) có thể chạy mã hoặc dẫn học sinh tới nơi lạ. Không phải địa chỉ hợp lệ thì chỉ hiện mã chia sẻ.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null

  try {
    const url = new URL(value.trim())

    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
