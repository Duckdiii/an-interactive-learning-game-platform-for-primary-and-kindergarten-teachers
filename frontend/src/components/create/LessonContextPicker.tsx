import type { ReactNode } from 'react'
import { gradeLevelLabel } from '../../constants/labels'
import type { IdeaGroup } from '../../constants/createIdeas'
import { subjectOptionsFor } from '../../constants/subjectOptions'
import { viText } from '../../constants/viText'
import Icon from '../ui/Icon'
import SubjectChip from '../ui/SubjectChip'

interface LessonContextPickerProps {
  gradeLevel: string
  subject: string
  // Nhóm khối đang chọn: có thể là "Lớp 2–5" dù chưa chọn lớp cụ thể.
  group: IdeaGroup | ''
  gradeIsGuess: boolean
  subjectIsGuess: boolean
  onGroupChange: (group: IdeaGroup) => void
  onGradeLevelChange: (value: string) => void
  onSubjectChange: (value: string) => void
}

const GROUPS: ReadonlyArray<IdeaGroup> = ['KINDERGARTEN', 'GRADE_1', 'UPPER']
const UPPER_GRADES = ['GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5']

const optionClass = (selected: boolean) =>
  [
    'inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-bold transition',
    selected ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-ink/40',
  ].join(' ')

// Môn và khối là TÙY CHỌN, chọn bằng nút (bấm lại để bỏ chọn). "Lớp 2–5" là nhóm: chọn xong hiện thêm hàng lớp cụ thể
// vì API cần một khối lớp cụ thể; chưa chọn lớp thì coi như chưa xác định khối.
export default function LessonContextPicker({
  gradeLevel,
  subject,
  group,
  gradeIsGuess,
  subjectIsGuess,
  onGroupChange,
  onGradeLevelChange,
  onSubjectChange,
}: LessonContextPickerProps) {
  const text = viText.generator
  const groupLabel = (item: IdeaGroup) => (item === 'UPPER' ? text.gradeUpperGroup : gradeLevelLabel(item))

  return (
    <div className="space-y-5">
      <Row id="create-subject-title" label={text.subjectLabel} guess={subjectIsGuess}>
        {subjectOptionsFor(gradeLevel).map((value) => (
          <SubjectChip
            key={value}
            subject={value}
            selected={subject === value}
            onClick={() => onSubjectChange(subject === value ? '' : value)}
          />
        ))}
      </Row>

      <Row id="create-grade-title" label={text.gradeLabel} guess={gradeIsGuess}>
        {GROUPS.map((item, index) => (
          <button
            key={item}
            id={index === 0 ? 'create-grade' : undefined}
            type="button"
            aria-pressed={group === item}
            aria-expanded={item === 'UPPER' ? group === 'UPPER' : undefined}
            onClick={() => onGroupChange(item)}
            className={optionClass(group === item)}
          >
            {groupLabel(item)}
          </button>
        ))}
      </Row>

      {group === 'UPPER' ? (
        <Row id="create-grade-upper-title" label={text.gradeUpperLabel}>
          {UPPER_GRADES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={gradeLevel === value}
              onClick={() => onGradeLevelChange(gradeLevel === value ? '' : value)}
              className={optionClass(gradeLevel === value)}
            >
              {gradeLevelLabel(value)}
            </button>
          ))}
          {gradeLevel ? null : <p className="w-full text-sm font-semibold text-ink-soft">{text.gradeUpperHint}</p>}
        </Row>
      ) : null}
    </div>
  )
}

function Row({ id, label, guess, children }: { id: string; label: string; guess?: boolean; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="flex flex-wrap items-center gap-x-3 text-base font-bold text-ink">
        {label}
        {guess ? (
          <span className="flex items-center gap-1 text-sm font-medium text-brand-strong">
            <Icon name="sparkles" className="h-4 w-4" />
            {viText.generator.aiGuessTag}
          </span>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
