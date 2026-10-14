import { viText } from '../../../constants/viText'
import { summarizeQuestion } from '../../../utils/questionSummary'
import Icon from '../../ui/Icon'
import CommonFieldsForm from './CommonFieldsForm'
import type { QuestionFormProps } from './formTypes'

// Form cho loại game CHƯA có form sửa chi tiết: sửa được các trường chung (lời đọc, mô tả hình, thời gian, điểm) còn nội dung chữ
// của câu chỉ để ĐỌC. Thông báo nói rõ để giáo viên không tìm ô sửa không có.
export default function CommonOnlyForm({ gameType, question, issues, onUpdate }: QuestionFormProps) {
  const text = viText.editor.form

  return (
    <div className="space-y-5">
      <div role="status" className="flex items-start gap-2 rounded-xl bg-sun-soft px-4 py-3 text-base">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <span className="block font-bold">{text.noFormTitle}</span>
          {text.noFormDescription}
        </span>
      </div>

      <section aria-labelledby="readonly-content-title" className="space-y-2">
        <h3 id="readonly-content-title" className="text-base font-semibold text-ink">
          {text.readOnlyHeading}
        </h3>
        <p className="rounded-xl bg-paper px-4 py-3 text-base [overflow-wrap:anywhere]">{summarizeQuestion(gameType, question)}</p>
      </section>

      <CommonFieldsForm gameType={gameType} question={question} issues={issues} onUpdate={onUpdate} idPrefix="common" />
    </div>
  )
}
