import WordScrambleRenderer from '../../games/word-scramble/WordScrambleRenderer'
import type { PlayableRendererProps } from './types'

/** Adapter: đưa `WordScrambleRenderer` (mode play, nộp một lần sau «Xong rồi!») về hợp đồng chung. */
export default function WordScramblePlayable({ question, onSubmit }: PlayableRendererProps<'WORD_SCRAMBLE'>) {
  return (
    <WordScrambleRenderer
      mode="play"
      question={question}
      onAnswered={async (word) => {
        const result = await onSubmit({ word })

        return {
          isCorrect: result.isCorrect,
          correctWord: typeof result.correctAnswer?.word === 'string' ? result.correctAnswer.word : undefined,
        }
      }}
    />
  )
}
