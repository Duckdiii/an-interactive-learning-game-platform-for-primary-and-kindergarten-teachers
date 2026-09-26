import { Link } from 'react-router-dom'
import { ROUTES } from '../routes/paths'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This route is not registered in the frontend shell yet.
        </p>
        <Link
          to={ROUTES.dashboard}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  )
}
