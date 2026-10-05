import { useState } from 'react'
import type { ComponentProps } from 'react'
import QuizRenderer from '../../games/quiz/QuizRenderer'
import {
  mockQuizQuestion,
  mockQuizQuestionLongText,
  mockQuizQuestionNoMedia,
} from '../../games/quiz/QuizRenderer.fixtures'

const QUESTIONS = {
  'Có audio/ảnh': mockQuizQuestion,
  'Không audio/ảnh': mockQuizQuestionNoMedia,
  'Câu hỏi dài 195 ký tự': mockQuizQuestionLongText,
} as const
type QuestionKey = keyof typeof QUESTIONS

/**
 * Trang tạm (dev-only, không route trong App.tsx) để render thử các Canvas Engine renderer bằng
 * fixture trước khi nối vào WorkspaceEditor/GamePlayer thật. Không phải 1 phần sản phẩm cuối.
 */
export default function CanvasSandbox() {
  const [mode, setMode] = useState<'preview' | 'play' | 'review'>('preview')
  const [questionKey, setQuestionKey] = useState<QuestionKey>('Có audio/ảnh')

  const question = QUESTIONS[questionKey]

  // Prop phụ thuộc mode (xem QuizRenderer). Dựng object rồi spread để đổi mode vẫn giữ cùng một
  // instance component, thử được việc renderer tự đặt lại state khi mode đổi mà không unmount.
  const props: ComponentProps<typeof QuizRenderer> =
    mode === 'preview'
      ? { question, mode, onAnswered: (optionId) => console.log('onAnswered (preview)', optionId) }
      : mode === 'play'
        ? { question, mode, onAnswered: (optionId) => optionId === question.correctOptionId }
        : { question, mode, selectedOptionId: 'a' }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Canvas Sandbox — QuizRenderer</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {(['preview', 'play', 'review'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ fontWeight: mode === m ? 'bold' : 'normal' }}>
            {m}
          </button>
        ))}
        {(Object.keys(QUESTIONS) as QuestionKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setQuestionKey(key)}
            style={{ fontWeight: questionKey === key ? 'bold' : 'normal' }}
          >
            {key}
          </button>
        ))}
      </div>
      <QuizRenderer {...props} />
    </div>
  )
}
