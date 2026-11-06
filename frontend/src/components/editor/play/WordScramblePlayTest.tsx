import WordScrambleRenderer from '../../../games/word-scramble/WordScrambleRenderer'
import type { WordScrambleQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

export default function WordScramblePlayTest({ question, onResult }: PlayTestProps) {
  const ws = question as WordScrambleQuestion

  return (
    <WordScrambleRenderer
      mode="preview"
      question={ws}
      onAnswered={(word) => {
        const isCorrect = word.trim().toLowerCase() === ws.correctWord.trim().toLowerCase()
        onResult(isCorrect)
      }}
    />
  )
}
