import { useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Rect, Stage, Text } from 'react-konva'
import type { DragDropQuestion, PlacementAnswer, PlacedState, Point } from '../../../../types/dragDrop'
import Confetti from './Confetti'
import DraggableItem from './DraggableItem'
import DropZoneRect from './DropZoneRect'
import { createBoardLayout, resolveDrop, validateQuestion } from './geometry'
import useDropAudio from './useDropAudio'

export interface DragDropRendererProps {
  question: DragDropQuestion
  participantId: string
  previewMode?: boolean
  onAnswered: (answer: PlacementAnswer) => void | Promise<void>
  onPreviewCompleted?: (answer: PlacementAnswer) => void
}

function createAnswer(question: DragDropQuestion, participantId: string, placed: PlacedState, startedAt: number): PlacementAnswer {
  return {
    participantId, questionId: question.questionId,
    placements: question.draggableItems.map((item) => ({ itemId: item.itemId, zoneId: placed[item.itemId].zoneId })),
    timeSpentMs: Math.max(0, Math.round(performance.now() - startedAt)),
  }
}

export default function DragDropRenderer(props: DragDropRendererProps) {
  const error = validateQuestion(props.question)
  const [round, setRound] = useState(0)
  if (error) return <p role="alert" className="py-6 text-amber-800">{error}</p>
  return <DragDropRound key={`${JSON.stringify(props.question)}:${props.participantId}:${props.previewMode}:${round}`}
    {...props} onReset={() => setRound((value) => value + 1)} />
}

function DragDropRound({ question, participantId, previewMode = false, onAnswered, onPreviewCompleted, onReset }:
  DragDropRendererProps & { onReset: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [placed, setPlaced] = useState<PlacedState>({})
  const placedRef = useRef<PlacedState>({})
  const [shakes, setShakes] = useState<Record<string, number>>({})
  const [hint, setHint] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [submission, setSubmission] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const answerRef = useRef<PlacementAnswer | null>(null)
  const submittingRef = useRef(false)
  const mounted = useRef(true)
  const [startedAt] = useState(() => performance.now())
  const layout = useMemo(() => createBoardLayout(question, width), [question, width])
  const audio = useDropAudio(soundEnabled, question.prompt, question.promptAudioUrl)
  const completed = Object.keys(placed).length === question.draggableItems.length

  useEffect(() => {
    mounted.current = true
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, Math.min(800, Math.floor(entry.contentRect.width))))
    })
    if (container.current) observer.observe(container.current)
    return () => { mounted.current = false; observer.disconnect() }
  }, [])

  const submitAnswer = async (answer: PlacementAnswer) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmission('pending')
    try {
      if (previewMode) onPreviewCompleted?.(answer)
      else await onAnswered(answer)
      if (mounted.current) setSubmission('success')
    } catch {
      if (mounted.current) setSubmission('error')
    } finally {
      submittingRef.current = false
    }
  }

  const handleDrop = (itemId: string, position: Point): Point => {
    const result = resolveDrop(layout, question, placedRef.current, itemId, position)
    const item = question.draggableItems.find((candidate) => candidate.itemId === itemId)!
    if (result.outcome === 'correct') {
      const next: PlacedState = { ...placedRef.current, [itemId]: { zoneId: result.zoneId, correct: true } }
      placedRef.current = next
      setPlaced(next)
      setHint(null)
      setMessage(`${item.label}: đúng rồi!`)
      audio.play('correct')
      if (Object.keys(next).length === question.draggableItems.length && !answerRef.current) {
        const answer = createAnswer(question, participantId, next, startedAt)
        answerRef.current = answer
        void submitAnswer(answer)
      }
    } else if (result.outcome === 'wrong') {
      setShakes((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }))
      setHint(result.zoneId)
      const correctZone = question.dropZones.find((zone) => zone.zoneId === result.zoneId)!
      setMessage(`${item.label} thuộc rổ “${correctZone.label}”. Bé thử lại nhé!`)
      audio.play('retry')
    } else if (result.outcome === 'miss') {
      setHint(null)
      setMessage('Bé thử đưa vật thể vào một chiếc rổ nhé!')
    }
    return result.position
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{question.prompt}</h3>
          <p className="mt-1 text-sm text-slate-500">{Object.keys(placed).length} / {question.draggableItems.length} vật thể</p>
        </div>
        <button type="button" onClick={audio.replayPrompt} disabled={!audio.canReplay}
          className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">Nghe lại</button>
      </div>
      <div ref={container} className="mx-auto w-full max-w-[800px] overflow-hidden rounded-lg bg-white"
        style={{ touchAction: 'none' }} aria-label="Bảng kéo thả phân loại" role="group">
        <Stage width={layout.width} height={layout.height}>
          <Layer>
            <Rect width={layout.width} height={layout.height} fill="#fafcfc" listening={false} />
            {layout.zones.map((zone) => <DropZoneRect key={zone.zoneId} zone={zone} highlighted={hint === zone.zoneId} />)}
            <Rect {...layout.trayBounds} cornerRadius={12} fill="#f0f1f6" listening={false} />
            <Text text="Khay vật thể" x={layout.trayBounds.x} y={layout.trayBounds.y + 12}
              width={layout.trayBounds.width} align="center" fontSize={14} fill="#626b7e" listening={false} />
            {question.draggableItems.map((item) => (
              <DraggableItem key={`${item.itemId}:${width}`} item={item}
                position={placed[item.itemId] ? layout.zonePositions[item.itemId] : layout.trayPositions[item.itemId]}
                locked={Boolean(placed[item.itemId])} shake={shakes[item.itemId] ?? 0}
                onDragStart={() => { setHint(null); setMessage('') }}
                onDrop={(position) => handleDrop(item.itemId, position)} />
            ))}
          </Layer>
          {completed ? <Confetti width={layout.width} height={layout.height} /> : null}
        </Stage>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} className="accent-emerald-600" />
          Âm thanh
        </label>
        <button type="button" onClick={onReset} disabled={submission === 'pending'}
          className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">Chơi lại</button>
      </div>
      <p role="status" aria-live="polite" className="min-h-12 py-3 text-sm font-medium text-emerald-800">
        {completed ? 'Giỏi quá! Bé đã phân loại đúng tất cả vật thể.' : message}
      </p>
      {audio.audioFailed ? <p className="text-sm text-amber-800">Âm thanh tạm thời không khả dụng.</p> : null}
      {submission === 'pending' ? <p role="status" className="text-sm text-slate-600">Đang ghi nhận kết quả…</p> : null}
      {submission === 'error' ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-amber-800">
          <span>Chưa gửi được kết quả. Bài làm của bé vẫn được giữ lại.</span>
          <button type="button" className="min-h-11 rounded-md border border-amber-300 px-3 font-semibold"
            onClick={() => { if (answerRef.current) void submitAnswer(answerRef.current) }}>Thử lại</button>
        </div>
      ) : null}
    </div>
  )
}
