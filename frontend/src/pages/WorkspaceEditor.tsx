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
        <aside className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-soft">
            {text.libraryTitle}
          </h3>
          <div className="mt-4 space-y-3">
            {text.gameTypes.map((gameType) => (
              <button
                key={gameType}
                type="button"
                className="flex min-h-14 w-full items-center justify-between rounded-xl border-2 border-ink/10 px-4 text-left text-base font-semibold transition hover:border-brand hover:bg-brand-soft"
              >
                <span>{gameType}</span>
                <span className="text-ink-soft">{text.add}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{text.previewTitle}</h3>
              <p className="text-base text-ink-soft">{text.previewHint}</p>
            </div>
            <div className="flex rounded-xl border-2 border-ink/10 p-1">
              {text.modes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="min-h-11 rounded-lg px-4 text-base font-semibold first:bg-brand first:text-white"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid min-h-[480px] place-items-center rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center">
            <div>
              <p className="text-xl font-bold text-ink">
                {text.previewEmptyTitle}
              </p>
              <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">
                {text.previewEmptyDescription}
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-soft">
            {text.inspectorTitle}
          </h3>
          <div className="mt-4 space-y-3">
            {text.panels.map((panel) => (
              <div
                key={panel}
                className="rounded-xl border border-ink/10 bg-paper p-4"
              >
                <p className="text-base font-bold">{panel}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
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
