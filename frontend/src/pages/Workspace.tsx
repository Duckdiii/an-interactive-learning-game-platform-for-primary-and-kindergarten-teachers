import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { ROUTES } from '../routes/paths'

export default function Workspace() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Your workspaces"
        description="Manage saved learning-game projects here. The list is static until workspace persistence and API integration are available."
        actions={
          <Link
            to={ROUTES.workspaceEditor}
            className="inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Create workspace
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-semibold">Workspace library</h3>
              <p className="mt-1 text-sm text-slate-500">
                Saved drafts will appear in this list.
              </p>
            </div>
            <span className="text-sm font-medium text-slate-500">0 items</span>
          </div>

          <div className="grid min-h-72 place-items-center py-10 text-center">
            <div>
              <p className="text-base font-semibold text-slate-800">
                No saved workspaces yet
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Create a workspace to open the editor scaffold and start a new
                learning game.
              </p>
              <Link
                to={ROUTES.workspaceEditor}
                className="mt-5 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                Open editor
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold">Workspace summary</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <dt className="text-slate-500">Drafts</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <dt className="text-slate-500">Published</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Shared</dt>
              <dd className="font-semibold">0</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  )
}
