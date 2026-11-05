import { useState } from 'react'
import { getMockGroups } from '../../config/mockMode'
import { viText } from '../../constants/viText'
import Icon from './Icon'

// Dải thông báo ở đầu nội dung khi có nhóm endpoint đang dùng dữ liệu mô phỏng. Không hiện khi chạy bằng backend thật.
export default function MockBanner() {
  const [isDismissed, setIsDismissed] = useState(false)
  const groups = [...getMockGroups()]

  if (groups.length === 0) return null

  const names = groups.map((group) => viText.mock.groups[group]).join(', ')

  if (isDismissed) {
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3 py-1 text-xs font-bold text-amber-800 transition hover:bg-amber-100/90"
        >
          <Icon name="info" className="h-3.5 w-3.5" />
          <span>{viText.mock.bannerTitle}</span>
        </button>
      </div>
    )
  }

  return (
    <div
      role="note"
      aria-label={viText.mock.bannerTitle}
      className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 to-amber-100/60 p-4 text-ink shadow-xs"
    >
      <div className="flex items-start gap-3">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-base font-bold text-amber-950">{viText.mock.bannerTitle}</p>
          <p className="mt-0.5 text-sm leading-6 text-amber-900/90">
            {viText.mock.bannerBody} {viText.mock.bannerGroups} {names}.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Đóng thông báo"
        className="rounded-lg px-2 py-1 text-xs font-bold text-amber-800/60 hover:bg-amber-200/50 hover:text-amber-900 transition"
      >
        ✕
      </button>
    </div>
  )
}
