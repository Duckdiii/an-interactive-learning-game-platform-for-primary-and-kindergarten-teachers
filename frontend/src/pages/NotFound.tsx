import ButtonLink from '../components/ButtonLink'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'

export default function NotFound() {
  usePageTitle(viText.notFound.title)

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold">{viText.notFound.title}</h1>
        <p className="mt-3 text-base leading-7 text-ink-soft">
          {viText.notFound.description}
        </p>
        <ButtonLink to={ROUTES.dashboard} className="mt-6">
          {viText.notFound.backHome}
        </ButtonLink>
      </section>
    </main>
  )
}
