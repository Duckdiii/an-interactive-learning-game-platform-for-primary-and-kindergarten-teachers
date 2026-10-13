import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { viText } from '../constants/viText'
import { ROUTES } from '../routes/paths'

export default function GameGeneratorPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={viText.generator.kicker}
        title={viText.generator.title}
        description={viText.generator.description}
      />
      <section className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <p className="text-base font-semibold">
            {viText.generator.emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            {viText.generator.emptyDescription}
          </p>
          <Link
            to={ROUTES.dashboard}
            className="mt-5 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            {viText.generator.backHome}
          </Link>
        </div>
      </section>
    </div>
  )
}
