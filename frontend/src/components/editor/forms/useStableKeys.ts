import { useRef, useState } from 'react'

// Khóa ỔN ĐỊNH cho các phần tử có thể thêm/xóa (đáp án, cặp ghép) của form sửa tay. Mã trong DSL (a, b, c... hay p1, p2...) có thể đổi
// theo vị trí khi thêm/xóa, nên dùng khóa này làm `key` của React (chữ đang gõ dở đi theo đúng phần tử) và để các bản vá đang chờ
// (kết quả kiểm tra từ ngữ về muộn) tìm lại đúng phần tử theo khóa thay vì theo vị trí đã cũ.
export function useStableKeys(initialCount: number) {
  const [keys, setKeys] = useState(() => Array.from({ length: initialCount }, (_, index) => `k${index}`))
  // Bản sao đồng bộ để bản vá chạy muộn đọc được danh sách MỚI NHẤT (state chỉ cập nhật sau lần vẽ kế tiếp).
  const latest = useRef(keys)
  const counter = useRef(initialCount)

  const replace = (next: string[]) => {
    latest.current = next
    setKeys(next)
  }

  return {
    keys,
    /** Vị trí HIỆN TẠI của phần tử có khóa `key`; -1 nếu phần tử đã bị xóa. */
    indexOf: (key: string) => latest.current.indexOf(key),
    /** Số phần tử hiện tại. */
    count: () => latest.current.length,
    append: () => replace([...latest.current, `k${counter.current++}`]),
    remove: (key: string) => replace(latest.current.filter((item) => item !== key)),
  }
}
