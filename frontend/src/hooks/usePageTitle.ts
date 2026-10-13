import { useEffect } from 'react'
import { viText } from '../constants/viText'

// Mỗi trang có tiêu đề tab riêng ("Trang chủ · AI Game Platform"): giáo viên mở nhiều tab vẫn phân biệt được,
// và trình đọc màn hình đọc đúng tên trang khi chuyển trang.
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${viText.appName}`
  }, [title])
}
