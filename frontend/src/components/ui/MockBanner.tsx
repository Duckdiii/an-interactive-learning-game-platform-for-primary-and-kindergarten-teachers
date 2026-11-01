import { getMockGroups } from '../../config/mockMode'
import { viText } from '../../constants/viText'
import Icon from './Icon'

// Dải thông báo ở đầu nội dung khi có nhóm endpoint đang dùng dữ liệu mô phỏng. Không hiện khi chạy bằng backend thật.
export default function MockBanner() {
  const groups = [...getMockGroups()]

  if (groups.length === 0) return null

  const names = groups.map((group) => viText.mock.groups[group]).join(', ')

  return (
    <div
      role="note"
      aria-label={viText.mock.bannerTitle}
      className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-sun bg-sun-soft px-4 py-3 text-ink"
    >
      <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-base font-bold">{viText.mock.bannerTitle}</p>
        <p className="mt-0.5 text-sm leading-6">
          {viText.mock.bannerBody} {viText.mock.bannerGroups} {names}.
        </p>
      </div>
    </div>
  )
}
