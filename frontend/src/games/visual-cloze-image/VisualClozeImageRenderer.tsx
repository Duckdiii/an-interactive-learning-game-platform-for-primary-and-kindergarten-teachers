import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, TouchEvent } from 'react'
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva'
import useImage from 'use-image'
import { useGamePalette } from '../common/useGamePalette'
import OptionImage from '../audio-visual-match/OptionImage'
import type { StudentImageOption } from '../../types/game-student.types'
import type { VisualClozeImageBlank, VisualClozeImageQuestion } from './visualClozeImageTypes'
import { getSceneScale } from './visualClozeImageLayout'
import type { AnswerResult, StudentVisualClozeImagePlacement } from '../../types/game-student.types'
import { useAnswerAudio } from '../common/useAnswerAudio'

interface Props {
  question: VisualClozeImageQuestion
  onSubmit: (answer: { placements: StudentVisualClozeImagePlacement[] }) => Promise<AnswerResult>
}

const MAX_SCENE_WIDTH = 900
const MAX_SCENE_HEIGHT = 460
const OPTION_SIZE = 112
const OPTION_GAP = 20
const BLANK_SIZE = 100
const DROP_HITBOX_SIZE = 150

export default function VisualClozeImageRenderer({ question, onSubmit }: Props) {
  return <VisualClozeImageRendererContent key={question.id} question={question} onSubmit={onSubmit} />
}

function VisualClozeImageRendererContent({ question, onSubmit }: Props) {
  const palette = useGamePalette()
  const activeRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const touchDragRef = useRef<{ id: number; optionId: string; x: number; y: number } | null>(null)
  const completedRef = useRef(false)
  const pendingRef = useRef(false)
  const [viewport, setViewport] = useState({ width: 0, height: MAX_SCENE_HEIGHT })
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [filledBlanks, setFilledBlanks] = useState<Record<string, string>>(() =>
    Object.fromEntries((question.acceptedPlacements ?? []).map(({ blankId, optionId }) => [blankId, optionId])))
  const [submissionFailed, setSubmissionFailed] = useState(false)
  const [failedPlacement, setFailedPlacement] = useState<StudentVisualClozeImagePlacement | null>(null)
  const [rejectedPlacement, setRejectedPlacement] = useState<StudentVisualClozeImagePlacement | null>(null)
  const [wrongBlankId, setWrongBlankId] = useState<string | null>(null)
  const [shakeSequence, setShakeSequence] = useState(0)
  const [shakeOffset, setShakeOffset] = useState(0)
  const [pending, setPending] = useState(false)
  const [sceneImage, sceneStatus] = useImage(question.sceneImageUrl ?? '', 'anonymous')
  const playFeedback = useAnswerAudio()

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])

  useEffect(() => {
    if (!wrongBlankId || shakeSequence === 0) return
    const offsets = [6, -6, 4, -4, 0]
    let step = 0
    setShakeOffset(offsets[step])
    const timer = window.setInterval(() => {
      step += 1
      setShakeOffset(offsets[step])
      if (step === offsets.length - 1) window.clearInterval(timer)
    }, 60)
    return () => window.clearInterval(timer)
  }, [wrongBlankId, shakeSequence])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateSize = () => setViewport({ width: Math.min(container.clientWidth, MAX_SCENE_WIDTH), height: MAX_SCENE_HEIGHT })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const valid = useMemo(() => {
    const { blanks, options, sceneWidth, sceneHeight } = question
    if (typeof question.questionText !== 'string' || !question.questionText.trim() || !question.sceneImageUrl || !Number.isFinite(sceneWidth) || !Number.isFinite(sceneHeight) || sceneWidth <= 0 || sceneHeight <= 0) return false
    if (!Array.isArray(blanks) || blanks.length === 0 || !Array.isArray(options) || options.length < blanks.length) return false
    if (blanks.some((blank) => !blank || typeof blank !== 'object') || options.some((option) => !option || typeof option !== 'object')) return false
    const blankIds = blanks.map((blank) => blank.id)
    const optionIds = options.map((option) => option.id)
    if (blankIds.some((id) => typeof id !== 'string' || !id.trim()) || new Set(blankIds).size !== blankIds.length) return false
    if (optionIds.some((id) => typeof id !== 'string' || !id.trim()) || new Set(optionIds).size !== optionIds.length) return false
    if (options.some((option) => typeof option.visualPrompt !== 'string' || !option.visualPrompt.trim())) return false
    return blanks.every((blank) =>
      Number.isFinite(blank.x) && Number.isFinite(blank.y) &&
      blank.x >= BLANK_SIZE / 2 && blank.x <= sceneWidth - BLANK_SIZE / 2 &&
      blank.y >= BLANK_SIZE / 2 && blank.y <= sceneHeight - BLANK_SIZE / 2)
  }, [question])

  const scale = valid ? getSceneScale({ width: question.sceneWidth, height: question.sceneHeight }, viewport) : null
  const optionCount = Array.isArray(question.options) ? question.options.length : 0
  const tileSize = optionCount > 0 ? Math.min(OPTION_SIZE, Math.max(72, (Math.max(question.sceneWidth, 320) - 32 - (optionCount - 1) * OPTION_GAP) / optionCount)) : OPTION_SIZE
  const trayWidth = optionCount * tileSize + Math.max(0, optionCount - 1) * OPTION_GAP

  const submitPlacement = useCallback(async (placement: StudentVisualClozeImagePlacement) => {
    if (completedRef.current || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setSubmissionFailed(false)
    setFailedPlacement(null)
    try {
      const result = await onSubmit({ placements: [placement] })
      if (!activeRef.current) return
      if (result.placementCorrect === true || result.status === 'CORRECT' && result.isCorrect) {
        setFilledBlanks((current) => ({ ...current, [placement.blankId]: placement.optionId }))
        setRejectedPlacement(null)
        setSelectedOptionId(null)
        setWrongBlankId(null)
        if (result.status === 'CORRECT') completedRef.current = true
        playFeedback(true)
      } else if (result.placementCorrect === false) {
        setWrongBlankId(placement.blankId)
        setShakeSequence((sequence) => sequence + 1)
        setRejectedPlacement(placement)
        playFeedback(false)
      } else {
        throw new Error('Invalid image placement result')
      }
    } catch {
      if (!activeRef.current) return
      setSubmissionFailed(true)
      setFailedPlacement(placement)
    } finally {
      if (activeRef.current) {
        pendingRef.current = false
        setPending(false)
      }
    }
  }, [onSubmit, playFeedback])

  const tapBlank = (blank: VisualClozeImageBlank) => {
    if (!selectedOptionId || filledBlanks[blank.id] || pending) return
    void submitPlacement({ blankId: blank.id, optionId: selectedOptionId })
  }

  const placeAt = (optionId: string, clientX: number, clientY: number) => {
    if (!optionId || pending || !question.options.some((option) => option.id === optionId) || !scale) return
    const bounds = sceneRef.current?.getBoundingClientRect()
    if (!bounds) return
    if (bounds.width <= 0 || bounds.height <= 0) return
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return
    const sceneX = (clientX - bounds.left) * question.sceneWidth / bounds.width
    const sceneY = (clientY - bounds.top) * question.sceneHeight / bounds.height
    const blank = question.blanks
      .filter((candidate) => !filledBlanks[candidate.id]
        && Math.abs(sceneX - candidate.x) <= DROP_HITBOX_SIZE / 2
        && Math.abs(sceneY - candidate.y) <= DROP_HITBOX_SIZE / 2)
      .sort((first, second) => Math.hypot(sceneX - first.x, sceneY - first.y) - Math.hypot(sceneX - second.x, sceneY - second.y))[0]
    if (!blank) return
    setSelectedOptionId(optionId)
    void submitPlacement({ blankId: blank.id, optionId })
  }

  const allowDrop = (event: DragEvent<HTMLDivElement>) => event.preventDefault()
  const dropOption = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    placeAt(event.dataTransfer.getData('text/plain'), event.clientX, event.clientY)
  }

  const startTouchDrag = (event: TouchEvent<HTMLButtonElement>, optionId: string) => {
    if (pending || event.touches.length !== 1) return
    const touch = event.touches[0]
    touchDragRef.current = { id: touch.identifier, optionId, x: touch.clientX, y: touch.clientY }
    setSelectedOptionId(optionId)
  }

  const endTouchDrag = (event: TouchEvent<HTMLButtonElement>) => {
    const drag = touchDragRef.current
    touchDragRef.current = null
    if (!drag) return
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === drag.id)
    if (!touch || Math.hypot(touch.clientX - drag.x, touch.clientY - drag.y) < 10) return
    if (event.cancelable) event.preventDefault()
    placeAt(drag.optionId, touch.clientX, touch.clientY)
  }

  return (
    <div ref={containerRef} className="w-full">
      {!valid ? <p role="status" className="py-8 text-center font-bold">Câu hỏi hình ảnh chưa sẵn sàng</p> : sceneStatus === 'failed' ? (
        <p role="status" className="py-8 text-center font-bold">Không tải được tranh cho câu hỏi này</p>
      ) : sceneStatus === 'loading' || !sceneImage || !scale ? (
        <><p className="mb-3 text-center font-bold">{question.questionText}</p><p role="status" className="py-8 text-center">Đang tải tranh…</p></>
      ) : (
        <>
          <p className="mb-3 text-center font-bold">{question.questionText}</p>
          <div ref={sceneRef} data-testid="visual-cloze-scene-drop-zone" onDragOver={allowDrop} onDrop={dropOption}
            className="relative mx-auto" style={{ width: question.sceneWidth * scale, height: question.sceneHeight * scale }}>
            <Stage width={question.sceneWidth * scale} height={question.sceneHeight * scale} scaleX={scale} scaleY={scale}>
              <Layer>
                <KonvaImage image={sceneImage} width={question.sceneWidth} height={question.sceneHeight} listening={false} />
                {question.blanks.map((blank) => {
                  const rejectedOptionId = rejectedPlacement?.blankId === blank.id ? rejectedPlacement.optionId : null
                  const optionId = filledBlanks[blank.id] ?? rejectedOptionId
                  const option = optionId ? question.options.find((item) => item.id === optionId) : undefined
                  const studentOption: StudentImageOption | undefined = option && { id: option.id, visualPrompt: option.visualPrompt, imageUrl: option.imageUrl }
                  const isRejected = Boolean(rejectedOptionId && !filledBlanks[blank.id])
                  return <Group key={blank.id} name={`visual-cloze-blank-${blank.id}`}
                    x={blank.x - BLANK_SIZE / 2 + (wrongBlankId === blank.id ? shakeOffset : 0)} y={blank.y - BLANK_SIZE / 2}
                    onClick={() => tapBlank(blank)} onTap={() => tapBlank(blank)}>
                    {studentOption ? <OptionImage option={studentOption} x={0} y={0} size={BLANK_SIZE} imageInset={2} transparentBackground state={isRejected ? 'wrong' : 'correct'} disabled onSelect={() => undefined} /> :
                      <Rect width={BLANK_SIZE} height={BLANK_SIZE} cornerRadius={12}
                        stroke={wrongBlankId === blank.id ? palette.audioVisualWrongLine : palette.audioStroke}
                        strokeWidth={wrongBlankId === blank.id ? 4 : 3} dash={[8, 6]} fill="transparent" />}
                  </Group>
                })}
                {question.blanks.every((blank) => Boolean(filledBlanks[blank.id])) &&
                  <Text text="Hoàn thành!" x={0} y={12} width={question.sceneWidth} align="center" fontSize={30} fontStyle="bold" fill={palette.ink} listening={false} />}
              </Layer>
            </Stage>
          </div>
          <div className="mx-auto mt-4 flex flex-wrap justify-center gap-3" style={{ maxWidth: Math.max(question.sceneWidth, trayWidth) }}>
            {question.options.filter((option) => !Object.values(filledBlanks).includes(option.id)).map((option) => {
              const studentOption: StudentImageOption = { id: option.id, visualPrompt: option.visualPrompt, imageUrl: option.imageUrl }
              return <button key={option.id} type="button" aria-label={option.visualPrompt} aria-pressed={selectedOptionId === option.id} disabled={pending} draggable={!pending}
                className="rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-2" style={{ width: tileSize, height: tileSize, touchAction: 'none' }}
                onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', option.id); setSelectedOptionId(option.id) }}
                onTouchStart={(event) => startTouchDrag(event, option.id)}
                onTouchEnd={endTouchDrag}
                onTouchCancel={() => { touchDragRef.current = null }}
                onClick={() => { setSelectedOptionId(option.id); setWrongBlankId(null); setSubmissionFailed(false) }}>
                <Stage width={tileSize} height={tileSize}>
                  <Layer><OptionImage option={studentOption} x={0} y={0} size={tileSize} transparentBackground state={selectedOptionId === option.id ? 'selected' : 'idle'} disabled onSelect={() => undefined} /></Layer>
                </Stage>
              </button>
            })}
          </div>
          {submissionFailed && failedPlacement ? <button type="button" className="mt-3 rounded-xl px-4 py-2 font-bold"
            onClick={() => void submitPlacement(failedPlacement)}>Thử gửi lại</button> : null}
          <p aria-live="polite" className="sr-only">{selectedOptionId ? `Đã chọn ${question.options.find((option) => option.id === selectedOptionId)?.visualPrompt}` : ''}</p>
        </>
      )}
    </div>
  )
}
