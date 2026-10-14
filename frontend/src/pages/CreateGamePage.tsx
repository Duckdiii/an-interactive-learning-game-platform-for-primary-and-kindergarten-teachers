import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import GameTypeSuggestionStep from '../components/create/GameTypeSuggestionStep'
import LessonContextChips from '../components/create/LessonContextChips'
import FileDropZone from '../components/ui/FileDropZone'
import FormField from '../components/ui/FormField'
import Icon from '../components/ui/Icon'
import { describedBy, inputClass, textareaClass } from '../components/ui/formStyles'
import { GAME_TEMPLATES } from '../constants/gameTemplates'
import {
  GRADE_LEVEL_VALUES,
  SUBJECT_VALUES,
  gameTypeLabel,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { useGameTypeSuggestions } from '../hooks/useGameTypeSuggestions'
import { useLessonContext } from '../hooks/useLessonContext'
import { usePageTitle } from '../hooks/usePageTitle'
import type { GameTypeSuggestion } from '../types/game-suggestion.types'
import { parseApiError } from '../utils/apiError'
import {
  IDEA_MAX_LENGTH,
  IDEA_MIN_LENGTH,
  MAX_GAMES_PER_REQUEST,
  checkGenerate,
  hasValidIdea,
} from '../utils/generateRequest'
import { ideaPlaceholderFor } from '../utils/ideaPlaceholder'
import { checkLessonFile } from '../utils/lessonFile'

type Mode = 'idea' | 'random'
type Step = 'describe' | 'suggest'
type FieldErrors = Partial<Record<'idea' | 'file', string>>

const DEFAULT_VOICE = { voiceRegion: 'NORTH', voiceGender: 'FEMALE' }

// Gợi ý từ Trang chủ (?idea=...&grade=...&subject=...) điền sẵn ô mô tả; giá trị lạ bị bỏ qua.
const known = (value: string | null, allowed: ReadonlyArray<string>) =>
  value && allowed.includes(value) ? value : undefined

export default function CreateGamePage() {
  usePageTitle(viText.generator.title)
  const text = viText.generator
  const [params] = useSearchParams()
  const [initialIdea] = useState(() => (params.get('idea') ?? '').slice(0, IDEA_MAX_LENGTH))
  const [idea, setIdea] = useState(initialIdea)
  const lesson = useLessonContext(idea, {
    gradeLevel: known(params.get('grade'), GRADE_LEVEL_VALUES),
    subject: known(params.get('subject'), SUBJECT_VALUES),
  })
  const [voice, setVoice] = useState(DEFAULT_VOICE)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<Step>('describe')
  const [mode, setMode] = useState<Mode>('idea')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const noticeRef = useRef<HTMLDivElement>(null)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const suggestionsMutation = useGameTypeSuggestions()
  const lastInput = useRef({ idea: '', gradeLevel: '', subject: '' })

  // "Tạo ngẫu nhiên" ở Trang chủ dẫn tới đây: đưa tiêu điểm vào ô khối lớp, ô đầu tiên của luồng này.
  useEffect(() => {
    if (params.get('random')) document.getElementById('create-grade')?.focus()
  }, [params])

  const touch = () => setReady(false)

  const templates = GAME_TEMPLATES.filter(
    (template) =>
      (lesson.gradeLevel || lesson.subject) &&
      (!lesson.gradeLevel || template.level === lesson.gradeLevel) &&
      (!lesson.subject || template.subject === lesson.subject),
  )
  const hasContext = Boolean(lesson.gradeLevel || lesson.subject)

  const randomBlocked = idea.trim() !== '' || file !== null

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
    touch()
  }

  const retrySuggestions = () => {
    requestSuggestions()
    // Nút "Thử lại" bị gỡ khỏi trang khi bắt đầu tải lại: đưa tiêu điểm về tiêu đề bước để không rơi về đầu trang.
    setTimeout(() => stepHeadingRef.current?.focus({ preventScroll: true }), 0)
  }

  const requestSuggestions = () => {
    suggestionsMutation.mutate(lastInput.current, {
      // Loại đứng đầu (phù hợp nhất) được chọn sẵn để giáo viên chỉ cần bấm Tạo nếu đồng ý.
      onSuccess: (data: GameTypeSuggestion[]) => setSelectedTypes(data[0] ? [data[0].type] : []),
    })
  }

  const submit = (nextMode: Mode) => {
    const problem = checkGenerate({ idea, hasFile: file !== null }, nextMode)

    setErrors(problem ? { idea: text.errorNeedIdea } : {})
    touch()

    if (problem) {
      // Chuyển tiêu điểm tới ô lỗi (sau khi React đã vẽ aria-invalid).
      setTimeout(() => document.getElementById('create-idea')?.focus(), 0)
      return
    }

    setMode(nextMode)
    setSelectedTypes([])
    lastInput.current = {
      idea: nextMode === 'random' ? '' : idea.trim(),
      gradeLevel: lesson.gradeLevel,
      subject: lesson.subject,
    }
    setStep('suggest')
    requestSuggestions()
    // Về đầu trang để thấy cả thanh các bước, rồi mới chuyển tiêu điểm (không để trình duyệt tự cuộn tới tiêu đề).
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      stepHeadingRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  const backToDescribe = () => {
    suggestionsMutation.reset()
    setStep('describe')
    touch()
    setTimeout(() => document.getElementById('create-idea')?.focus(), 0)
  }

  const toggleType = (type: string) => {
    touch()
    setSelectedTypes((current) => {
      if (current.includes(type)) return current.filter((item) => item !== type)

      return current.length >= MAX_GAMES_PER_REQUEST ? current : [...current, type]
    })
  }

  const createSelected = () => {
    // Endpoint POST /games/generate còn `planned`: báo rõ chưa tạo được để giáo viên không tưởng trò chơi đã được tạo.
    // Khi endpoint sẵn sàng, với mỗi loại đã chọn dựng yêu cầu bằng buildGenerateRequest(form, mode, type) rồi gọi API.
    setReady(true)
    setTimeout(() => noticeRef.current?.focus(), 0)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit('idea')
  }

  const suggestions = suggestionsMutation.data ?? []
  const suggestionStatus =
    suggestionsMutation.status === 'error'
      ? 'error'
      : suggestionsMutation.status === 'success'
        ? 'success'
        : 'pending'

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
        <ol
          aria-label={text.stepsLabel}
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-semibold"
        >
          <StepMarker number={1} label={text.stepDescribe} current={step === 'describe'} done={step === 'suggest'} />
          <li aria-hidden="true" className="h-0.5 w-6 bg-ink/20" />
          <StepMarker number={2} label={text.stepPick} current={step === 'suggest'} done={false} />
        </ol>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem] xl:items-start">
        <div className="space-y-6">
          {step === 'describe' ? (
            <form
              onSubmit={onSubmit}
              noValidate
              className="space-y-6 rounded-3xl border-2 border-ink/10 bg-white p-5 sm:p-7"
            >
              <LessonContextChips
                gradeLevel={lesson.gradeLevel}
                subject={lesson.subject}
                gradeIsGuess={lesson.gradeIsGuess}
                subjectIsGuess={lesson.subjectIsGuess}
                onGradeLevelChange={(value) => {
                  lesson.setGradeLevel(value)
                  touch()
                }}
                onSubjectChange={(value) => {
                  lesson.setSubject(value)
                  touch()
                }}
              />

              <FormField
                id="create-idea"
                label={text.ideaLabel}
                hint={text.ideaHint}
                error={errors.idea}
                aside={
                  <span className="text-sm font-medium text-ink-soft" aria-hidden="true">
                    {idea.length}/{IDEA_MAX_LENGTH}
                  </span>
                }
              >
                <textarea
                  id="create-idea"
                  value={idea}
                  maxLength={IDEA_MAX_LENGTH}
                  placeholder={ideaPlaceholderFor(lesson.gradeLevel, lesson.subject)}
                  onChange={(event) => {
                    setIdea(event.target.value)
                    setErrors((current) => ({ ...current, idea: undefined }))
                    touch()
                  }}
                  aria-invalid={errors.idea ? true : undefined}
                  aria-describedby={describedBy('create-idea', { hint: true, error: Boolean(errors.idea) })}
                  className={textareaClass(Boolean(errors.idea))}
                />
              </FormField>

              <div>
                <p className="text-base font-semibold text-ink">{text.suggestionsTitle}</p>
                {templates.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {templates.map((template) => {
                      const active = idea === template.topic

                      return (
                        <li key={template.id}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setIdea(template.topic)
                              // Chọn mẫu là chọn luôn khối lớp và môn của mẫu, để danh sách gợi ý không "trôi" theo từ khóa AI đoán.
                              lesson.setGradeLevel(template.level)
                              lesson.setSubject(template.subject)
                              setErrors((current) => ({ ...current, idea: undefined }))
                              touch()
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
                    {hasContext ? text.suggestionsNone : text.suggestionsHint}
                  </p>
                )}
                <p role="status" className="sr-only">
                  {templates.length > 0 ? `${templates.length} ${text.suggestionsCount}` : ''}
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
                    touch()
                  }}
                />
              </FormField>

              <details className="group rounded-2xl border-2 border-ink/10 px-4 py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-base font-bold">
                  {text.advancedTitle}
                  <Icon name="chevronDown" className="h-5 w-5 transition group-open:rotate-180" />
                </summary>
                <div className="grid gap-5 pb-4 pt-2 sm:grid-cols-2">
                  <FormField id="create-voice-region" label={text.voiceRegionLabel}>
                    <select
                      id="create-voice-region"
                      value={voice.voiceRegion}
                      onChange={(event) => setVoice((current) => ({ ...current, voiceRegion: event.target.value }))}
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
                      value={voice.voiceGender}
                      onChange={(event) => setVoice((current) => ({ ...current, voiceGender: event.target.value }))}
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
          ) : (
            <GameTypeSuggestionStep
              ref={stepHeadingRef}
              status={suggestionStatus}
              suggestions={suggestions}
              selected={selectedTypes}
              subject={lesson.subject}
              randomTopic={mode === 'random'}
              errorMessage={
                suggestionsMutation.error
                  ? parseApiError(suggestionsMutation.error, text.suggestErrorFallback).message
                  : undefined
              }
              onToggle={toggleType}
              onCreate={createSelected}
              onBack={backToDescribe}
              onRetry={retrySuggestions}
            />
          )}

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
        </div>

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
              value={lesson.gradeLevel ? gradeLevelLabel(lesson.gradeLevel) : ''}
              empty={text.noValueOption}
              note={lesson.gradeIsGuess ? text.aiGuessTag : undefined}
            />
            <SummaryRow
              label={text.subjectLabel}
              value={lesson.subject ? subjectLabel(lesson.subject) : ''}
              empty={text.noValueOption}
              note={lesson.subjectIsGuess ? text.aiGuessTag : undefined}
            />
            <SummaryRow
              label={text.ideaLabel}
              value={step === 'suggest' && mode === 'random' ? text.randomTopicSummary : idea.trim()}
              clamp
              hint={
                idea.trim() && !hasValidIdea(idea)
                  ? text.ideaNeedMore.replace('{n}', String(IDEA_MIN_LENGTH - idea.trim().length))
                  : undefined
              }
            />
            <SummaryRow label={text.fileSummaryLabel} value={file?.name ?? ''} />
            <SummaryRow
              label={text.gameTypeLabel}
              value={
                step === 'suggest'
                  ? selectedTypes.map(gameTypeLabel).join(', ')
                  : text.gameTypeAuto
              }
            />
          </dl>
        </aside>
      </div>
    </div>
  )
}

function StepMarker({
  number,
  label,
  current,
  done,
}: {
  number: number
  label: string
  current: boolean
  done: boolean
}) {
  return (
    <li aria-current={current ? 'step' : undefined} className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={[
          'grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold',
          current ? 'bg-brand text-white' : done ? 'bg-brand-soft text-brand-strong' : 'bg-ink/10 text-ink-soft',
        ].join(' ')}
      >
        {done ? <Icon name="check" className="h-4 w-4" /> : number}
      </span>
      <span className={current ? 'text-ink' : 'text-ink-soft'}>
        {label}
        {done ? <span className="sr-only"> ({viText.generator.stepDone})</span> : null}
      </span>
    </li>
  )
}

function SummaryRow({
  label,
  value,
  clamp,
  hint,
  note,
  empty = viText.generator.summaryEmpty,
}: {
  label: string
  value: string
  clamp?: boolean
  hint?: string
  note?: string
  empty?: string
}) {
  return (
    <div>
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${clamp ? 'line-clamp-3' : ''}`}>
        {value || <span className="font-normal text-ink-soft">{empty}</span>}
      </dd>
      {note ? <dd className="text-sm font-medium text-brand-strong">{note}</dd> : null}
      {hint ? <dd className="text-sm font-medium text-rose-800">{hint}</dd> : null}
    </div>
  )
}
