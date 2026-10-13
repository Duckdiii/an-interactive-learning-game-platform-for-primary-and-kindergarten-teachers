import { Link } from 'react-router-dom'
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
          <Link
            to={ROUTES.workspaceEditor}
            className="inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {text.createAction}
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-semibold">{text.libraryTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">{text.libraryHint}</p>
            </div>
            <span className="text-sm font-medium text-slate-500">
              {text.libraryCount}
            </span>
          </div>

          <div className="grid min-h-72 place-items-center py-10 text-center">
            <div>
              <p className="text-base font-semibold text-slate-800">
                {text.emptyTitle}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {text.emptyDescription}
              </p>
              <Link
                to={ROUTES.workspaceEditor}
                className="mt-5 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                {text.openEditor}
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold">{text.summaryTitle}</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <dt className="text-slate-500">{text.drafts}</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <dt className="text-slate-500">{text.published}</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">{text.shared}</dt>
              <dd className="font-semibold">0</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  )
}
