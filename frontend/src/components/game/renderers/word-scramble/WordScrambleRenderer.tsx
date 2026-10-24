import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { Bounds, Point } from '../../../../types/dragDrop'
import type { WordScrambleAnswer, WordScrambleQuestion } from '../../../../types/wordScramble'
import Confetti from '../drag-drop/Confetti'
import useDropAudio from '../drag-drop/useDropAudio'
import { hasSameLetters, matchesWordPosition } from './logic'

interface Props {
  question: WordScrambleQuestion
  participantId: string
  previewMode?: boolean
  onAnswered: (answer: WordScrambleAnswer) => void | Promise<void>
  onPreviewCompleted?: (answer: WordScrambleAnswer) => void
}

interface LetterTile {
  tileId: string
  character: string
}

const TILE_SIZE = 68
const GAP = 12
const PAD = 16
const SLOT_HEIGHT = 80

function LetterSlot({ bounds, filledLetter }: { index: number; bounds: Bounds; filledLetter: string | null }) {
  return (
    <Group x={bounds.x} y={bounds.y} listening={false}>
      <Rect width={bounds.width} height={bounds.height} cornerRadius={10} fill="#FFF" stroke="#333" strokeWidth={2} />
      <Line points={[10, 70, bounds.width - 10, 70]} stroke="#999" strokeWidth={2} />
      {filledLetter !== null && <Text text={filledLetter} fontSize={40} fontStyle="bold" y={15} width={bounds.width} align="center" />}
    </Group>
  )
}

function LetterTileView({ tile, position, size, locked, shake, onDragStart, onDrop }: {
  tile: LetterTile
  position: Point
  size: number
  locked: boolean
  shake: number
  onDragStart: () => void
  onDrop: (position: Point) => Point
}) {
  const [dragging, setDragging] = useState(false)
  const visual = useRef<Konva.Group>(null)
  const tween = useRef<Konva.Tween | null>(null)

  useEffect(() => {
    if (!shake || !visual.current) return
    const node = visual.current
    let cancelled = false
    const offsets = [5, -5, 3, -3, 0]
    let step = 0
    const animate = () => {
      if (cancelled) return
      const currentTween = new Konva.Tween({
        node, x: offsets[step++], duration: 0.06, easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          currentTween.destroy()
          if (step < offsets.length) animate()
          else tween.current = null
        },
      })
      tween.current = currentTween
      currentTween.play()
    }
    animate()
    return () => {
      cancelled = true
      tween.current?.destroy()
      tween.current = null
      node.x(0)
    }
  }, [shake])

  return (
    <Group x={position.x} y={position.y} draggable={!locked}
      onDragStart={(event) => {
        tween.current?.destroy()
        tween.current = null
        visual.current?.x(0)
        setDragging(true)
        event.target.moveToTop()
        onDragStart()
      }}
      onDragEnd={(event) => {
        event.target.position(onDrop(event.target.position()))
        setDragging(false)
      }}>
      <Group ref={visual}>
        {!locked && <Rect width={size} height={TILE_SIZE} cornerRadius={12}
          fill="#ffffff" stroke={dragging ? '#4797bd' : '#ccd5d9'} strokeWidth={dragging ? 3 : 2}
          shadowColor="#334155" shadowBlur={dragging ? 12 : 4} shadowOpacity={0.12} shadowOffsetY={dragging ? 5 : 2} />}
        {!locked && <Text text={tile.character} width={size} height={TILE_SIZE} y={11} fontSize={Math.min(42, size * 0.62)}
          fontStyle="bold" align="center" verticalAlign="middle" fill="#263b3d" listening={false} />}
      </Group>
    </Group>
  )
}

function validateQuestion(question: WordScrambleQuestion) {
  if (!question.questionId || !question.targetWord?.trim() || !question.scrambledLetters?.length) {
    return 'Câu hỏi cần có từ đích và các chữ cái đã xáo trộn.'
  }
  if ([...question.targetWord].length !== question.scrambledLetters.length ||
    question.scrambledLetters.some((letter) => [...letter].length !== 1) ||
    !hasSameLetters(question.targetWord, question.scrambledLetters)) {
    return 'Khay cần chứa đúng các chữ cái có trong từ đích.'
  }
  return null
}

export default function WordScrambleRenderer(props: Props) {
  const error = validateQuestion(props.question)
  const [round, setRound] = useState(0)
  if (error) return <p role="alert" className="py-6 text-amber-800">{error}</p>
  return <WordScrambleRound key={`${JSON.stringify(props.question)}:${props.participantId}:${props.previewMode}:${round}`}
    {...props} onReset={() => setRound((value) => value + 1)} />
}

function WordScrambleRound({ question, participantId, previewMode = false, onAnswered, onPreviewCompleted, onReset }:
  Props & { onReset: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const wordLength = [...question.targetWord].length
  const boardWidth = Math.max(width, PAD * 2 + wordLength * 70 + (wordLength - 1) * GAP)
  const tileSize = TILE_SIZE
  const [slotLetters, setSlotLetters] = useState<(string | null)[]>(new Array(wordLength).fill(null))
  const slotLettersRef = useRef<(string | null)[]>(new Array(wordLength).fill(null))
  const [tileSlots, setTileSlots] = useState<Record<string, number>>({})
  const tileSlotsRef = useRef<Record<string, number>>({})
  const [shakes, setShakes] = useState<Record<string, number>>({})
  const [message, setMessage] = useState('')
  const [submission, setSubmission] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const submitting = useRef(false)
  const mounted = useRef(true)
  const answerRef = useRef<WordScrambleAnswer | null>(null)
  const [startedAt] = useState(() => performance.now())
  const letterTiles = useMemo(() => question.scrambledLetters.map((character, i) => ({ tileId: `L${i}`, character })),
    [question.questionId])
  const slotWidth = 70
  const slotBounds = useMemo<Bounds[]>(() => {
    const slotGap = GAP
    const rowWidth = wordLength * slotWidth + (wordLength - 1) * slotGap
    const startX = (boardWidth - rowWidth) / 2
    return Array.from({ length: wordLength }, (_, index) => ({
      x: startX + index * (slotWidth + slotGap), y: PAD + 12, width: slotWidth, height: SLOT_HEIGHT,
    }))
  }, [boardWidth, wordLength, slotWidth])
  const trayColumns = Math.max(1, Math.floor((boardWidth - PAD * 2 + GAP) / (tileSize + GAP)))
  const trayRows = Math.ceil(letterTiles.length / trayColumns)
  const trayY = PAD + SLOT_HEIGHT + 30
  const trayHeight = 42 + trayRows * (TILE_SIZE + GAP)
  const layout = useMemo(() => {
    const trayPositions: Record<string, Point> = {}
    letterTiles.forEach((tile, index) => {
      const row = Math.floor(index / trayColumns)
      const rowCount = Math.min(trayColumns, letterTiles.length - row * trayColumns)
      const rowWidth = rowCount * tileSize + (rowCount - 1) * GAP
      trayPositions[tile.tileId] = {
        x: (boardWidth - rowWidth) / 2 + (index % trayColumns) * (tileSize + GAP),
        y: trayY + 34 + row * (TILE_SIZE + GAP),
      }
    })
    return { trayPositions, height: trayY + trayHeight + PAD }
  }, [boardWidth, letterTiles, trayColumns, trayY, trayHeight, tileSize])
  const completed = slotLetters.every((letter) => letter !== null)
  const audio = useDropAudio(true, question.targetWord, question.audioPromptUrl)

  useEffect(() => {
    mounted.current = true
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.min(800, Math.floor(entry.contentRect.width)))))
    if (container.current) observer.observe(container.current)
    return () => { mounted.current = false; observer.disconnect() }
  }, [])

  const submitAnswer = async (answer: WordScrambleAnswer) => {
    if (submitting.current) return
    submitting.current = true
    setSubmission('pending')
    try {
      if (previewMode) onPreviewCompleted?.(answer)
      else await onAnswered(answer)
      if (mounted.current) setSubmission('success')
    } catch {
      if (mounted.current) setSubmission('error')
    } finally {
      submitting.current = false
    }
  }

  const handleDrop = (tile: LetterTile, position: Point): Point => {
    const center = { x: position.x + tileSize / 2, y: position.y + TILE_SIZE / 2 }
    const targetSlotIndex = slotBounds.reduce<{ index: number; distance: number } | null>((nearest, bounds, index) => {
      const dx = center.x - (bounds.x + bounds.width / 2)
      const dy = center.y - (bounds.y + bounds.height / 2)
      const distance = Math.hypot(dx, dy)
      return !nearest || distance < nearest.distance ? { index, distance } : nearest
    }, null)
    const candidate = targetSlotIndex && targetSlotIndex.distance <= Math.max(54, slotWidth) ? targetSlotIndex.index : null
    if (candidate === null || slotLettersRef.current[candidate] !== null) return layout.trayPositions[tile.tileId]

    if (matchesWordPosition(question.targetWord, tile.character, candidate)) {
      const nextLetters = [...slotLettersRef.current]
      nextLetters[candidate] = tile.character
      slotLettersRef.current = nextLetters
      setSlotLetters(nextLetters)
      const nextTiles = { ...tileSlotsRef.current, [tile.tileId]: candidate }
      tileSlotsRef.current = nextTiles
      setTileSlots(nextTiles)
      setMessage('Đúng rồi! Bé tìm chữ tiếp theo nhé!')
      audio.play('correct')
      if (nextLetters.every((letter) => letter !== null) && !answerRef.current) {
        const answer = {
          participantId, questionId: question.questionId, completedWord: question.targetWord,
          timeSpentMs: Math.max(0, Math.round(performance.now() - startedAt)),
        }
        answerRef.current = answer
        void submitAnswer(answer)
      }
      const bounds = slotBounds[candidate]
      return { x: bounds.x + (bounds.width - tileSize) / 2, y: bounds.y + 6 }
    }
    setShakes((current) => ({ ...current, [tile.tileId]: (current[tile.tileId] ?? 0) + 1 }))
    setMessage('Chữ này chưa đúng vị trí. Bé thử lại nhé!')
    audio.play('retry')
    return layout.trayPositions[tile.tileId]
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div><h3 className="text-lg font-semibold text-slate-900">Ghép các chữ cái thành từ đúng</h3>
          <p className="mt-1 text-sm text-slate-500">{slotLetters.filter((letter) => letter !== null).length} / {wordLength} chữ cái</p></div>
        <button type="button" onClick={audio.replayPrompt} disabled={previewMode || !audio.canReplay}
          className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50" aria-label="Nghe từ mẫu">🔊 Nghe từ mẫu</button>
      </div>
      <div className="mb-4 flex min-h-24 justify-center">
        {question.hintImageUrl ? <img src={question.hintImageUrl} alt="Gợi ý hình ảnh cho từ cần ghép" className="max-h-40 max-w-full rounded-lg object-contain" />
          : <div className="grid min-h-24 w-full place-items-center rounded-lg bg-amber-50 text-sm text-amber-800">Hình gợi ý chưa có</div>}
      </div>
      <div ref={container} className="mx-auto w-full max-w-[800px] overflow-x-auto overflow-y-hidden rounded-lg bg-white"
        style={{ touchAction: 'pan-x' }} aria-label="Kéo chữ cái vào đúng vị trí" role="group">
        <Stage width={boardWidth} height={layout.height}>
          <Layer>
            <Rect width={boardWidth} height={layout.height} fill="#fafcfc" listening={false} />
            {slotBounds.map((bounds, index) => <LetterSlot key={index} index={index} bounds={bounds} filledLetter={slotLetters[index]} />)}
            <Rect x={PAD} y={trayY} width={boardWidth - PAD * 2} height={trayHeight} cornerRadius={12} fill="#f0f1f6" listening={false} />
            <Text text="Khay chữ cái" x={PAD} y={trayY + 10} width={boardWidth - PAD * 2} align="center" fontSize={14} fill="#626b7e" listening={false} />
            {letterTiles.map((tile) => {
              const slotIndex = tileSlots[tile.tileId]
              const position = slotIndex === undefined ? layout.trayPositions[tile.tileId] : {
                x: slotBounds[slotIndex].x + (slotBounds[slotIndex].width - tileSize) / 2, y: slotBounds[slotIndex].y + 6,
              }
              return <LetterTileView key={`${tile.tileId}:${width}`} tile={tile} position={position} size={tileSize}
                locked={slotIndex !== undefined} shake={shakes[tile.tileId] ?? 0}
                onDragStart={() => setMessage('')} onDrop={(dropPosition) => handleDrop(tile, dropPosition)} />
            })}
          </Layer>
          {completed ? <Confetti width={boardWidth} height={layout.height} /> : null}
        </Stage>
      </div>
      {!previewMode ? <div className="mt-3 flex justify-end">
        <button type="button" onClick={onReset} disabled={submission === 'pending'}
          className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">Chơi lại</button>
      </div> : null}
      <p role="status" aria-live="polite" className="min-h-12 py-3 text-sm font-medium text-emerald-800">
        {completed ? 'Giỏi quá! Bé đã ghép đúng từ.' : message}
      </p>
      {audio.audioFailed ? <p className="text-sm text-amber-800">Âm thanh tạm thời không khả dụng.</p> : null}
      {!previewMode && submission === 'pending' ? <p role="status" className="text-sm text-slate-600">Đang ghi nhận kết quả…</p> : null}
      {submission === 'error' ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-amber-800">
        <span>Chưa gửi được kết quả. Bài làm của bé vẫn được giữ lại.</span>
        <button type="button" className="min-h-11 rounded-md border border-amber-300 px-3 font-semibold"
          onClick={() => { if (answerRef.current) void submitAnswer(answerRef.current) }}>Thử lại</button>
      </div> : null}
    </div>
  )
}
