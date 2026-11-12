import confetti from 'canvas-confetti'
import { useEffect, useRef, useState } from 'react'
import { Layer, Text } from 'react-konva'
import type { AnswerResult, StudentAudioVisualMatchQuestion } from '../../types/game-student.types'
import QuestionAudioButton from '../common/QuestionAudioButton'
import ResponsiveStage from '../common/ResponsiveStage'
import { useQuestionAudio } from '../common/useQuestionAudio'
import { useAnswerAudio } from '../common/useAnswerAudio'
import OptionImage from './OptionImage'

interface AudioVisualMatchRendererProps {
  question: StudentAudioVisualMatchQuestion
  onSubmit: (answer: { selectedOptionId: string }) => Promise<AnswerResult>
  playAudio?: () => void
  ttsLanguage?: string
  answerDisabled?: boolean
}

const STAGE_WIDTH = 800
const OPTION_SIZE = 160
const OPTION_GAP = 32

export default function AudioVisualMatchRenderer({ question, onSubmit, playAudio, ttsLanguage = 'vi-VN', answerDisabled = false }: AudioVisualMatchRendererProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [pending, setPending] = useState(false)
  const locked = useRef(false)
  const active = useRef(true)
  const playLocalAudio = useQuestionAudio(playAudio ? undefined : question.audioUrl, {
    autoPlayOnMount: true, html5: true,
    ...(!playAudio ? { ttsText: question.audioText, ttsLanguage } : {}),
  })
  const playFeedback = useAnswerAudio()

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  const select = async (id: string) => {
    if (locked.current || answerDisabled) return
    locked.current = true
    setSelectedId(id)
    setPending(true)
    try {
      const verdict = await onSubmit({ selectedOptionId: id })
      if (!active.current) return
      if (typeof verdict?.isCorrect !== 'boolean') throw new Error('Invalid answer result')
      setResult(verdict)
      if (verdict.status === 'TIMEOUT' || verdict.status === 'SKIPPED') {
        setSelectedId(null)
      } else if (verdict.isCorrect) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } })
      }
      if (verdict.status === 'CORRECT' || verdict.status === 'INCORRECT') playFeedback(verdict.isCorrect)
    } catch {
      if (!active.current) return
      locked.current = false
      setSelectedId(null)
    } finally {
      if (active.current) setPending(false)
    }
  }

  const correctId = typeof result?.correctAnswer?.selectedOptionId === 'string'
    ? result.correctAnswer.selectedOptionId : null
  const options = Array.isArray(question.options) ? question.options : []
  const valid = options.length >= 2 && options.length <= 4 &&
    options.every((option) => typeof option?.id === 'string' && Boolean(option.id.trim())) &&
    new Set(options.map((option) => option.id)).size === options.length
  const rowWidth = options.length * OPTION_SIZE + (options.length - 1) * OPTION_GAP
  const startX = (STAGE_WIDTH - rowWidth) / 2

  return (
    <ResponsiveStage width={STAGE_WIDTH} height={380}>
      <Layer>
        <QuestionAudioButton y={30} onPress={playAudio ?? playLocalAudio} />
        {!valid && <Text text="Câu hỏi chưa sẵn sàng" x={0} y={160} width={STAGE_WIDTH} align="center" fontSize={24} />}
        {valid && options.map((option, index) => {
          const isCorrect = result && (correctId === option.id || (result.isCorrect && selectedId === option.id))
          const isWrong = result?.status === 'INCORRECT' && selectedId === option.id
          const state = isCorrect ? 'correct' : isWrong ? 'wrong' : selectedId === option.id ? 'selected' : 'idle'
          return <OptionImage key={option.id} option={option} x={startX + index * (OPTION_SIZE + OPTION_GAP)} y={170}
            size={OPTION_SIZE} state={state} disabled={answerDisabled || pending || result !== null} onSelect={() => void select(option.id)} />
        })}
      </Layer>
    </ResponsiveStage>
  )
}
