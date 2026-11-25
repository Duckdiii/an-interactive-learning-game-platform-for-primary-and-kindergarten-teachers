import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import CreateGamesProgress from '../components/create/CreateGamesProgress'
import CreateProgressPanel from '../components/create/CreateProgressPanel'
import GameTypeSuggestionStep from '../components/create/GameTypeSuggestionStep'
import VisualClozeSetupForm from '../components/create/VisualClozeSetupForm'
import OddOneOutSetupForm from '../components/create/OddOneOutSetupForm'
import type { VisualClozeImageOptionInput } from '../components/create/VisualClozeSetupForm'
import IdeaSuggestions from '../components/create/IdeaSuggestions'
import LessonContextPicker from '../components/create/LessonContextPicker'
import RequestChat from '../components/create/RequestChat'
import UnderstandingCard from '../components/create/UnderstandingCard'
import { useRequestChat } from '../hooks/useRequestChat'
import { composeIdea } from '../utils/understandingIdea'
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
import { usePrepareLesson } from '../hooks/usePrepareLesson'
import { useLessonContext } from '../hooks/useLessonContext'
import { useClassrooms } from '../hooks/useClassrooms'
import { useSavedSuggestions, useTeacherProfile } from '../hooks/useTeacherProfile'
import { usePageTitle } from '../hooks/usePageTitle'
import { parseApiError } from '../utils/apiError'
import {
  IDEA_MAX_LENGTH,
  buildGenerateRequest,
  checkGenerate,
  parseReviewFrom,
} from '../utils/generateRequest'
import { ideaPlaceholderFor } from '../utils/ideaPlaceholder'
import { LESSON_FILE_MAX_BYTES, checkLessonFile } from '../utils/lessonFile'

type Mode = 'idea' | 'random'
// 'chat': trao đổi với trợ lý rồi xác nhận thẻ (đường mô tả); 'suggest': AI đề xuất kiểu chơi (tạo ngẫu nhiên, hoặc có giáo án).
type Step = 'describe' | 'chat' | 'suggest'
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
  // Game ôn tập từ kết quả lớp: chỉ mang mã game và mã câu, Backend tự lấy số liệu (không đưa dữ liệu học sinh qua địa chỉ).
  const [reviewFrom] = useState(() => parseReviewFrom(params.get('reviewGame'), params.get('reviewQ')))
  const profile = useTeacherProfile()
  const classrooms = useClassrooms()
  const savedTopics = useSavedSuggestions()
  const [classroomId, setClassroomId] = useState('')
  const selectedClassroom = classrooms.data?.find((classroom) => classroom.classroomId === classroomId)
  const lesson = useLessonContext(idea, {
    gradeLevel: known(params.get('grade'), GRADE_LEVEL_VALUES),
    subject: known(params.get('subject'), SUBJECT_VALUES),
  }, {
    gradeLevel: profile.data?.gradeLevel ?? undefined,
    subject: profile.data?.subject ?? undefined,
  }, selectedClassroom?.learningProfile?.gradeLevel ?? undefined)
  const [voiceOverride, setVoiceOverride] = useState<Partial<typeof DEFAULT_VOICE>>({})
  const voice = {
    voiceRegion: voiceOverride.voiceRegion ?? DEFAULT_VOICE.voiceRegion,
    voiceGender: voiceOverride.voiceGender ?? profile.data?.voice ?? DEFAULT_VOICE.voiceGender,
  }
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<Step>('describe')
  const [mode, setMode] = useState<Mode>('idea')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [visualClozeSetupOpen, setVisualClozeSetupOpen] = useState(false)
  const [oddSetupOpen, setOddSetupOpen] = useState(false)
  const [oddOneOutMode, setOddOneOutMode] = useState<'TEXT' | 'IMAGE'>('TEXT')
  const [visualClozeMode, setVisualClozeMode] = useState<'TEXT' | 'IMAGE'>('TEXT')
  const [sceneImageUrl, setSceneImageUrl] = useState('')
  const [optionImages, setOptionImages] = useState<VisualClozeImageOptionInput[]>([
    { imageUrl: '', visualPrompt: '' },
    { imageUrl: '', visualPrompt: '' },
  ])
  const navigate = useNavigate()
  const creation = useCreateGames()
  const preparation = usePrepareLesson()
  const [reviewIdea, setReviewIdea] = useState('')
  const [preparationMessage, setPreparationMessage] = useState('')
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
  const requestSuggestion = suggestionsMutation.mutate
  const deepLinkStarted = useRef<URLSearchParams | null>(null)
  const lastInput = useRef({ idea: '', gradeLevel: '', subject: '' })
  const chat = useRequestChat({ subject: lesson.subject, gradeLevel: lesson.gradeLevel })

  // "Tạo ngẫu nhiên" ở Trang chủ dẫn tới đây: đưa tiêu điểm vào ô khối lớp, ô đầu tiên của luồng này.
  useEffect(() => {
    if (params.get('random')) document.getElementById('create-grade')?.focus()
  }, [params])

  useEffect(() => {
    if (params.get('step') === 'suggest' && initialIdea && deepLinkStarted.current !== params) {
      const grade = known(params.get('grade'), GRADE_LEVEL_VALUES)
      const subject = known(params.get('subject'), SUBJECT_VALUES)
      if (profile.isFetching && (!grade || !subject)) return
      deepLinkStarted.current = params
      setMode('idea')
      lastInput.current = {
        idea: initialIdea.trim(),
        gradeLevel: grade ?? profile.data?.gradeLevel ?? '',
        subject: subject ?? profile.data?.subject ?? '',
      }
      setStep('suggest')
      requestSuggestion(lastInput.current)
    }
  }, [params, initialIdea, profile.isFetching, profile.data, requestSuggestion])

  // Đổi ý tưởng hoặc lựa chọn thì kết quả tạo trước đó không còn đúng nữa (game đã tạo vẫn còn trong danh sách, chỉ không dùng lại cho lần tạo mới).
  const touch = () => {
    creation.reset()
    preparation.reset()
    setReviewIdea('')
    setPreparationMessage('')
  }

  // Chọn nhóm "Lớp 2–5" mà chưa chọn lớp cụ thể: giữ nhóm mở nhưng khối vẫn là "chưa xác định".
  const [upperOpen, setUpperOpen] = useState(false)
  const group: IdeaGroup | '' = ideaGroupOf(lesson.gradeLevel) || (upperOpen ? 'UPPER' : '')
  const ideaRef = useRef<HTMLTextAreaElement>(null)

  const changeGrade = (value: string) => {
    if (selectedClassroom?.learningProfile?.gradeLevel && selectedClassroom.learningProfile.gradeLevel !== value) {
      setClassroomId('')
    }
    lesson.setGradeLevel(value)
  }

  const chooseGroup = (next: IdeaGroup) => {
    const unselect = group === next
    setUpperOpen(next === 'UPPER' && !unselect)
    if (next === 'UPPER') {
      if (unselect || ideaGroupOf(lesson.gradeLevel) !== 'UPPER') changeGrade('')
    } else {
      changeGrade(unselect ? '' : next)
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

  const beginSuggestions = (nextMode: Mode, nextIdea: string) => {
    setMode(nextMode)
    setSelectedTypes([])
    lastInput.current = {
      idea: nextMode === 'random' ? '' : nextIdea.trim(),
      gradeLevel: lesson.gradeLevel,
      subject: lesson.subject,
    }
    setStep('suggest')
    requestSuggestions()
    // Về đầu trang để thấy cả thanh các bước, rồi mới chuyển tiêu điểm.
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      stepHeadingRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  const submit = async (nextMode: Mode) => {
    const problem = checkGenerate({ idea, hasFile: file !== null }, nextMode)
    const ideaError = problem === 'ideaTooShortWithFile' ? text.errorShortOptionalIdeaWithFile : text.errorNeedIdea
    setErrors(problem ? { idea: ideaError } : {})
    touch()
    if (problem) {
      setTimeout(() => document.getElementById('create-idea')?.focus(), 0)
      return
    }

    if (nextMode === 'idea' && file && !isMock('ai')) {
      if (!lesson.subject || !lesson.gradeLevel) {
        setPreparationMessage(text.needLessonForServer)
        return
      }
      const prepared = await preparation.prepare({
        subject: lesson.subject,
        gradeLevel: lesson.gradeLevel,
        idea: idea.trim().length >= 10 ? idea.trim() : undefined,
        file,
      })
      if (prepared) setReviewIdea(prepared.idea)
      return
    }

    if (nextMode === 'random' || file) {
      beginSuggestions(nextMode, nextMode === 'random' ? '' : idea)
      return
    }

    if (!lesson.subject || !lesson.gradeLevel) {
      setErrors({ idea: text.needLessonForChat })
      setTimeout(() => document.getElementById(lesson.gradeLevel ? 'create-idea' : 'create-grade')?.focus(), 0)
      return
    }
    setMode('idea')
    setSelectedTypes([])
    chat.reset()
    chat.send(idea)
    setStep('chat')
  }

  // Giáo viên xác nhận thẻ: ghép thẻ thành ý tưởng rồi tạo đúng kiểu chơi đang chọn trên thẻ.
  const confirmUnderstanding = () => {
    const card = chat.understanding
    if (!card) return
    lastInput.current = { idea: composeIdea(card, idea), gradeLevel: lesson.gradeLevel, subject: lesson.subject }
    setSelectedTypes([card.gameType])
    void createSelected([card.gameType])
  }

  const confirmPreparedIdea = () => {
    if (reviewIdea.trim().length < 10) {
      setPreparationMessage(text.preparedIdeaTooShort)
      return
    }
    const confirmed = reviewIdea.trim().slice(0, IDEA_MAX_LENGTH)
    setIdea(confirmed)
    setPreparationMessage('')
    preparation.reset()
    setReviewIdea('')
    beginSuggestions('idea', confirmed)
  }

  const backToDescribe = () => {
    suggestionsMutation.reset()
    // Huỷ cả lượt chat đang chờ (nếu có): bấm "Để AI soạn giúp" lần sau là một cuộc trò chuyện mới.
    chat.reset()
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
      visualClozeMode,
      oddOneOutMode,
      sceneImageUrl,
      optionImages,
      reviewFrom,
      classroomId: classroomId || undefined,
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
        ) : (
          <button
            type="button"
            onClick={backToDescribe}
            aria-label={text.backToDescribe}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface text-2xl font-bold text-ink shadow-sm transition hover:bg-brand-soft"
          >
            <span aria-hidden="true">‹</span>
          </button>
        )}
        <ol
          aria-label={text.stepsLabel}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-semibold"
        >
          <StepMarker
            number={1}
            label={text.stepDescribe}
            current={step === 'describe'}
            done={step !== 'describe'}
            onSelect={step !== 'describe' ? backToDescribe : undefined}
          />
          <li aria-hidden="true" className="h-0.5 w-6 bg-ink/20" />
          <StepMarker
            number={2}
            label={step === 'chat' ? text.stepChat : text.stepPick}
            current={step !== 'describe' && !creation.creating}
            done={step !== 'describe' && creation.creating}
          />
          <li aria-hidden="true" className="h-0.5 w-6 bg-ink/20" />
          <StepMarker number={3} label={text.stepCompose} current={step !== 'describe' && creation.creating} done={false} />
        </ol>
        <h1 ref={stepHeadingRef} tabIndex={-1} className="font-display text-3xl font-extrabold outline-none sm:text-4xl">
          {step === 'describe' ? text.heading : step === 'chat' ? text.chatStepTitle : text.suggestStepTitle}
        </h1>
      </header>

      <div
        className={`grid items-start gap-6 ${step === 'describe' ? 'lg:grid-cols-[2fr_1fr]' : step === 'chat' ? 'lg:grid-cols-[3fr_2fr]' : ''}`}
      >
        <div className="space-y-6">
          {step === 'describe' ? (
            <form
              onSubmit={onSubmit}
              noValidate
              className="space-y-6 rounded-3xl bg-surface p-5 shadow-sm sm:p-7"
            >
              {classrooms.data?.length ? (
                <FormField id="create-classroom" label="Lớp học" hint="Chọn lớp để AI dùng thông tin chung của lớp khi tạo game.">
                  <select id="create-classroom" className={inputClass()} value={selectedClassroom?.classroomId ?? ''}
                    aria-describedby={describedBy('create-classroom', { hint: true })}
                    onChange={(event) => {
                      setClassroomId(event.target.value)
                      touch()
                    }}>
                    <option value="">Không chọn lớp</option>
                    {classrooms.data.map((item) => <option key={item.classroomId} value={item.classroomId}>{item.className}</option>)}
                  </select>
                </FormField>
              ) : null}
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
                  changeGrade(value)
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

              {savedTopics.data?.length ? (
                <FormField id="create-saved-topic" label="Dùng gợi ý đã ghi nhớ">
                  <select id="create-saved-topic" className={inputClass()} value=""
                    onChange={(event) => {
                      const topic = savedTopics.data?.find((item) => item.id === event.target.value)?.topic
                      if (!topic) return
                      setIdea((current) => (current.trim() ? current.trimEnd() + '\n' + topic : topic).slice(0, IDEA_MAX_LENGTH))
                      setErrors((current) => ({ ...current, idea: undefined }))
                      touch()
                      ideaRef.current?.focus()
                    }}>
                    <option value="">Chọn chủ đề</option>
                    {savedTopics.data.map((item) => <option key={item.id} value={item.id}>{item.topic}</option>)}
                  </select>
                </FormField>
              ) : null}
              {preparation.status === 'pending' ? (
                <p role="status" className="rounded-2xl bg-brand-soft p-4 text-sm font-semibold text-ink">
                  {text.preparingLesson}
                </p>
              ) : null}
              {preparation.status === 'error' ? (
                <p role="alert" className="rounded-2xl bg-warn-soft p-4 text-sm font-semibold text-warn-ink">
                  {parseApiError(preparation.error, text.prepareLessonError).message}
                </p>
              ) : null}
              {preparationMessage ? (
                <p role="alert" className="rounded-2xl bg-warn-soft p-4 text-sm font-semibold text-warn-ink">
                  {preparationMessage}
                </p>
              ) : null}
              {preparation.status === 'success' ? (
                <section aria-labelledby="prepared-lesson-heading" className="space-y-4 rounded-2xl border-2 border-brand/30 bg-brand-soft/40 p-4">
                  <div>
                    <h2 id="prepared-lesson-heading" className="font-bold text-ink">{text.reviewPreparedLesson}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{text.reviewPreparedLessonHint}</p>
                  </div>
                  <FormField id="prepared-lesson-idea" label={text.preparedIdeaLabel}>
                    <textarea
                      id="prepared-lesson-idea"
                      value={reviewIdea}
                      maxLength={IDEA_MAX_LENGTH}
                      onChange={(event) => {
                        setReviewIdea(event.target.value)
                        setPreparationMessage('')
                      }}
                      className={textareaClass()}
                    />
                  </FormField>
                  <Button type="button" size="lg" onClick={confirmPreparedIdea}>
                    {text.confirmPreparedLesson}
                  </Button>
                </section>
              ) : null}

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
                      onChange={(event) => setVoiceOverride((current) => ({ ...current, voiceRegion: event.target.value }))}
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
                      onChange={(event) => setVoiceOverride((current) => ({ ...current, voiceGender: event.target.value }))}
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
                <Button type="submit" size="lg" className="gap-2" disabled={preparation.status === 'pending'}>
                  <Icon name="sparkles" />
                  {file && !isMock('ai') ? text.prepareLesson : text.submit}
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
          ) : step === 'chat' ? (
            <RequestChat
              messages={chat.messages}
              question={chat.question}
              pending={chat.pending}
              error={chat.error}
              canSend={chat.canSend}
              mock={isMock('ai')}
              onSend={chat.send}
              onRetry={chat.retry}
            />
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
                if (type === 'VISUAL_CLOZE') {
                  setVisualClozeSetupOpen(true)
                  setOddSetupOpen(false)
                  setVisualClozeMode('TEXT')
                } else if (type === 'ODD_ONE_OUT') {
                  setVisualClozeSetupOpen(false)
                  setOddSetupOpen(true)
                  setOddOneOutMode('TEXT')
                } else {
                  setVisualClozeSetupOpen(false)
                  setOddSetupOpen(false)
                  void createSelected([type])
                }
              }}
              onBack={backToDescribe}
              onRetry={retrySuggestions}
            />
          )}

          {step === 'suggest' && visualClozeSetupOpen ? (
            <VisualClozeSetupForm
              mode={visualClozeMode}
              sceneImageUrl={sceneImageUrl}
              optionImages={optionImages}
              onModeChange={setVisualClozeMode}
              onSceneImageUrlChange={setSceneImageUrl}
              onOptionImagesChange={setOptionImages}
              onCreate={() => {
                setVisualClozeSetupOpen(false)
                void createSelected(['VISUAL_CLOZE'])
              }}
              onCancel={() => {
                setVisualClozeSetupOpen(false)
                setSelectedTypes([])
              }}
            />
          ) : null}

          {step === 'suggest' && oddSetupOpen ? <OddOneOutSetupForm mode={oddOneOutMode}
            onModeChange={setOddOneOutMode}
            onCreate={() => { setOddSetupOpen(false); void createSelected(['ODD_ONE_OUT']) }}
            onCancel={() => { setOddSetupOpen(false); setSelectedTypes([]) }} /> : null}

          {step === 'suggest' && file !== null && isMock('ai') ? (
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
              {text.fileNotUsed}
            </p>
          ) : null}

          {step !== 'describe' && !visualClozeSetupOpen && !oddSetupOpen ? (
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
        {step === 'chat' ? (
          <UnderstandingCard
            understanding={chat.understanding}
            pending={chat.pending || creation.creating}
            awaitingAnswer={chat.question !== null}
            onChange={chat.editCard}
            onConfirm={confirmUnderstanding}
          />
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
  onSelect,
}: {
  number: number
  label: string
  current: boolean
  done: boolean
  /** Có thì bước này bấm được để quay lại. */
  onSelect?: () => void
}) {
  const content = (
    <>
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
    </>
  )
  return (
    <li aria-current={current ? 'step' : undefined} className="flex items-center gap-2">
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="flex min-h-11 items-center gap-2 rounded-full pr-2 underline-offset-4 hover:underline"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </li>
  )
}
