import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import CreateGamesProgress from '../components/create/CreateGamesProgress'
import CreateProgressPanel from '../components/create/CreateProgressPanel'
import GameTypeSuggestionStep from '../components/create/GameTypeSuggestionStep'
import IdeaSuggestions from '../components/create/IdeaSuggestions'
import LessonContextPicker from '../components/create/LessonContextPicker'
import { deduceThemeFromText } from '../utils/assetResolver'
import FileDropZone from '../components/ui/FileDropZone'
import FormField from '../components/ui/FormField'
import Icon from '../components/ui/Icon'
import { describedBy, inputClass, textareaClass } from '../components/ui/formStyles'
import { ideaGroupOf } from '../constants/createIdeas'
import type { Idea, IdeaGroup } from '../constants/createIdeas'
import {
  GRADE_LEVEL_VALUES,
  SUBJECT_VALUES,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { isMock } from '../config/mockMode'
import { ROUTES } from '../routes/paths'
import { useCreateGames } from '../hooks/useCreateGames'
import { useGameTypeSuggestions } from '../hooks/useGameTypeSuggestions'
import { useLessonContext } from '../hooks/useLessonContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { parseApiError } from '../utils/apiError'
import {
  IDEA_MAX_LENGTH,
  buildGenerateRequest,
  checkGenerate,
} from '../utils/generateRequest'
import { ideaPlaceholderFor } from '../utils/ideaPlaceholder'
import { LESSON_FILE_MAX_BYTES, checkLessonFile } from '../utils/lessonFile'

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
  const navigate = useNavigate()
  const creation = useCreateGames()
  const progressRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const wasCreating = useRef(false)
  // Mô tả và khối của lần tạo đang chạy, để màn tiến trình hiện (không đọc ref lúc vẽ).
  const [creatingInput, setCreatingInput] = useState({ idea: '', gradeLevel: '' })

  // Vừa tạo xong mà còn ở trang (lỗi một phần hoặc đã hủy): khối kết quả mới được vẽ lại sau màn tiến trình,
  // nên chờ nó có trong DOM rồi mới đưa tiêu điểm tới để người dùng bàn phím và trình đọc màn hình biết ngay.
  useEffect(() => {
    if (wasCreating.current && !creation.creating) progressRef.current?.focus()
    wasCreating.current = creation.creating
  }, [creation.creating])
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const suggestionsMutation = useGameTypeSuggestions()
  const lastInput = useRef({ idea: '', gradeLevel: '', subject: '' })

  // "Tạo ngẫu nhiên" ở Trang chủ dẫn tới đây: đưa tiêu điểm vào ô khối lớp, ô đầu tiên của luồng này.
  useEffect(() => {
    if (params.get('random')) document.getElementById('create-grade')?.focus()
  }, [params])

  // Đổi ý tưởng hoặc lựa chọn thì kết quả tạo trước đó không còn đúng nữa (game đã tạo vẫn còn trong danh sách, chỉ không dùng lại cho lần tạo mới).
  const touch = () => creation.reset()

  // Chọn nhóm "Lớp 2–5" mà chưa chọn lớp cụ thể: giữ nhóm mở nhưng khối vẫn là "chưa xác định".
  const [upperOpen, setUpperOpen] = useState(false)
  const group: IdeaGroup | '' = ideaGroupOf(lesson.gradeLevel) || (upperOpen ? 'UPPER' : '')
  const ideaRef = useRef<HTMLTextAreaElement>(null)

  const chooseGroup = (next: IdeaGroup) => {
    const unselect = group === next
    setUpperOpen(next === 'UPPER' && !unselect)
    if (next === 'UPPER') {
      if (unselect || ideaGroupOf(lesson.gradeLevel) !== 'UPPER') lesson.setGradeLevel('')
    } else {
      lesson.setGradeLevel(unselect ? '' : next)
    }
    touch()
  }

  // Điền ý tưởng soạn sẵn rồi đưa tiêu điểm về ô để cô sửa tiếp; ô đã có chữ thì nối thêm, không xóa chữ cô đã gõ.
  const pickIdea = (picked: Idea) => {
    const line = `${picked.title}: ${picked.description}`
    setIdea((current) => (current.trim() ? `${current.trimEnd()}\n${line}` : line).slice(0, IDEA_MAX_LENGTH))
    setErrors((current) => ({ ...current, idea: undefined }))
    touch()
    ideaRef.current?.focus()
  }

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
    suggestionsMutation.mutate(lastInput.current)
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

  // Mỗi loại là một yêu cầu sinh game (F5 chỉ gửi một loại). Dựng từ ĐÚNG dữ liệu đã dùng để đề xuất (lastInput), không từ ô nhập hiện tại.
  // Loại đã tạo xong được useCreateGames nhớ nên bấm lại cũng không tạo trùng.
  const createSelected = async (types: ReadonlyArray<string>) => {
    const form = {
      subject: lastInput.current.subject,
      gradeLevel: lastInput.current.gradeLevel,
      idea: lastInput.current.idea,
      voiceRegion: voice.voiceRegion,
      voiceGender: voice.voiceGender,
      hasFile: file !== null,
      theme: deduceThemeFromText(lastInput.current.idea).theme,
    }
    setCreatingInput({ idea: form.idea, gradeLevel: form.gradeLevel })
    const running = creation.create(types.map((type) => buildGenerateRequest(form, mode, type)))

    // Nút Tạo vừa biến mất (mất tiêu điểm): đưa tiêu điểm tới màn tiến trình để người dùng bàn phím tới ngay nút "Hủy tạo".
    setTimeout(() => panelRef.current?.focus(), 0)

    const outcome = await running

    if (outcome.status === 'done') {
      // Một game thì vào thẳng trình soạn thảo; nhiều game thì về "Trò chơi của tôi" kèm thông báo (các game có dấu "Mới").
      if (outcome.games.length === 1) navigate(`${ROUTES.workspaceEditor}?gameId=${encodeURIComponent(outcome.games[0].gameId)}`)
      else navigate(ROUTES.workspace, { state: { created: outcome.games.length } })

      return
    }

    // Bấm lại kiểu đã lỗi không thể thử lại (không an toàn...): không có lượt chạy mới nên đưa tiêu điểm tới khối lỗi, nút không "im lặng".
    if (outcome.status === 'partial') setTimeout(() => progressRef.current?.focus(), 0)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit('idea')
  }

  const suggestions = suggestionsMutation.data ?? []
  const suggestContext =
    mode === 'random'
      ? text.suggestStepRandom
      : [lesson.subject && subjectLabel(lesson.subject), lesson.gradeLevel && gradeLevelLabel(lesson.gradeLevel), idea.trim()]
          .filter(Boolean)
          .join(' · ')
  const suggestionStatus =
    suggestionsMutation.status === 'error'
      ? 'error'
      : suggestionsMutation.status === 'success'
        ? 'success'
        : 'pending'

  if (creation.creating) {
    return (
      <CreateProgressPanel
        ref={panelRef}
        idea={creatingInput.idea}
        gradeLevel={creatingInput.gradeLevel}
        types={selectedTypes}
        mock={isMock('ai')}
        onCancel={creation.cancel}
      />
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        {step === 'describe' ? (
          <Link
            to={ROUTES.dashboard}
            aria-label={text.backHome}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface text-2xl font-bold text-ink shadow-sm transition hover:bg-brand-soft"
          >
            <span aria-hidden="true">‹</span>
          </Link>
        ) : null}
        <ol
          aria-label={text.stepsLabel}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-semibold"
        >
          <StepMarker number={1} label={text.stepDescribe} current={step === 'describe'} done={step === 'suggest'} />
          <li aria-hidden="true" className="h-0.5 w-6 bg-ink/20" />
          <StepMarker
            number={2}
            label={text.stepPick}
            current={step === 'suggest' && !creation.creating}
            done={step === 'suggest' && creation.creating}
          />
          <li aria-hidden="true" className="h-0.5 w-6 bg-ink/20" />
          <StepMarker number={3} label={text.stepCompose} current={step === 'suggest' && creation.creating} done={false} />
        </ol>
        <h1 ref={stepHeadingRef} tabIndex={-1} className="font-display text-3xl font-extrabold outline-none sm:text-4xl">
          {step === 'describe' ? text.heading : text.suggestStepTitle}
        </h1>
      </header>

      <div className={`grid items-start gap-6 ${step === 'describe' ? 'lg:grid-cols-[2fr_1fr]' : ''}`}>
        <div className="space-y-6">
          {step === 'describe' ? (
            <form
              onSubmit={onSubmit}
              noValidate
              className="space-y-6 rounded-3xl bg-surface p-5 shadow-sm sm:p-7"
            >
              <LessonContextPicker
                gradeLevel={lesson.gradeLevel}
                subject={lesson.subject}
                group={group}
                gradeIsGuess={lesson.gradeIsGuess}
                subjectIsGuess={lesson.subjectIsGuess}
                onGroupChange={chooseGroup}
                onGradeLevelChange={(value) => {
                  // Bỏ chọn lớp cụ thể thì giữ hàng lớp mở để cô chọn lại.
                  setUpperOpen(group === 'UPPER')
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
                  ref={ideaRef}
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

              <FormField
                id="create-file"
                label={text.fileLabel}
                hint={text.fileHint.replace('{n}', String(LESSON_FILE_MAX_BYTES / (1024 * 1024)))}
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
                <Button type="submit" size="lg" className="gap-2">
                  <Icon name="sparkles" />
                  {text.submit}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
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
              // Mỗi lần đề xuất mới thì quay về 3 thẻ đầu.
              key={suggestionsMutation.submittedAt}
              status={suggestionStatus}
              suggestions={suggestions}
              subject={lesson.subject}
              context={suggestContext}
              errorMessage={
                suggestionsMutation.error
                  ? parseApiError(suggestionsMutation.error, text.suggestErrorFallback).message
                  : undefined
              }
              onUse={(type) => {
                setSelectedTypes([type])
                void createSelected([type])
              }}
              onBack={backToDescribe}
              onRetry={retrySuggestions}
            />
          )}

          {step === 'suggest' && file !== null ? (
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
              {text.fileNotUsed}
            </p>
          ) : null}

          {step === 'suggest' ? (
            <CreateGamesProgress
              ref={progressRef}
              types={selectedTypes}
              creating={creation.creating}
              canceled={creation.canceled}
              created={creation.created}
              failures={creation.failures}
              mock={isMock('ai')}
              onRetry={() => void createSelected(selectedTypes)}
              onCancel={creation.cancel}
            />
          ) : null}
        </div>

        {step === 'describe' ? (
          <IdeaSuggestions subject={lesson.subject} group={group} onPick={pickIdea} />
        ) : null}
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
