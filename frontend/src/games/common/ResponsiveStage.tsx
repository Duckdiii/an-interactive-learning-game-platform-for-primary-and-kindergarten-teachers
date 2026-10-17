import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import { useTheme } from '../../experiments/theme/useTheme'

interface ResponsiveStageProps {
  /** Kích thước "thiết kế" — toạ độ của mọi phần tử con bên trong tính theo hệ này, không đổi. */
  width: number
  height: number
  children: ReactNode
}

/**
 * Bọc `Stage` của Konva, tự co giãn theo chiều rộng khung chứa thật (dùng ResizeObserver) để không
 * tràn ngang trên màn hình nhỏ hơn kích thước thiết kế (mobile/tablet). Vùng chạm co giãn tỉ lệ
 * theo màn hình thật nên vẫn giữ đúng tỉ lệ 340x200 đã thiết kế, không co nhỏ hơn mức cần thiết.
 * Không phóng to vượt kích thước thiết kế trên màn hình lớn hơn (scale tối đa 1).
 * Dùng chung cho mọi renderer, không chỉ riêng Quiz.
 */
export default function ResponsiveStage({ width, height, children }: ResponsiveStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { colors, paintStageBackground } = useTheme()
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateScale = () => {
      const availableWidth = container.clientWidth
      if (availableWidth > 0) {
        setScale(Math.min(1, availableWidth / width))
      }
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(container)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Stage width={width * scale} height={height * scale} scaleX={scale} scaleY={scale}>
        {/* Chỉ theme có nền riêng mới vẽ; theme neutral giữ nền trong suốt như trước. */}
        {paintStageBackground && (
          <Layer listening={false}>
            <Rect width={width} height={height} fill={colors.background} />
          </Layer>
        )}
        {children}
      </Stage>
    </div>
  )
}
