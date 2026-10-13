import ButtonLink from '../components/ButtonLink'
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
      <section className="grid min-h-80 place-items-center rounded-2xl border-2 border-dashed border-ink/20 bg-white p-8 text-center">
        <div>
          <p className="text-lg font-bold">{viText.generator.emptyTitle}</p>
          <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">
            {viText.generator.emptyDescription}
          </p>
          <ButtonLink
            to={ROUTES.dashboard}
            variant="secondary"
            className="mt-5"
          >
            {viText.generator.backHome}
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
