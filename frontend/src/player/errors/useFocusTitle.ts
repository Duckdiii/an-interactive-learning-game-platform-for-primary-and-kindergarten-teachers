import { useEffect, useRef } from 'react'

/** Màn lỗi thay hẳn màn trước (nút vừa bấm đã bị gỡ): đưa focus về tiêu đề để bàn phím và trình đọc màn hình không bị lạc. */
export function useFocusTitle() {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => ref.current?.focus(), [])

  return ref
}
