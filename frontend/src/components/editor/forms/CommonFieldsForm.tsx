import { viText } from '../../../constants/viText'
import { QUESTION_LIMITS } from '../../../utils/questionSpecs'
import { setPoints, setTimeLimit } from './commonEditing'
import type { QuestionFormProps } from './formTypes'
import { fieldMessage } from './issueText'
import NumberField from './NumberField'
import TimeLimitField from './TimeLimitField'

// Trường chung của mọi loại game: thời gian trả lời (FLD-07) và điểm. Dùng chung cho form của mọi loại thay vì mỗi form tự lặp lại.
export default function CommonFieldsForm({ question, issues, onUpdate, idPrefix }: Pick<QuestionFormProps, 'question' | 'issues' | 'onUpdate'> & { idPrefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TimeLimitField
        id={`${idPrefix}-time-limit`}
        value={question.timeLimitSeconds}
        error={fieldMessage(issues, 'timeLimitSeconds')}
        onCommit={(seconds) => onUpdate((current) => setTimeLimit(current, seconds))}
      />
      <NumberField
        id={`${idPrefix}-points`}
        label={viText.editor.form.pointsLabel}
        value={question.points}
        limits={QUESTION_LIMITS.points}
        defaultValue={QUESTION_LIMITS.points.default}
        error={fieldMessage(issues, 'points')}
        onCommit={(points) => onUpdate((current) => setPoints(current, points))}
      />
    </div>
  )
}
