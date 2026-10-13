// Chữ cái đại diện cho ảnh đại diện. Tên người Việt thường gọi bằng tên (từ cuối) nên lấy chữ cái đầu của từ cuối:
// "Nguyễn Thị Lan" -> "L". Không có tên thì dùng chữ đầu của email.
export function initialOf(nameOrEmail: string | undefined) {
  const words = (nameOrEmail ?? '').trim().split(/\s+/).filter(Boolean)
  const last = words[words.length - 1]

  return last ? last.charAt(0).toLocaleUpperCase('vi') : '?'
}
