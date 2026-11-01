import { fireEvent, screen } from '@testing-library/react'

/** Ô thời gian/điểm của câu đang sửa. Câu theo mặc định của game thì hai ô thu gọn: bấm "Đặt riêng" để mở trước. */
export function timingBox(name: RegExp) {
  const open = screen.queryByRole('button', { name: 'Đặt riêng' })

  if (open) fireEvent.click(open)

  return screen.getByRole('textbox', { name })
}
