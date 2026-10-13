import ButtonLink from '../components/ButtonLink'
import PageHeader from '../components/ui/PageHeader'
import { viText } from '../constants/viText'
import { ROUTES } from '../routes/paths'

export default function Workspace() {
  const text = viText.workspace

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.kicker}
        title={text.title}
        description={text.description}
        actions={
          <ButtonLink to={ROUTES.workspaceEditor}>
            {text.createAction}
          </ButtonLink>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-ink/10 pb-4">
            <div>
              <h3 className="text-lg font-bold">{text.libraryTitle}</h3>
              <p className="mt-1 text-base text-ink-soft">{text.libraryHint}</p>
            </div>
            <span className="text-base font-medium text-ink-soft">
              {text.libraryCount}
            </span>
          </div>

          <div className="grid min-h-72 place-items-center py-10 text-center">
            <div>
              <p className="text-lg font-bold text-ink">
                {text.emptyTitle}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-base leading-7 text-ink-soft">
                {text.emptyDescription}
              </p>
              <ButtonLink
                to={ROUTES.workspaceEditor}
                variant="secondary"
                className="mt-5"
              >
                {text.openEditor}
              </ButtonLink>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-bold">{text.summaryTitle}</h3>
          <dl className="mt-5 space-y-4 text-base">
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <dt className="text-ink-soft">{text.drafts}</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <dt className="text-ink-soft">{text.published}</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">{text.shared}</dt>
              <dd className="font-semibold">0</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  )
}
