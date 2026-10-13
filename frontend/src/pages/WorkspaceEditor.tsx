import ButtonLink from '../components/ButtonLink'
import Icon from '../components/ui/Icon'
import LetterTiles from '../components/ui/LetterTiles'
import { MIXED_TILES } from '../components/ui/tileSets'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'

// Trình soạn thảo thật (UC-04 đến UC-06) chưa làm. Trang này nói rõ điều đó và cho giáo viên đường về, thay vì giả vờ
// có các nút soạn thảo bấm được. Địa chỉ `?gameId=...` từ thẻ game được giữ nguyên để nối vào khi editor sẵn sàng.
export default function WorkspaceEditor() {
  usePageTitle(viText.editor.kicker)
  const text = viText.editor

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
            {text.kicker}
          </p>
          <span className="rounded-full bg-sun-soft px-3 py-1 text-sm font-bold text-ink ring-2 ring-sun">
            {text.comingTag}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{text.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
          {text.description}
        </p>
      </header>

      <section
        aria-labelledby="coming-title"
        className="rounded-3xl border-2 border-dashed border-ink/20 bg-white p-6 sm:p-10"
      >
        <LetterTiles tiles={MIXED_TILES} />
        <h2 id="coming-title" className="mt-8 text-xl font-extrabold">
          {text.comingTitle}
        </h2>
        <ul className="mt-4 space-y-3">
          {text.coming.map((item) => (
            <li key={item} className="flex items-start gap-3 text-base">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
                <Icon name="clock" className="h-4 w-4" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to={ROUTES.workspace}>{text.backToGames}</ButtonLink>
          <ButtonLink to={ROUTES.createGame} variant="secondary">
            {text.createInstead}
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
