import { IDEAS } from '../../constants/createIdeas'
import type { Idea, IdeaGroup, IdeaSubject } from '../../constants/createIdeas'
import { gradeLevelLabel, subjectLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import { subjectTheme } from '../ui/subjectTheme'

interface IdeaSuggestionsProps {
  subject: string
  group: IdeaGroup | ''
  onPick: (idea: Idea) => void
}

const groupLabel = (group: IdeaGroup) => (group === 'UPPER' ? viText.generator.gradeUpperGroup : gradeLevelLabel(group))

// Cột gợi ý bên phải: ý tưởng soạn sẵn theo môn × nhóm khối. Chưa chọn đủ môn và khối thì chỉ nhắc chọn.
export default function IdeaSuggestions({ subject, group, onPick }: IdeaSuggestionsProps) {
  const text = viText.generator
  const ideas = subject && group ? IDEAS[subject as IdeaSubject]?.[group] : undefined
  const theme = subjectTheme(subject)

  return (
    <aside aria-labelledby="create-ideas-title" className="space-y-3">
      <h2 id="create-ideas-title" aria-live="polite" className="font-display text-xl font-extrabold text-ink">
        {ideas
          ? text.ideasTitle.replace('{context}', `${subjectLabel(subject)} · ${groupLabel(group as IdeaGroup)}`)
          : text.ideasEmpty}
      </h2>
      {ideas ? (
        <ul className="space-y-3">
          {ideas.map((idea) => (
            <li key={idea.title}>
              <button
                type="button"
                onClick={() => onPick(idea)}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-line bg-surface p-3 text-left transition hover:border-ink/40"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-11 w-11 shrink-0 -rotate-6 place-items-center rounded-xl border-2 font-display text-lg font-extrabold ${theme.chip} ${theme.chipBorder}`}
                >
                  {idea.glyph}
                </span>
                <span>
                  <span className="block text-base font-bold text-ink">{idea.title}</span>
                  <span className="block text-sm text-ink-soft">{idea.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="rounded-2xl bg-sun-soft p-4 text-sm font-semibold leading-6 text-sun-ink">{text.ideasTip}</p>
    </aside>
  )
}
