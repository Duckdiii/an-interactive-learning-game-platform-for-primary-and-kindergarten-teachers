import { lazy, Suspense, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import PageHeader from '../components/ui/PageHeader'
import { dragDropQuestion } from '../demo/dragDropQuestion'
import type { PlacementAnswer } from '../types/dragDrop'

const DragDropRenderer = lazy(() => import('../components/game/renderers/drag-drop/DragDropRenderer'))

export default function WorkspaceEditor() {
  const [mode, setMode] = useState<'preview' | 'play'>('preview')
  const [result, setResult] = useState<PlacementAnswer | null>(null)
  const [round, setRound] = useState(0)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Workspace Editor" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold">Kéo & thả: Nơi sống của con vật</h2>
          <p className="mt-1 text-sm text-slate-500">Mầm non · 4 vật thể · Dữ liệu mẫu</p>
        </div>
        <div className="flex rounded-md border border-slate-300 p-1" role="group" aria-label="Chế độ">
          {(['preview', 'play'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={mode === value}
              onClick={() => { setMode(value); setResult(null) }}
              className={`min-h-10 rounded px-3 text-sm font-medium ${mode === value ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>
              {value === 'preview' ? 'Xem trước' : 'Chơi thử'}
            </button>
          ))}
        </div>
      </div>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <Suspense fallback={<LoadingSpinner label="Đang tải câu hỏi" />}>
            <DragDropRenderer key={`${mode}:${round}`} question={dragDropQuestion}
              participantId="demo-participant" previewMode={mode === 'preview'}
              onAnswered={setResult} onPreviewCompleted={setResult} />
          </Suspense>
        </div>
        <aside className="space-y-6 border-t border-slate-200 pt-5 xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Câu hỏi</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Loại trò chơi</dt><dd>Kéo & thả</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Rổ phân loại</dt><dd>2</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Vật thể</dt><dd>4</dd></div>
            </dl>
          </div>
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Kết quả lượt gần nhất</h3>
            {result ? (
              <div className="mt-3 space-y-3 text-sm">
                <p className="font-medium text-emerald-700">{result.placements.length} / 4 đúng</p>
                <p className="text-slate-600">Thời gian: {(result.timeSpentMs / 1000).toFixed(1)} giây</p>
                <ul className="space-y-2">
                  {result.placements.map((placement) => (
                    <li key={placement.itemId} className="flex justify-between gap-3">
                      <span>{dragDropQuestion.draggableItems.find((item) => item.itemId === placement.itemId)?.label}</span>
                      <span className="text-right text-slate-500">{dragDropQuestion.dropZones.find((zone) => zone.zoneId === placement.zoneId)?.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">Chưa có kết quả</p>}
          </div>
          <button type="button" onClick={() => { setRound((value) => value + 1); setResult(null) }}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold">Bắt đầu lượt mới</button>
        </aside>
      </section>
    </div>
  )
}
