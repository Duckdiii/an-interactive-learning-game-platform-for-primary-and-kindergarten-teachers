import { useLayoutEffect } from 'react'
import type { UiProfile } from '../profile/types'
import { playerRootVars } from './playerRootVars'

/**
 * Đặt token của profile lên thẻ gốc của trang: biến CSS màu và vùng chạm, và cỡ chữ gốc để mọi chữ tính theo rem của Tailwind đều co giãn theo `fontScale`.
 * Chỉ ở trang chơi: trả lại giá trị cũ khi rời đi nên không ảnh hưởng trang giáo viên. Ràng buộc: PlayButton và các class play-* chỉ có màu và vùng chạm khi được gọi trong cây của trang đã dùng hook này (PlayPage).
 */
export function usePlayerRootStyle(profile: UiProfile) {
  // useLayoutEffect: biến phải có TRƯỚC lần vẽ đầu, nếu không khung đầu tiên thấy nền trong suốt và nút thấp hơn vùng chạm tối thiểu.
  useLayoutEffect(() => {
    const root = document.documentElement
    const { vars, fontSize } = playerRootVars(profile)
    const previousFontSize = root.style.fontSize
    const previous = Object.keys(vars).map((name) => [name, root.style.getPropertyValue(name)] as const)

    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    root.style.fontSize = fontSize

    return () => {
      for (const [name, value] of previous) {
        if (value) root.style.setProperty(name, value)
        else root.style.removeProperty(name)
      }
      root.style.fontSize = previousFontSize
    }
  }, [profile])
}
