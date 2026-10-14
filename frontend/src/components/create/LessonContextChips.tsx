import { GRADE_LEVEL_VALUES, gradeLevelLabel, subjectLabel } from '../../constants/labels'
import { subjectOptionsFor } from '../../constants/subjectOptions'
import { viText } from '../../constants/viText'
import Icon from '../ui/Icon'

interface LessonContextChipsProps {
  gradeLevel: string
  subject: string
  gradeIsGuess: boolean
  subjectIsGuess: boolean
  onGradeLevelChange: (value: string) => void
  onSubjectChange: (value: string) => void
}

// Khối lớp và môn học là TÙY CHỌN: hiện thành hai "chip" có thể đổi, đặt phía trên ô mô tả. Chip mang giá trị do AI đoán
// thì có nhãn "AI đoán, bấm để sửa"; chưa có gì để đoán thì hiện "Chưa xác định" (không điền giá trị mặc định) và không
// chặn việc tạo.
export default function LessonContextChips({
  gradeLevel,
  subject,
  gradeIsGuess,
  subjectIsGuess,
  onGradeLevelChange,
  onSubjectChange,
}: LessonContextChipsProps) {
  const text = viText.generator

  return (
    <div role="group" aria-labelledby="create-context-title">
      <p id="create-context-title" className="text-base font-semibold text-ink">
        {text.contextTitle}
      </p>
      <p id="create-context-hint" className="mt-1 text-sm text-ink-soft">
        {text.contextHint}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <ChipSelect
          id="create-grade"
          label={text.gradeLabel}
          value={gradeLevel}
          guess={gradeIsGuess}
          values={GRADE_LEVEL_VALUES}
          format={gradeLevelLabel}
          onChange={onGradeLevelChange}
        />
        <ChipSelect
          id="create-subject"
          label={text.subjectLabel}
          value={subject}
          guess={subjectIsGuess}
          values={subjectOptionsFor(gradeLevel)}
          format={subjectLabel}
          onChange={onSubjectChange}
        />
      </div>
    </div>
  )
}

interface ChipSelectProps {
  id: string
  label: string
  value: string
  guess: boolean
  values: ReadonlyArray<string>
  format: (value: string) => string
  onChange: (value: string) => void
}

function ChipSelect({ id, label, value, guess, values, format, onChange }: ChipSelectProps) {
  const filled = value !== ''
  // Giá trị lạ (ví dụ môn không còn trong danh sách của khối này) vẫn giữ được trong ô chọn, không bị "nhảy" mất.
  const options = value && !values.includes(value) ? [value, ...values] : values

  return (
    <div className="flex flex-col gap-1">
      <div
        className={[
          'relative inline-flex min-h-11 items-center rounded-full border-2 transition focus-within:border-brand',
          filled ? 'border-brand/50 bg-brand-soft' : 'border-dashed border-ink/30 bg-white',
        ].join(' ')}
      >
        <label htmlFor={id} className="pl-4 text-sm font-semibold text-ink-soft">
          {label}:
        </label>
        <select
          id={id}
          value={value}
          aria-describedby={guess ? `create-context-hint ${id}-guess` : 'create-context-hint'}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 appearance-none bg-transparent py-1 pl-2 pr-10 text-base font-bold text-ink"
        >
          <option value="">{viText.generator.noValueOption}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {format(option)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-ink-soft">
          <Icon name="chevronDown" className="h-4 w-4" />
        </span>
      </div>
      {guess ? (
        <span id={`${id}-guess`} className="flex items-center gap-1 pl-4 text-sm font-medium text-brand-strong">
          <Icon name="sparkles" className="h-4 w-4" />
          {viText.generator.aiGuessTag}
        </span>
      ) : null}
    </div>
  )
}
