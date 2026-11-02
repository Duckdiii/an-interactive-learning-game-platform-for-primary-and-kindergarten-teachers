import type { ReactNode } from 'react'
import { viText } from '../../constants/viText'
import type { ValidationIssue } from '../../utils/gameValidation'

interface PublishReadinessProps {
  // Lỗi của bản đang soạn theo luật XUẤT BẢN (chặt hơn lưu).
  issues: ReadonlyArray<ValidationIssue>
  questionCount: number
  onSelectQuestion: (index: number) => void
  onSelectGameInfo: () => void
}

const text = viText.editor.readiness

// Khối "Sẵn sàng xuất bản?" ở cột phải: câu nào đạt, câu nào còn lỗi (mỗi câu một dòng, lỗi đầu tiên), bấm để tới đúng chỗ cần sửa.
// Câu báo lỗi của validateGame đã có tiền tố "Câu N: " / "Trò chơi: " nên hiện nguyên văn.
export default function PublishReadiness({ issues, questionCount, onSelectQuestion, onSelectGameInfo }: PublishReadinessProps) {
  const firstByQuestion = new Map<number, ValidationIssue>()
  const gameIssue = issues.find((issue) => issue.questionIndex === null)

  for (const issue of issues) {
    if (issue.questionIndex !== null && !firstByQuestion.has(issue.questionIndex)) firstByQuestion.set(issue.questionIndex, issue)
  }

  const okNumbers = Array.from({ length: questionCount }, (_, index) => index).filter((index) => !firstByQuestion.has(index)).map((index) => index + 1)
  const problems = [...firstByQuestion.entries()].sort(([a], [b]) => a - b)
  const ready = issues.length === 0 && questionCount > 0

  return (
    <section aria-labelledby="readiness-title" className="space-y-3 rounded-card bg-surface p-5 shadow-card">
      <h2 id="readiness-title" className="font-display text-xl font-extrabold">
        {text.title}
      </h2>
      <ul className="space-y-2 text-base">
        {questionCount === 0 ? (
          <Row mark="!" tone="warn">
            {text.noQuestions}
          </Row>
        ) : null}
        {ready ? (
          <Row mark="✓" tone="ok">
            {text.allReady.replace('{n}', String(questionCount))}
          </Row>
        ) : okNumbers.length > 0 ? (
          <Row mark="✓" tone="ok">
            {text.someReady.replace('{list}', okNumbers.join(', '))}
          </Row>
        ) : null}
        {gameIssue ? (
          <Row mark="!" tone="warn">
            <button type="button" onClick={onSelectGameInfo} className="min-h-11 text-left underline">
              {gameIssue.message}
            </button>
          </Row>
        ) : null}
        {problems.map(([index, issue]) => (
          <Row key={index} mark="!" tone="warn">
            <button type="button" onClick={() => onSelectQuestion(index)} className="min-h-11 text-left underline">
              {issue.message}
            </button>
          </Row>
        ))}
      </ul>
    </section>
  )
}

function Row({ mark, tone, children }: { mark: string; tone: 'ok' | 'warn'; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black ${
          tone === 'ok' ? 'bg-brand text-white' : 'bg-warn-soft text-warn-ink'
        }`}
      >
        {mark}
      </span>
      <span className={`min-w-0 self-center font-semibold ${tone === 'warn' ? 'text-warn-ink' : 'text-ink'}`}>{children}</span>
    </li>
  )
}
