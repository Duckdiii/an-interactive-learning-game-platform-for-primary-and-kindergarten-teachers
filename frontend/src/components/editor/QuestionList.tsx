import { viText } from '../../constants/viText'

export interface QuestionListItem {
  summary: string
  timeLimitSeconds: number
  points: number
}

interface QuestionListProps {
  items: ReadonlyArray<QuestionListItem>
  selectedIndex: number
  onSelect: (index: number) => void
}

// Danh sách câu hỏi của game: mỗi câu là một nút (bàn phím và trình đọc màn hình dùng được), câu đang chọn được làm
// nổi bằng viền đậm VÀ aria-current, không chỉ bằng màu. Mỗi dòng cao tối thiểu 64px cho ngón tay trên điện thoại.
export default function QuestionList({ items, selectedIndex, onSelect }: QuestionListProps) {
  const text = viText.editor

  if (items.length === 0) {
    return <p className="rounded-xl bg-paper px-4 py-6 text-base text-ink-soft">{text.emptyQuestions}</p>
  }

  return (
    <ol aria-label={text.listLabel} className="space-y-2">
      {items.map((item, index) => {
        const selected = index === selectedIndex

        return (
          <li key={index}>
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(index)}
              className={[
                'flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition',
                selected
                  ? 'border-brand bg-brand-soft'
                  : 'border-ink/10 bg-white hover:border-brand/40',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-extrabold',
                  selected ? 'bg-brand text-white' : 'bg-paper text-ink-soft',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="sr-only">{`${text.questionLabel} ${index + 1}: `}</span>
                <span className="line-clamp-2 text-base font-semibold">{item.summary}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {item.timeLimitSeconds} {text.seconds} · {item.points} {text.points}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
