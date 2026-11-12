import AudioVisualMatchRenderer from '../../../games/audio-visual-match/AudioVisualMatchRenderer'
import { seededShuffle } from '../../../games/common/seededDerangement'
import type { AudioVisualMatchQuestion } from '../../../types/game-dsl.types'
import type { AnswerResult, StudentAudioVisualMatchQuestion } from '../../../types/game-student.types'
import type { PlayTestProps } from './playTestRegistry'

/** Chấm AVM trong trình duyệt để giáo viên thử renderer và âm báo mà không tạo session hoặc gọi API. */
export default function AudioVisualMatchPlayTest({ question, subject, onResult }: PlayTestProps) {
  const avm = question as AudioVisualMatchQuestion
  const choices = seededShuffle([
    { visualPrompt: avm.correct.visualPrompt, imageUrl: avm.correct.imageUrl, correct: true },
    ...avm.distractors.map((choice) => ({ ...choice, correct: false })),
  ], avm.id)
  const options = choices.map((choice, index) => ({
    id: String.fromCharCode(97 + index),
    visualPrompt: choice.visualPrompt,
    ...(choice.imageUrl ? { imageUrl: choice.imageUrl } : {}),
  }))
  const correctIndex = choices.findIndex((choice) => choice.correct)
  const studentQuestion: StudentAudioVisualMatchQuestion = {
    ...avm,
    audioText: avm.audioText,
    options,
  }
  const correctOptionId = options[correctIndex]?.id

  const onSubmit = async ({ selectedOptionId }: { selectedOptionId: string }): Promise<AnswerResult> => {
    const isCorrect = selectedOptionId === correctOptionId
    onResult(isCorrect)
    return {
      status: isCorrect ? 'CORRECT' : 'INCORRECT',
      isCorrect,
      pointsEarned: isCorrect ? avm.points : 0,
      totalScore: isCorrect ? avm.points : 0,
      correctAnswer: { selectedOptionId: correctOptionId },
    }
  }

  return <AudioVisualMatchRenderer question={studentQuestion} onSubmit={onSubmit}
    ttsLanguage={subject === 'ENGLISH' ? 'en-US' : 'vi-VN'} />
}
