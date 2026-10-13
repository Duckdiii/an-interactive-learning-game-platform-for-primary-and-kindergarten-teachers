const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const pad = (value: number) => String(value).padStart(2, '0')

const startOfDay = (time: number) => {
  const date = new Date(time)

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Thời điểm cập nhật dưới dạng giáo viên dễ đọc: "Vừa xong", "5 phút trước", "Hôm qua", "3 ngày trước"...
 * Trong vòng 24 giờ tính theo phút/giờ; từ 24 giờ trở đi tính theo NGÀY LỊCH (cập nhật 08:00 thứ Hai, xem 07:00
 * thứ Tư là "2 ngày trước", không phải "Hôm qua"). Từ 7 ngày trở lên ghi ngày đầy đủ (dd/MM/yyyy).
 * `now` truyền vào để test không phụ thuộc đồng hồ.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()) {
  const time = Date.parse(iso)

  if (Number.isNaN(time)) return ''

  const diff = Math.max(0, now - time)

  if (diff < MINUTE) return 'Vừa xong'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`

  const calendarDays = Math.round((startOfDay(now) - startOfDay(time)) / DAY)

  if (calendarDays <= 1) return 'Hôm qua'
  if (calendarDays < 7) return `${calendarDays} ngày trước`

  const date = new Date(time)

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}
