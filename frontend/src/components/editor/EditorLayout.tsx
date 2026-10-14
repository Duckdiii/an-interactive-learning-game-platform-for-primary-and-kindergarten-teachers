import type { ReactNode } from 'react'
import { viText } from '../../constants/viText'

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

// Khung hai phần của trình soạn thảo. Máy tính (lg trở lên): danh sách câu hỏi bên trái, vùng xem bên phải, cùng hiện.
// Điện thoại: hai tab, mỗi lúc một phần để không phải cuộn dài và mỗi nút đủ lớn.
export default function EditorLayout({ pane, onPaneChange, list, preview, questionCount }: EditorLayoutProps) {
  const text = viText.editor

  return (
    <div>
      <div role="tablist" aria-label={text.panesLabel} className="mb-4 grid grid-cols-2 gap-2 lg:hidden">
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
          role="tabpanel"
          id="editor-pane-list"
          aria-labelledby="editor-tab-list"
          className={pane === 'list' ? 'block min-w-0' : 'hidden min-w-0 lg:block'}
        >
          {list}
        </section>
        <section
          role="tabpanel"
          id="editor-pane-preview"
          aria-labelledby="editor-tab-preview"
          className={pane === 'preview' ? 'block min-w-0' : 'hidden min-w-0 lg:block'}
        >
          {preview}
        </section>
      </div>
    </div>
  )
}
