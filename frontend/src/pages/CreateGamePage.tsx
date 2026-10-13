import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import FileDropZone from '../components/ui/FileDropZone'
import FormField from '../components/ui/FormField'
import Icon from '../components/ui/Icon'
import { describedBy, inputClass, textareaClass } from '../components/ui/formStyles'
import { GAME_TEMPLATES } from '../constants/gameTemplates'
import {
  GAME_TYPE_VALUES,
  GRADE_LEVEL_VALUES,
  SUBJECT_VALUES,
  gameTypeLabel,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  IDEA_MAX_LENGTH,
  IDEA_MIN_LENGTH,
  checkGenerate,
  hasValidIdea,
} from '../utils/generateRequest'
import type { GenerateForm } from '../utils/generateRequest'
import { checkLessonFile } from '../utils/lessonFile'

type Mode = 'idea' | 'random'
type FieldErrors = Partial<Record<'grade' | 'subject' | 'idea' | 'file', string>>

const INITIAL = {
  subject: '',
  gradeLevel: '',
  idea: '',
  gameType: '',
  voiceRegion: 'NORTH',
  voiceGender: 'FEMALE',
}

export default function CreateGamePage() {
  usePageTitle(viText.generator.title)
  const text = viText.generator
  const [params] = useSearchParams()
  const [form, setForm] = useState(INITIAL)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [ready, setReady] = useState(false)
  const noticeRef = useRef<HTMLDivElement>(null)
  const gradeRef = useRef<HTMLSelectElement>(null)

  // "Tạo ngẫu nhiên" ở Trang chủ dẫn tới đây: đưa tiêu điểm vào ô khối lớp, bước đầu tiên của luồng này.
  useEffect(() => {
    if (params.get('random')) gradeRef.current?.focus()
  }, [params])

  const set = (patch: Partial<typeof INITIAL>) => {
    setForm((current) => ({ ...current, ...patch }))
    setReady(false)
  }

  const suggestions = GAME_TEMPLATES.filter(
    (template) =>
      template.subject === form.subject && template.level === form.gradeLevel,
  )

  const generateForm: GenerateForm = { ...form, hasFile: file !== null }
  const randomBlocked = form.idea.trim() !== '' || file !== null

  const chooseFile = (chosen: File) => {
    const problem = checkLessonFile(chosen)

    if (problem) {
      setFile(null)
      setFileError(problem === 'badType' ? text.fileBadType : text.fileTooLarge)
      return
    }

    setFileError('')
    setFile(chosen)
    setErrors((current) => ({ ...current, idea: undefined }))
    setReady(false)
  }

  const submit = (mode: Mode) => {
    const next: FieldErrors = {}
    const problem = checkGenerate(generateForm, mode)

    if (problem === 'needGradeSubject') {
      if (!form.gradeLevel) next.grade = text.errorNeedGrade
      if (!form.subject) next.subject = text.errorNeedSubject
    } else if (problem === 'needIdea') {
      next.idea = text.errorNeedIdea
    }

    setErrors(next)
    setReady(false)

    if (problem) {
      // Chuyển tiêu điểm tới ô lỗi đầu tiên (sau khi React đã vẽ aria-invalid).
      const target = next.grade ? 'create-grade' : next.subject ? 'create-subject' : 'create-idea'
      setTimeout(() => document.getElementById(target)?.focus(), 0)
      return
    }

    // Endpoint POST /games/generate còn `planned`: báo rõ chưa tạo được để giáo viên không tưởng trò chơi đã được tạo.
    // Khi endpoint sẵn sàng, dựng payload bằng buildGenerateRequest(generateForm, mode) rồi gọi API ở đây.
    setReady(true)
    setTimeout(() => noticeRef.current?.focus(), 0)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit('idea')
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
          {text.kicker}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{text.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
          {text.description}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem] xl:items-start">
        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-6 rounded-3xl border-2 border-ink/10 bg-white p-5 sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="create-grade" label={text.gradeLabel} required error={errors.grade}>
              <select
                id="create-grade"
                ref={gradeRef}
                value={form.gradeLevel}
                onChange={(event) => {
                  set({ gradeLevel: event.target.value })
                  setErrors((current) => ({ ...current, grade: undefined }))
                }}
                aria-invalid={errors.grade ? true : undefined}
                aria-describedby={describedBy('create-grade', { error: Boolean(errors.grade) })}
                className={inputClass(Boolean(errors.grade))}
              >
                <option value="">{text.chooseGrade}</option>
                {GRADE_LEVEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {gradeLevelLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="create-subject" label={text.subjectLabel} required error={errors.subject}>
              <select
                id="create-subject"
                value={form.subject}
                onChange={(event) => {
                  set({ subject: event.target.value })
                  setErrors((current) => ({ ...current, subject: undefined }))
                }}
                aria-invalid={errors.subject ? true : undefined}
                aria-describedby={describedBy('create-subject', { error: Boolean(errors.subject) })}
                className={inputClass(Boolean(errors.subject))}
              >
                <option value="">{text.chooseSubject}</option>
                {SUBJECT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {subjectLabel(value)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            id="create-idea"
            label={text.ideaLabel}
            hint={text.ideaHint}
            error={errors.idea}
            aside={
              <span className="text-sm font-medium text-ink-soft" aria-hidden="true">
                {form.idea.length}/{IDEA_MAX_LENGTH}
              </span>
            }
          >
            <textarea
              id="create-idea"
              value={form.idea}
              maxLength={IDEA_MAX_LENGTH}
              placeholder={text.ideaPlaceholder}
              onChange={(event) => {
                set({ idea: event.target.value })
                setErrors((current) => ({ ...current, idea: undefined }))
              }}
              aria-invalid={errors.idea ? true : undefined}
              aria-describedby={describedBy('create-idea', { hint: true, error: Boolean(errors.idea) })}
              className={textareaClass(Boolean(errors.idea))}
            />
          </FormField>

          <div>
            <p className="text-base font-semibold text-ink">{text.suggestionsTitle}</p>
            {suggestions.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((template) => {
                  const active = form.idea === template.topic

                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          set({ idea: template.topic })
                          setErrors((current) => ({ ...current, idea: undefined }))
                        }}
                        className={[
                          'inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-semibold transition',
                          active
                            ? 'border-brand bg-brand text-white'
                            : 'border-ink/20 bg-white text-ink hover:border-brand hover:bg-brand-soft',
                        ].join(' ')}
                      >
                        {active ? <Icon name="check" className="h-4 w-4" /> : null}
                        {template.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">
                {form.subject && form.gradeLevel ? text.suggestionsNone : text.suggestionsHint}
              </p>
            )}
            <p role="status" className="sr-only">
              {suggestions.length > 0 ? `${suggestions.length} ${text.suggestionsCount}` : ''}
            </p>
          </div>

          <FormField
            id="create-file"
            label={text.fileLabel}
            hint={text.fileHint}
            error={fileError}
          >
            <FileDropZone
              id="create-file"
              file={file}
              invalid={Boolean(fileError)}
              describedBy={describedBy('create-file', { hint: true, error: Boolean(fileError) })}
              onSelect={chooseFile}
              onRemove={() => {
                setFile(null)
                setReady(false)
              }}
            />
          </FormField>

          <details className="group rounded-2xl border-2 border-ink/10 px-4 py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-base font-bold">
              {text.advancedTitle}
              <Icon name="chevronDown" className="h-5 w-5 transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-5 pb-4 pt-2 sm:grid-cols-3">
              <FormField id="create-game-type" label={text.gameTypeLabel}>
                <select
                  id="create-game-type"
                  value={form.gameType}
                  onChange={(event) => set({ gameType: event.target.value })}
                  className={inputClass()}
                >
                  <option value="">{text.gameTypeAuto}</option>
                  {GAME_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {gameTypeLabel(value)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="create-voice-region" label={text.voiceRegionLabel}>
                <select
                  id="create-voice-region"
                  value={form.voiceRegion}
                  onChange={(event) => set({ voiceRegion: event.target.value })}
                  className={inputClass()}
                >
                  {text.voiceRegions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="create-voice-gender" label={text.voiceGenderLabel}>
                <select
                  id="create-voice-gender"
                  value={form.voiceGender}
                  onChange={(event) => set({ voiceGender: event.target.value })}
                  className={inputClass()}
                >
                  {text.voiceGenders.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </details>

          {ready ? (
            <div
              ref={noticeRef}
              tabIndex={-1}
              role="status"
              className="rounded-2xl border-2 border-sun bg-sun-soft p-4 outline-none"
            >
              <p className="flex items-center gap-2 text-base font-bold text-ink">
                <Icon name="info" />
                {text.notReadyTitle}
              </p>
              <p className="mt-1 text-base leading-7 text-ink">{text.notReady}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" className="gap-2">
              <Icon name="sparkles" />
              {text.submit}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={randomBlocked}
              aria-describedby="create-random-hint"
              onClick={() => submit('random')}
            >
              <Icon name="dice" />
              {text.random}
            </Button>
          </div>
          <p id="create-random-hint" className="-mt-2 text-sm text-ink-soft">
            {randomBlocked ? text.randomBlockedHint : text.randomHint}
          </p>
        </form>

        <aside
          aria-labelledby="summary-title"
          className="hidden rounded-3xl border-2 border-ink/10 bg-white p-5 xl:sticky xl:top-8 xl:block"
        >
          <h2 id="summary-title" className="text-lg font-extrabold">
            {text.summaryTitle}
          </h2>
          <dl className="mt-4 space-y-3 text-base">
            <SummaryRow
              label={text.gradeLabel}
              value={form.gradeLevel ? gradeLevelLabel(form.gradeLevel) : ''}
            />
            <SummaryRow
              label={text.subjectLabel}
              value={form.subject ? subjectLabel(form.subject) : ''}
            />
            <SummaryRow
              label={text.ideaLabel}
              value={form.idea.trim()}
              clamp
              hint={
                form.idea.trim() && !hasValidIdea(form.idea)
                  ? `Cần thêm ${IDEA_MIN_LENGTH - form.idea.trim().length} ký tự`
                  : undefined
              }
            />
            <SummaryRow label={text.fileSummaryLabel} value={file?.name ?? ''} />
            <SummaryRow
              label={text.gameTypeLabel}
              value={form.gameType ? gameTypeLabel(form.gameType) : text.gameTypeAuto}
            />
          </dl>
        </aside>
      </div>

    </div>
  )
}

function SummaryRow({
  label,
  value,
  clamp,
  hint,
}: {
  label: string
  value: string
  clamp?: boolean
  hint?: string
}) {
  return (
    <div>
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${clamp ? 'line-clamp-3' : ''}`}>
        {value || <span className="font-normal text-ink-soft">{viText.generator.summaryEmpty}</span>}
      </dd>
      {hint ? <dd className="text-sm font-medium text-rose-800">{hint}</dd> : null}
    </div>
  )
}
