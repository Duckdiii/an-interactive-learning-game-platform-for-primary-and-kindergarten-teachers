import type { ComponentType } from 'react'
import QuizRenderer from '../../../games/quiz/QuizRenderer'
import MatchingRenderer from '../../../games/matching/MatchingRenderer'
import OrderingRenderer from '../../../games/ordering/OrderingRenderer'
import DragDropRenderer from '../../../games/drag-drop/DragDropRenderer'
import WordScrambleRenderer from '../../../games/word-scramble/WordScrambleRenderer'
import AudioVisualMatchRenderer from '../../../games/audio-visual-match/AudioVisualMatchRenderer'
import VisualClozeImageRenderer from '../../../games/visual-cloze-image/VisualClozeImageRenderer'
import OddOneOutRenderer from '../../../games/odd-one-out/OddOneOutRenderer'

const RENDERER_MAP: Record<string, ComponentType<any>> = {
  QUIZ: QuizRenderer,
  MATCHING: MatchingRenderer,
  ORDERING: OrderingRenderer,
  DRAG_DROP: DragDropRenderer,
  WORD_SCRAMBLE: WordScrambleRenderer,
  AUDIO_VISUAL_MATCH: AudioVisualMatchRenderer,
  VISUAL_CLOZE: VisualClozeImageRenderer,
  ODD_ONE_OUT: OddOneOutRenderer,
}

export interface LivePreviewPanelProps {
  gameType: string
  currentQuestion: any
}

export function LivePreviewPanel({ gameType, currentQuestion }: LivePreviewPanelProps) {
  const RendererComponent = RENDERER_MAP[gameType]

  if (!RendererComponent) {
    return (
      <div className="preview-panel border rounded-lg p-4 bg-surface-sun text-center" data-testid="preview-unsupported">
        <p className="text-sm text-ink-soft">Chưa hỗ trợ preview cho loại game này.</p>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="preview-panel border rounded-lg p-4 bg-surface-sun text-center" data-testid="preview-empty">
        <p className="text-sm text-ink-soft">Chưa có dữ liệu câu hỏi để xem trước.</p>
      </div>
    )
  }

  return (
    <div className="preview-panel border border-ink/10 rounded-lg p-4 bg-surface-sun" data-testid="live-preview-panel">
      <p className="text-sm text-ink-soft mb-2">Xem trước – học sinh sẽ thấy như thế này</p>
      <div className="w-full flex justify-center overflow-hidden rounded-md bg-white">
        <RendererComponent question={currentQuestion} mode="preview" previewMode={true} />
      </div>
    </div>
  )
}

export default LivePreviewPanel
