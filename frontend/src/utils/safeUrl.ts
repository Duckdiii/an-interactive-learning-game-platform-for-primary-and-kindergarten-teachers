/**
 * Địa chỉ http hoặc https đã chuẩn hóa, hoặc null. Mọi địa chỉ đưa vào liên kết, mã QR hay nút sao chép (kể cả do Backend trả về) phải qua hàm này:
 * giao thức khác (javascript:, data:, file:...) có thể chạy mã hoặc dẫn học sinh tới nơi lạ. Không phải địa chỉ hợp lệ thì chỉ hiện mã chia sẻ.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null

  try {
    const url = new URL(value.trim())

    // Địa chỉ kèm tên đăng nhập (https://tai-khoan:mat-khau@host) thường dùng để đánh lừa nơi đến: bỏ luôn.
    if (url.username !== '' || url.password !== '') return null

    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
