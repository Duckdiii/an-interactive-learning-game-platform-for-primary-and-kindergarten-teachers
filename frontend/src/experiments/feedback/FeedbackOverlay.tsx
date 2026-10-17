import { Group, Rect, Star } from 'react-konva'
import { useTheme } from '../theme/useTheme'
import { feedbackColors, type FeedbackPlan } from './feedbackEffects'
import { useFeedbackTimeline, type TimelineClock } from './useFeedbackTimeline'

interface FeedbackOverlayProps {
  plan: FeedbackPlan | null
  runId: number
  /** Khung mục tiêu (toạ độ thiết kế của sân): vòng sáng bao quanh và hạt lấp lánh xếp quanh khung này. */
  x: number
  y: number
  width: number
  height: number
  clock?: TimelineClock
}

/**
 * Lớp vẽ phản hồi trong một `Stage` Konva: vòng sáng nảy/rung nhẹ quanh khung mục tiêu và hạt lấp lánh. Không
 * nhận chạm (`listening={false}`) nên không chắn thẻ bên dưới. Chưa phát hoặc đã hết hiệu ứng thì không vẽ gì.
 */
export default function FeedbackOverlay({ plan, runId, x, y, width, height, clock }: FeedbackOverlayProps) {
  const { colors } = useTheme()
  const sample = useFeedbackTimeline(plan, runId, clock)
  if (!plan || !sample || !sample.active) return null

  const palette = feedbackColors(plan.kind, colors)
  return (
    <Group listening={false}>
      <Group x={x + width / 2 + sample.offsetX} y={y + height / 2} scaleX={sample.scale} scaleY={sample.scale}>
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          cornerRadius={20}
          stroke={palette.ring}
          strokeWidth={8}
          opacity={sample.opacity}
        />
      </Group>
      {palette.sparkles.length > 0 &&
        plan.sparkles.map((spec, index) => {
          const state = sample.sparkles[index]
          if (!state || state.opacity <= 0) return null
          return (
            <Star
              key={index}
              x={x + spec.x * width}
              y={y + spec.y * height}
              numPoints={5}
              innerRadius={spec.size * 0.4}
              outerRadius={spec.size}
              fill={palette.sparkles[index % palette.sparkles.length]}
              opacity={state.opacity}
              scaleX={state.scale}
              scaleY={state.scale}
            />
          )
        })}
    </Group>
  )
}
