import type { ReactNode } from 'react'
import { viText } from '../../../constants/viText'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import type { ValidationIssue } from '../../../utils/gameValidation'
import CommonOnlyForm from './CommonOnlyForm'
import { QUESTION_FORMS } from './questionForms'

interface QuestionEditorProps {
  gameType: GameType
  question: QuestionDsl
  // Số thứ tự câu hiển thị (từ 1).
  number: number
  issues: ReadonlyArray<ValidationIssue>
  onUpdate: (update: (question: QuestionDsl) => QuestionDsl) => void
  // Việc đi kèm cả thẻ câu (ví dụ nút "Yêu cầu AI làm lại"), đặt cạnh tiêu đề.
  headerAction?: ReactNode
}

export default function QuestionEditor({ gameType, question, number, issues, onUpdate, headerAction }: QuestionEditorProps) {
  // Loại chưa có form riêng thì chỉ sửa được trường chung, nội dung chữ chỉ đọc (`CommonOnlyForm`).
  const Form = QUESTION_FORMS[gameType] ?? CommonOnlyForm

  return (
    <section aria-labelledby="question-editor-title" className="space-y-4 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="question-editor-title" className="text-lg font-extrabold">
          {viText.editor.form.heading} {number}
        </h2>
        {headerAction}
      </div>
      <Form gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} />
    </section>
  )
}
