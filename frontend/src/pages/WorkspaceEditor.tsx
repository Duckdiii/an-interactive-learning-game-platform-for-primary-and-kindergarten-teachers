import PageHeader from '../components/ui/PageHeader'
import { viText } from '../constants/viText'

export default function WorkspaceEditor() {
  const text = viText.editor

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.kicker}
        title={text.title}
        description={text.description}
      />

      <section className="grid min-h-[640px] gap-4 xl:grid-cols-[280px_1fr_320px]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            {text.libraryTitle}
          </h3>
          <div className="mt-4 space-y-3">
            {text.gameTypes.map((gameType) => (
              <button
                key={gameType}
                type="button"
                className="flex min-h-12 w-full items-center justify-between rounded-md border border-slate-200 px-3 text-left text-sm font-medium transition hover:border-slate-400"
              >
                <span>{gameType}</span>
                <span className="text-slate-400">{text.add}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{text.previewTitle}</h3>
              <p className="text-sm text-slate-500">{text.previewHint}</p>
            </div>
            <div className="flex rounded-md border border-slate-200 p-1">
              {text.modes.map((mode) => (
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
                {text.previewEmptyTitle}
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                {text.previewEmptyDescription}
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            {text.inspectorTitle}
          </h3>
          <div className="mt-4 space-y-3">
            {text.panels.map((panel) => (
              <div
                key={panel}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold">{panel}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {text.panelHint}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
