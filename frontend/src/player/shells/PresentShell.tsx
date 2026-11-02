import { useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { viText } from '../../constants/viText'
import { PRESENT_HEIGHT, PRESENT_WIDTH, fitScale } from '../present/presentLayout'
import { useAutoHide } from '../present/useAutoHide'

function useViewportScale() {
  const read = () => fitScale(window.innerWidth, window.innerHeight)
  const [scale, setScale] = useState(read)

  useLayoutEffect(() => {
    const update = () => setScale(read())

    window.addEventListener('resize', update)

    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

interface PresentShellProps {
  /** Nút của giáo viên ở thanh dưới màn hình. */
  controls: ReactNode
  /** Dòng nhắc phím tắt ở cuối thanh. */
  hint?: string
  children: ReactNode
}

/**
 * Khung trình chiếu trên tivi lớp Mầm non (SPEC A1–A3): vẽ theo khung 1280×720 rồi co giãn vừa màn hình. Tivi không cảm ứng nên giáo viên
 * dùng chuột/bàn phím; thanh điều khiển nằm dưới màn hình, tự ẩn sau 3 giây để không che trò chơi, và con trỏ chuột cũng ẩn theo.
 */
export default function PresentShell({ controls, hint, children }: PresentShellProps) {
  const scale = useViewportScale()
  const { visible, barRef, barProps } = useAutoHide()

  return (
    <div className={`fixed inset-0 overflow-hidden bg-play-ink ${visible ? '' : 'cursor-none'}`}>
      {/* Đặt tuyệt đối ở tâm rồi mới dịch và co: căn giữa bằng lưới thì ô lưới nở theo 1280px trước khi co, màn hẹp hơn sẽ bị lệch phải. */}
      <div
        data-testid="present-stage"
        className="absolute left-1/2 top-1/2 flex flex-col overflow-hidden bg-play-page text-play-ink"
        style={{ width: PRESENT_WIDTH, height: PRESENT_HEIGHT, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}
      >
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <div
          // group, không phải toolbar: thanh không có điều hướng mũi tên (← → dùng để chuyển câu), Tab đi qua từng nút.
          ref={barRef}
          role="group"
          aria-label={viText.present.toolbarLabel}
          {...barProps}
          // Bấm chuột (detail > 0) thì trả tiêu điểm ngay: nút giữ tiêu điểm sẽ nuốt phím Space/Enter mà giáo viên định dùng cho phím tắt.
          onClick={(event) => {
            if (event.detail > 0 && event.target instanceof HTMLElement) event.target.closest('button')?.blur()
          }}
          className={`absolute inset-x-0 bottom-0 flex items-center gap-3 bg-play-ink/90 px-6 py-4 text-white transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
            visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
        >
          <span className="mr-2 text-sm font-bold uppercase tracking-wide opacity-80">{viText.present.teacher}</span>
          {controls}
          {hint ? <span className="ml-auto text-sm font-semibold opacity-80">{hint}</span> : null}
        </div>
      </div>
    </div>
  )
}
