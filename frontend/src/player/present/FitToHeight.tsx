import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { heightScale } from './presentLayout'

/**
 * Renderer co theo BỀ RỘNG khung chứa (ResponsiveStage), nên câu nhiều đáp án sẽ cao quá phần còn trống của khung 720px và bị cắt.
 * Khung này giữ nguyên bề rộng, đo chiều cao thật rồi thu nhỏ bằng CSS transform (không đổi bố cục nên không đo đi đo lại;
 * Konva vẫn nhận đúng toạ độ chạm dưới transform).
 */
export default function FitToHeight({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const box = outer.current
    const content = inner.current

    if (!box || !content) return

    const fit = () => setScale(heightScale(box.clientHeight, content.offsetHeight))
    const observer = new ResizeObserver(fit)

    observer.observe(box)
    observer.observe(content)
    fit()

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outer} className="h-full min-h-0 w-full overflow-hidden">
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {children}
      </div>
    </div>
  )
}
