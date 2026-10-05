import { useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import MatchingRenderer from '../../games/matching/MatchingRenderer'
import {
  makeStudentFixture,
  mockMatchingQuestion,
  mockMatchingQuestionLongText,
  mockMatchingQuestionSixPairs,
  mockMatchingQuestionWithImages,
} from '../../games/matching/MatchingRenderer.fixtures'
import type { PairLink } from '../../games/matching/matchingTypes'
import QuizRenderer from '../../games/quiz/QuizRenderer'
import {
  mockQuizQuestion,
  mockQuizQuestionLongText,
  mockQuizQuestionNoMedia,
} from '../../games/quiz/QuizRenderer.fixtures'
import type { MatchingQuestion } from '../../types/game-dsl.types'

const QUIZ_QUESTIONS = {
  'Có audio/ảnh': mockQuizQuestion,
  'Không audio/ảnh': mockQuizQuestionNoMedia,
  'Câu hỏi dài 195 ký tự': mockQuizQuestionLongText,
} as const
type QuizQuestionKey = keyof typeof QUIZ_QUESTIONS

const MATCHING_QUESTIONS = {
  'Cơ bản (3 cặp)': mockMatchingQuestion,
  'Có ảnh': mockMatchingQuestionWithImages,
  '6 cặp': mockMatchingQuestionSixPairs,
  'Chữ dài 100 ký tự': mockMatchingQuestionLongText,
} as const
type MatchingQuestionKey = keyof typeof MATCHING_QUESTIONS

type Game = 'quiz' | 'matching'
type Mode = 'preview' | 'play' | 'review'

const sameLinkSet = (a: PairLink[], b: PairLink[]) =>
  a.length === b.length &&
  a.every((x) => b.some((y) => y.leftPairId === x.leftPairId && y.rightPairId === x.rightPairId))

/** Bài làm mẫu để thử `review`: nối sai hai cặp đầu (đổi chéo), các cặp còn lại đúng. */
function sampleReviewMatches(question: MatchingQuestion): PairLink[] {
  return question.pairs.map((pair, index) => {
    const swapWith = index === 0 ? 1 : index === 1 ? 0 : index
    return { leftPairId: pair.pairId, rightPairId: question.pairs[swapWith].pairId }
  })
}

/**
 * Trang tạm (dev-only, không route trong App.tsx) để render thử các Canvas Engine renderer bằng
 * fixture trước khi nối vào WorkspaceEditor/GamePlayer thật. Không phải 1 phần sản phẩm cuối.
 */
export default function CanvasSandbox() {
  const [game, setGame] = useState<Game>('matching')
  const [mode, setMode] = useState<Mode>('preview')
  const [quizKey, setQuizKey] = useState<QuizQuestionKey>('Có audio/ảnh')
  const [matchingKey, setMatchingKey] = useState<MatchingQuestionKey>('Cơ bản (3 cặp)')

  const quizQuestion = QUIZ_QUESTIONS[quizKey]
  const matchingQuestion = MATCHING_QUESTIONS[matchingKey]
  // Dạng học sinh dựng từ cùng câu hỏi, kèm đáp án để giả lập bước Backend chấm ở mode play.
  const matchingStudent = useMemo(() => makeStudentFixture(matchingQuestion), [matchingQuestion])

  // Prop phụ thuộc mode (xem từng renderer). Dựng object rồi spread để đổi mode vẫn giữ cùng một
  // instance component (với Quiz), thử được việc renderer tự đặt lại state khi mode đổi.
  const quizProps: ComponentProps<typeof QuizRenderer> =
    mode === 'preview'
      ? { question: quizQuestion, mode, onAnswered: (optionId) => console.log('onAnswered (preview)', optionId) }
      : mode === 'play'
        ? { question: quizQuestion, mode, onAnswered: (optionId) => optionId === quizQuestion.correctOptionId }
        : { question: quizQuestion, mode, selectedOptionId: 'a' }

  const matchingProps: ComponentProps<typeof MatchingRenderer> =
    mode === 'preview'
      ? {
          question: matchingQuestion,
          mode,
          onAnswered: (matches) => console.log('onAnswered (preview)', matches),
        }
      : mode === 'play'
        ? {
            question: matchingStudent.question,
            mode,
            // Giả lập Backend: chấm đúng hết hoặc không, rồi trả đáp án đúng kèm theo.
            onAnswered: async (matches) => {
              console.log('onAnswered (play)', matches)
              return {
                isCorrect: sameLinkSet(matches, matchingStudent.correctMatches),
                correctAnswer: { matches: matchingStudent.correctMatches },
              }
            },
          }
        : { question: matchingQuestion, mode, matches: sampleReviewMatches(matchingQuestion) }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Canvas Sandbox</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        {(['quiz', 'matching'] as const).map((g) => (
          <button key={g} onClick={() => setGame(g)} style={{ fontWeight: game === g ? 'bold' : 'normal' }}>
            {g}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        {(['preview', 'play', 'review'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ fontWeight: mode === m ? 'bold' : 'normal' }}>
            {m}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {game === 'quiz'
          ? (Object.keys(QUIZ_QUESTIONS) as QuizQuestionKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setQuizKey(key)}
                style={{ fontWeight: quizKey === key ? 'bold' : 'normal' }}
              >
                {key}
              </button>
            ))
          : (Object.keys(MATCHING_QUESTIONS) as MatchingQuestionKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setMatchingKey(key)}
                style={{ fontWeight: matchingKey === key ? 'bold' : 'normal' }}
              >
                {key}
              </button>
            ))}
      </div>
      {game === 'quiz' ? <QuizRenderer {...quizProps} /> : <MatchingRenderer {...matchingProps} />}
    </div>
  )
}
