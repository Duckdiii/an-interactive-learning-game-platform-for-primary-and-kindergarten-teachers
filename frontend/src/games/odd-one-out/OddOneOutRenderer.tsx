import confetti from 'canvas-confetti'
import { useEffect, useRef, useState } from 'react'
import { Layer } from 'react-konva'
import { viText } from '../../constants/viText'
import type { AnswerResult, StudentOddOneOutQuestion } from '../../types/game-student.types'
import OptionImage from '../audio-visual-match/OptionImage'
import ResponsiveStage from '../common/ResponsiveStage'
import { useAnswerAudio } from '../common/useAnswerAudio'
import { getOddOneOutLayout } from './oddOneOutLayout'

interface Props {
  question: StudentOddOneOutQuestion
  onSubmit: (answer: { selectedItemId: string }) => Promise<AnswerResult>
}

export default function OddOneOutRenderer(props: Props) {
  return <ImageQuestion key={JSON.stringify(props.question)} {...props} />
}

function ImageQuestion({ question, onSubmit }: Props) {
  const active = useRef(true)
  const locked = useRef(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const playFeedback = useAnswerAudio()
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  const items = Array.isArray(question.items) ? question.items : []
  const layout = getOddOneOutLayout(items.length)
  const valid = layout && items.every((item) => item && typeof item.id === 'string' && item.id.trim()
    && typeof item.text === 'string' && item.text.trim()
    && (item.imageUrl === undefined || typeof item.imageUrl === 'string'))
    && new Set(items.map((item) => item.id)).size === items.length

  const select = async (id: string) => {
    if (locked.current) return
    locked.current = true
    setSelectedId(id)
    setPending(true)
    setFailed(false)
    try {
      const answer = await onSubmit({ selectedItemId: id })
      if (!active.current) return
      if (typeof answer?.isCorrect !== 'boolean') throw new Error('Invalid grading result')
      setResult(answer)
      if (answer.isCorrect) {
        // A failed visual/audio effect must not invalidate an already graded answer.
        try { void confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } })?.catch(() => {}) } catch { /* Effect unavailable. */ }
      }
      playFeedback(answer.isCorrect)
    } catch {
      if (!active.current) return
      locked.current = false
      setSelectedId(null)
      setFailed(true)
    } finally {
      if (active.current) setPending(false)
    }
  }

  if (!valid || !layout) return <p role="status">Câu hỏi chưa sẵn sàng</p>
  const rawCorrectId = result?.correctAnswer?.selectedItemId
  const correctId = result?.isCorrect ? selectedId
    : typeof rawCorrectId === 'string' && rawCorrectId !== selectedId && items.some((item) => item.id === rawCorrectId) ? rawCorrectId : null

  return <div>
    <p className="mx-6 mb-3 break-words text-center text-xl font-bold">
      {question.questionText || viText.player.oddOneOutPrompt}
    </p>
    <ResponsiveStage width={layout.width} height={layout.height - 72}>
      <Layer>
        {items.map((item, index) => {
          const correct = result && item.id === correctId
          const wrong = result && !result.isCorrect && item.id === selectedId
          const state = correct ? 'correct' : wrong ? 'wrong' : item.id === selectedId ? 'selected' : 'idle'
          return <OptionImage key={item.id} option={{ id: item.id, visualPrompt: item.text, imageUrl: item.imageUrl }}
            x={layout.positions[index].x} y={layout.positions[index].y - 72} size={layout.itemSize} state={state} disabled={pending || result !== null}
            onSelect={() => void select(item.id)} />
        })}
      </Layer>
    </ResponsiveStage>
    {failed && <p role="alert" className="p-3 text-center font-bold">Chưa gửi được câu trả lời. Con thử chọn lại nhé.</p>}
  </div>
}
