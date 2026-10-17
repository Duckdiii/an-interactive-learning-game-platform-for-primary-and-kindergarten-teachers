import { useState } from 'react'
import { FRAME_WIDTHS, type FrameWidth } from './frameWidths'
import { EXPERIMENT_ENTRIES, findExperiment, type ExperimentEntry } from './registry'

interface ExperimentsPageProps {
  /** Cho test truyền danh sách riêng; mặc định dùng bảng đăng ký thật. */
  entries?: readonly ExperimentEntry[]
}

/**
 * Trang xem thử (chỉ khi thử nghiệm được bật, xem điều kiện ở `App.tsx`). Chọn mục và chiều rộng khung để
 * kiểm bố cục co giãn: khung có chiều rộng cố định nên `ResponsiveStage` co theo khung, không theo cửa sổ.
 */
export default function ExperimentsPage({ entries = EXPERIMENT_ENTRIES }: ExperimentsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null)
  const [frameWidth, setFrameWidth] = useState<FrameWidth>(390)
  const selected = selectedId ? findExperiment(selectedId, entries) : undefined

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Khu thử nghiệm</h1>
      <p className="mb-4 text-sm text-slate-600">
        Dữ liệu mẫu cục bộ, không gọi máy chủ. Chỉ có ở bản dev hoặc bản build bật VITE_EXPERIMENTS=1.
      </p>

      <div role="group" aria-label="Chiều rộng khung" className="mb-3 flex flex-wrap gap-2">
        {FRAME_WIDTHS.map((width) => (
          <button
            key={width}
            type="button"
            aria-pressed={frameWidth === width}
            onClick={() => setFrameWidth(width)}
            className={`rounded border px-3 py-1 ${frameWidth === width ? 'bg-slate-800 text-white' : 'bg-white'}`}
          >
            {width}px
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p>Chưa có mục thử nghiệm nào.</p>
      ) : (
        <div role="group" aria-label="Mục thử nghiệm" className="mb-4 flex flex-wrap gap-2">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selectedId === entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={`rounded border px-3 py-1 ${selectedId === entry.id ? 'bg-slate-800 text-white' : 'bg-white'}`}
            >
              {entry.title}
            </button>
          ))}
        </div>
      )}

      <div
        data-testid="experiment-frame"
        style={{ width: frameWidth, maxWidth: 'none' }}
        className="overflow-x-auto border border-dashed border-slate-400"
      >
        {selected?.render()}
      </div>
    </div>
  )
}
