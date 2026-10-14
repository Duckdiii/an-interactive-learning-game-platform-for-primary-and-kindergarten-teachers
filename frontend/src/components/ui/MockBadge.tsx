import { viText } from '../../constants/viText'
import Icon from './Icon'

// Nhãn nhỏ gắn cạnh kết quả do AI (đề xuất loại game, câu hỏi làm lại, phòng chơi giả lập...) khi dữ liệu là mô phỏng,
// để giáo viên và người chấm không nhầm với AI thật.
export default function MockBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1 text-sm font-bold text-ink ring-1 ring-sun',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon name="info" className="h-4 w-4" />
      {viText.mock.badge}
    </span>
  )
}
