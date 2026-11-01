import DragDropRenderer from '../../games/drag-drop/DragDropRenderer'
import type { PlayableRendererProps } from './types'

/** Adapter: đưa `DragDropRenderer` (mode play, nộp một lần sau «Xong rồi!») về hợp đồng chung. */
export default function DragDropPlayable({ question, onSubmit }: PlayableRendererProps<'DRAG_DROP'>) {
  return (
    <DragDropRenderer
      mode="play"
      question={question}
      onAnswered={async (placements) => {
        const result = await onSubmit({ placements })

        return {
          isCorrect: result.isCorrect,
          correctPlacements: result.correctAnswer?.placements as { itemId: string; zoneId: string }[] | undefined,
        }
      }}
    />
  )
}
