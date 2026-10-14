import { viText } from '../../../constants/viText'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import type { ValidationIssue } from '../../../utils/gameValidation'
import Icon from '../../ui/Icon'
import { QUESTION_FORMS } from './questionForms'


interface QuestionEditorProps {
  gameType: GameType
  question: QuestionDsl
  // Số thứ tự câu hiển thị (từ 1).
  number: number
  issues: ReadonlyArray<ValidationIssue>
  onUpdate: (update: (question: QuestionDsl) => QuestionDsl) => void
}

export default function QuestionEditor({ gameType, question, number, issues, onUpdate }: QuestionEditorProps) {
  const text = viText.editor.form
  const Form = QUESTION_FORMS[gameType]

  return (
    <section aria-labelledby="question-editor-title" className="space-y-4 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <h2 id="question-editor-title" className="text-lg font-extrabold">
        {text.heading} {number}
      </h2>
      {Form ? (
        <Form question={question} issues={issues} onUpdate={onUpdate} />
      ) : (
        <div role="status" className="flex items-start gap-2 rounded-xl bg-sun-soft px-4 py-3 text-base">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="block font-bold">{text.noFormTitle}</span>
            {text.noFormDescription}
          </span>
        </div>
      )}
    </section>
  )
}
