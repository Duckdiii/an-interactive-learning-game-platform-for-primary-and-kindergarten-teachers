import type { KeyboardEvent, ReactNode } from 'react'
import { viText } from '../../constants/viText'
import { useIsDesktop } from '../../hooks/useIsDesktop'

export type EditorPane = 'list' | 'preview' | 'see'

interface EditorLayoutProps {
  pane: EditorPane
  onPaneChange: (pane: EditorPane) => void
  list: ReactNode
  preview: ReactNode
  // Cột phải "Bé sẽ thấy": xem trước và khối sẵn sàng xuất bản.
  see: ReactNode
  // Số câu hỏi, hiện trên tab điện thoại để biết trước danh sách có gì.
  questionCount: number
}

const PANES: ReadonlyArray<{ id: EditorPane; label: string }> = [
  { id: 'list', label: viText.editor.questionsTab },
  { id: 'preview', label: viText.editor.previewTab },
  { id: 'see', label: viText.editor.seeTab },
]

// Khung ba phần của trình soạn thảo: danh sách câu | sửa câu | "Bé sẽ thấy". Máy tính (lg trở lên) hiện cả ba là vùng thường (không có tab):
// từ xl ba cột cạnh nhau, ở lg cột thứ ba xuống dưới. Điện thoại: ba tab theo mẫu WAI-ARIA (mũi tên Trái/Phải, Home, End), mỗi lúc một phần.
export default function EditorLayout({ pane, onPaneChange, list, preview, see, questionCount }: EditorLayoutProps) {
  const text = viText.editor
  const isDesktop = useIsDesktop()

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = PANES.findIndex((item) => item.id === pane)
    const target =
      event.key === 'ArrowRight' ? (current + 1) % PANES.length
        : event.key === 'ArrowLeft' ? (current - 1 + PANES.length) % PANES.length
          : event.key === 'Home' ? 0
            : event.key === 'End' ? PANES.length - 1
              : -1

    if (target < 0) return

    event.preventDefault()
    onPaneChange(PANES[target].id)
    requestAnimationFrame(() => document.getElementById(`editor-tab-${PANES[target].id}`)?.focus())
  }

  // Trên máy tính cả hai khung đều hiện và không có tablist, nên không gắn vai trò tab (trình đọc màn hình không thấy tabpanel mồ côi).
  const panelProps = (id: EditorPane, label: string) =>
    isDesktop
      ? { 'aria-label': label }
      : { role: 'tabpanel' as const, 'aria-labelledby': `editor-tab-${id}` }

  return (
    <div>
      <div role="tablist" aria-label={text.panesLabel} onKeyDown={handleKeyDown} className="mb-4 grid grid-cols-3 gap-2 lg:hidden">
        {PANES.map((item) => {
          const selected = pane === item.id

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`editor-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`editor-pane-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onPaneChange(item.id)}
              className={[
                'min-h-12 rounded-xl border-2 px-4 text-base font-bold transition',
                selected
                  ? 'border-brand bg-brand text-white'
                  : 'border-ink/10 bg-white text-ink hover:border-brand/40',
              ].join(' ')}
            >
              {item.label}
              {item.id === 'list' ? ` (${questionCount})` : ''}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[18rem_minmax(0,1fr)_26rem] 2xl:grid-cols-[20rem_minmax(0,1fr)_30rem]">
        <section
          id="editor-pane-list"
          tabIndex={-1}
          {...panelProps('list', text.questionsTab)}
          className={pane === 'list' ? 'block min-w-0 focus:outline-none lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto' : 'hidden min-w-0 focus:outline-none lg:block lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto'}
        >
          {list}
        </section>
        <section
          id="editor-pane-preview"
          tabIndex={-1}
          {...panelProps('preview', text.previewTab)}
          className={pane === 'preview' ? 'block min-w-0 focus:outline-none' : 'hidden min-w-0 focus:outline-none lg:block'}
        >
          {preview}
        </section>
        <section
          id="editor-pane-see"
          tabIndex={-1}
          {...panelProps('see', text.seeTab)}
          className={pane === 'see' ? 'block min-w-0 focus:outline-none lg:col-span-2 xl:col-span-1 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto' : 'hidden min-w-0 focus:outline-none lg:col-span-2 lg:block xl:col-span-1 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto'}
        >
          {see}
        </section>
      </div>
    </div>
  )
}
