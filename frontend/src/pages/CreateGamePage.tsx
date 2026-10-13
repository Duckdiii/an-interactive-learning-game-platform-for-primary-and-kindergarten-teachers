import { useState } from 'react'
import Button from '../components/Button'
import PageHeader from '../components/ui/PageHeader'
import { subjectTheme } from '../components/ui/subjectTheme'
import {
  GRADE_LEVEL_VALUES,
  SUBJECT_VALUES,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import {
  TEMPLATE_LEVELS,
  TOPIC_MAX_LENGTH,
  templatesForLevel,
} from '../constants/gameTemplates'
import type { GameTemplate, TemplateLevel } from '../constants/gameTemplates'
import { viText } from '../constants/viText'

interface GameForm {
  subject: string
  gradeLevel: string
  topic: string
}

const emptyForm: GameForm = { subject: '', gradeLevel: '', topic: '' }

const fieldClass =
  'mt-2 h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-4 text-base text-ink transition focus:border-brand'

export default function CreateGamePage() {
  const text = viText.generator
  const [level, setLevel] = useState<TemplateLevel>('KINDERGARTEN')
  const [form, setForm] = useState(emptyForm)

  const templates = templatesForLevel(level)
  // Mẫu đang chọn được suy ra từ nội dung form, nên sửa tay một ô thì mẫu tự bỏ chọn, không cần thêm state.
  const activeTemplate = templates.find((template) => matches(template, form))

  const chooseTemplate = (template: GameTemplate) =>
    setForm({
      subject: template.subject,
      gradeLevel: template.level,
      topic: template.topic,
    })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={text.kicker}
        title={text.title}
        description={text.description}
      />

      <section className="space-y-5">
        <div>
          <h3 className="text-xl font-bold text-ink">{text.templatesTitle}</h3>
          <p className="mt-1 text-base text-ink-soft">{text.templatesHint}</p>
        </div>

        <fieldset>
          <legend className="sr-only">{text.levelLegend}</legend>
          <div className="inline-flex rounded-xl border-2 border-ink/10 bg-white p-1">
            {TEMPLATE_LEVELS.map((option) => (
              <label key={option.value} className="block">
                <input
                  type="radio"
                  name="template-level"
                  value={option.value}
                  checked={level === option.value}
                  onChange={() => setLevel(option.value)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 cursor-pointer items-center rounded-lg px-5 text-base font-semibold text-ink-soft transition peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">{text.templatesLegend}</legend>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                checked={activeTemplate?.id === template.id}
                onChoose={() => chooseTemplate(template)}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section
        aria-labelledby="game-form-title"
        className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6"
      >
        <h3 id="game-form-title" className="text-xl font-bold text-ink">
          {text.formTitle}
        </h3>
        {/* Báo cho trình đọc màn hình biết form vừa được điền sẵn từ mẫu. */}
        <p role="status" className="sr-only">
          {activeTemplate ? `${text.filledFrom}: ${activeTemplate.title}` : ''}
        </p>

        <form
          className="mt-4 grid gap-5 sm:grid-cols-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="block">
            <span className="text-base font-semibold text-ink">
              {text.subjectLabel}
            </span>
            <select
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="">{text.chooseSubject}</option>
              {SUBJECT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {subjectLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-base font-semibold text-ink">
              {text.gradeLabel}
            </span>
            <select
              value={form.gradeLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  gradeLevel: event.target.value,
                }))
              }
              className={fieldClass}
            >
              <option value="">{text.chooseGrade}</option>
              {GRADE_LEVEL_VALUES.map((value) => (
                <option key={value} value={value}>
                  {gradeLevelLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="game-topic"
                className="text-base font-semibold text-ink"
              >
                {text.topicLabel}
              </label>
              <span
                id="game-topic-count"
                className="text-sm font-medium text-ink-soft"
              >
                {form.topic.length}/{TOPIC_MAX_LENGTH}
              </span>
            </div>
            <input
              id="game-topic"
              aria-describedby="game-topic-count"
              type="text"
              value={form.topic}
              maxLength={TOPIC_MAX_LENGTH}
              placeholder={text.topicPlaceholder}
              onChange={(event) =>
                setForm((current) => ({ ...current, topic: event.target.value }))
              }
              className={fieldClass}
            />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled aria-describedby="create-not-ready">
              {text.submit}
            </Button>
            <p id="create-not-ready" className="mt-3 text-base text-ink-soft">
              {text.notReady}
            </p>
          </div>
        </form>
      </section>
    </div>
  )
}

function matches(template: GameTemplate, form: GameForm) {
  return (
    form.subject === template.subject &&
    form.gradeLevel === template.level &&
    form.topic === template.topic
  )
}

function TemplateCard({
  template,
  checked,
  onChoose,
}: {
  template: GameTemplate
  checked: boolean
  onChoose: () => void
}) {
  const theme = subjectTheme(template.subject)

  return (
    <label className="block">
      <input
        type="radio"
        name="game-template"
        value={template.id}
        checked={checked}
        onChange={onChoose}
        className="peer sr-only"
      />
      <span className="flex h-full min-h-32 cursor-pointer flex-col gap-3 rounded-2xl border-2 border-ink/30 bg-white p-5 transition hover:border-brand peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
        <span className="flex items-center justify-between gap-2">
          <span
            className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${theme.chip}`}
          >
            {subjectLabel(template.subject)}
          </span>
          {checked ? (
            <span className="text-sm font-bold text-brand-strong">
              ✓ {viText.generator.selected}
            </span>
          ) : null}
        </span>
        <span className="text-lg font-bold leading-snug text-ink">
          {template.title}
        </span>
        <span className="text-base text-ink-soft">{template.topic}</span>
      </span>
    </label>
  )
}
