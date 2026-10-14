import type { KeyboardEvent, ReactNode } from 'react'
import { viText } from '../../constants/viText'
import { useIsDesktop } from '../../hooks/useIsDesktop'

export type EditorPane = 'list' | 'preview'

interface EditorLayoutProps {
  pane: EditorPane
  onPaneChange: (pane: EditorPane) => void
  list: ReactNode
  preview: ReactNode
  // Số câu hỏi, hiện trên tab điện thoại để biết trước danh sách có gì.
  questionCount: number
}

const PANES: ReadonlyArray<{ id: EditorPane; label: string }> = [
  { id: 'list', label: viText.editor.questionsTab },
  { id: 'preview', label: viText.editor.previewTab },
]

// Khung hai phần của trình soạn thảo. Máy tính (lg trở lên): danh sách câu hỏi bên trái, vùng xem bên phải, cùng hiện và là hai vùng
// thường (không có tab). Điện thoại: hai tab theo mẫu WAI-ARIA (mũi tên Trái/Phải, Home, End), mỗi lúc một phần.
export default function EditorLayout({ pane, onPaneChange, list, preview, questionCount }: EditorLayoutProps) {
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
      <div role="tablist" aria-label={text.panesLabel} onKeyDown={handleKeyDown} className="mb-4 grid grid-cols-2 gap-2 lg:hidden">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section
          id="editor-pane-list"
          tabIndex={-1}
          {...panelProps('list', text.questionsTab)}
          className={pane === 'list' ? 'block min-w-0 focus:outline-none' : 'hidden min-w-0 focus:outline-none lg:block'}
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
      </div>
    </div>
  )
}
