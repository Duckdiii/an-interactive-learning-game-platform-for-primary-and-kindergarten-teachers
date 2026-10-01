import { useState } from 'react'
import QuizRenderer from '../../games/quiz/QuizRenderer'
import { mockQuizQuestion, mockQuizQuestionNoMedia } from '../../games/quiz/QuizRenderer.fixtures'

/**
 * Trang tạm (dev-only, không route trong App.tsx) để render thử các Canvas Engine renderer bằng
 * fixture trước khi nối vào WorkspaceEditor/GamePlayer thật. Không phải 1 phần sản phẩm cuối.
 */
export default function CanvasSandbox() {
  const [mode, setMode] = useState<'preview' | 'play' | 'review'>('preview')
  const [withMedia, setWithMedia] = useState(true)

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Canvas Sandbox — QuizRenderer</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {(['preview', 'play', 'review'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ fontWeight: mode === m ? 'bold' : 'normal' }}>
            {m}
          </button>
        ))}
        <button onClick={() => setWithMedia((v) => !v)}>
          {withMedia ? 'Câu có audio/ảnh' : 'Câu không audio/ảnh'}
        </button>
      </div>
      <QuizRenderer
        question={withMedia ? mockQuizQuestion : mockQuizQuestionNoMedia}
        mode={mode}
        selectedOptionId={mode === 'review' ? 'a' : undefined}
        onAnswered={(optionId) => {
          console.log('onAnswered', optionId)
          if (mode === 'play') return optionId === (withMedia ? mockQuizQuestion : mockQuizQuestionNoMedia).correctOptionId
        }}
      />
    </div>
  )
}
