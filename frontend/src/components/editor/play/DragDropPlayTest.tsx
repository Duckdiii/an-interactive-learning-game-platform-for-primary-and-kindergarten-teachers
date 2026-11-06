import DragDropRenderer from '../../../games/drag-drop/DragDropRenderer'
import type { DragDropQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

export default function DragDropPlayTest({ question, onResult }: PlayTestProps) {
  const dd = question as DragDropQuestion

  return (
    <DragDropRenderer
      mode="preview"
      question={dd}
      onAnswered={(placements) => {
        const isCorrect = dd.items.every((item) => {
          const placed = placements.find((p) => p.itemId === item.id)
          return placed && placed.zoneId === item.targetZoneId
        })
        onResult(isCorrect)
      }}
    />
  )
}
