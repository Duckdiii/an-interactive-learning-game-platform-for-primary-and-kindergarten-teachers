import { useState } from 'react'
import { Layer, Rect, Text } from 'react-konva'
import ResponsiveStage from '../../games/common/ResponsiveStage'
import { useTheme } from '../theme/useTheme'
import type { AudioService } from '../audio/audioService'
import FeedbackOverlay from './FeedbackOverlay'
import {
  buildPlan,
  FEEDBACK_KINDS,
  MAX_FLASHES_PER_SECOND,
  planFlashRate,
  validatePlan,
  type FeedbackKind,
} from './feedbackEffects'
import { useExperimentFeedback } from './useExperimentFeedback'

const LABELS: Record<FeedbackKind, string> = { correct: 'Đúng', tryAgain: 'Thử lại', complete: 'Hoàn thành' }

const STAGE_WIDTH = 800
const STAGE_HEIGHT = 260
const CARD = { x: 250, y: 60, width: 300, height: 140 }

interface FeedbackLabProps {
  /** Cho test truyền bản giả; mặc định dùng bản âm thanh dùng chung. */
  audio?: AudioService | null
}

/** Phòng thử phản hồi: bấm để xem hiệu ứng + nghe âm, có công tắc giảm chuyển động và bảng số đo nhấp nháy. */
export default function FeedbackLab({ audio }: FeedbackLabProps) {
  const [forceReduced, setForceReduced] = useState(false)
  const feedback = useExperimentFeedback({ audio, forceReducedMotion: forceReduced })
  const { colors } = useTheme()

  return (
    <div className="space-y-3 p-4">
      <ResponsiveStage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
        <Layer>
          <Rect {...CARD} cornerRadius={20} fill={colors.surface} stroke={colors.border} strokeWidth={3} listening={false} />
          <Text
            text={feedback.kind ? LABELS[feedback.kind] : 'Bấm một nút bên dưới'}
            x={CARD.x}
            y={CARD.y}
            width={CARD.width}
            height={CARD.height}
            align="center"
            verticalAlign="middle"
            fontSize={30}
            fontStyle="bold"
            fill={colors.text}
            listening={false}
          />
          <FeedbackOverlay plan={feedback.plan} runId={feedback.runId} {...CARD} />
        </Layer>
      </ResponsiveStage>

      <div role="group" aria-label="Phản hồi" className="flex flex-wrap gap-2">
        {FEEDBACK_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => feedback.trigger(kind)}
            className="min-h-16 min-w-16 rounded border bg-white px-4 py-2"
          >
            {LABELS[kind]}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={forceReduced} onChange={(event) => setForceReduced(event.target.checked)} />
        Giảm chuyển động
      </label>
      {feedback.reducedMotion && !forceReduced && <p>Hệ điều hành đang bật giảm chuyển động.</p>}

      <table className="text-sm">
        <caption className="text-left">Số lần chớp lớn nhất mỗi giây (giới hạn {MAX_FLASHES_PER_SECOND})</caption>
        <tbody>
          {FEEDBACK_KINDS.map((kind) => {
            const plan = buildPlan(kind, { reducedMotion: feedback.reducedMotion })
            const issues = validatePlan(plan)
            return (
              <tr key={kind}>
                <th scope="row" className="pr-4 text-left font-normal">
                  {LABELS[kind]}
                </th>
                <td data-testid={`flash-${kind}`}>{planFlashRate(plan)}</td>
                <td>{issues.length === 0 ? 'đạt giới hạn an toàn' : issues.map((issue) => issue.code).join(', ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
