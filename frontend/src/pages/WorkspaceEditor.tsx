import PageHeader from '../components/ui/PageHeader'

const editorPanels = [
  'Question Library',
  'Canvas Preview',
  'Game Settings',
  'Validation Notes',
]

export default function WorkspaceEditor() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Editor"
        title="Workspace Editor"
        description="Editor scaffolding for composing learning games. Renderer, AI generation, validation, and API state can attach here later."
      />

      <section className="grid min-h-[640px] gap-4 xl:grid-cols-[280px_1fr_320px]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Library
          </h3>
          <div className="mt-4 space-y-3">
            {['Quiz', 'Matching', 'Drag & Drop', 'Ordering'].map((gameType) => (
              <button
                key={gameType}
                type="button"
                className="flex min-h-12 w-full items-center justify-between rounded-md border border-slate-200 px-3 text-left text-sm font-medium transition hover:border-slate-400"
              >
                <span>{gameType}</span>
                <span className="text-slate-400">Add</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Live preview</h3>
              <p className="text-sm text-slate-500">
                Canvas engine will mount in this surface.
              </p>
            </div>
            <div className="flex rounded-md border border-slate-200 p-1">
              {['Edit', 'Preview'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="min-h-9 rounded px-3 text-sm font-medium first:bg-slate-950 first:text-white"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid min-h-[480px] place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-800">
                Renderer placeholder
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Real game renderers should accept previewMode and stay inside
                this editor boundary.
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Inspector
          </h3>
          <div className="mt-4 space-y-3">
            {editorPanels.map((panel) => (
              <div
                key={panel}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold">{panel}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Reserved slot for the real module.
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
