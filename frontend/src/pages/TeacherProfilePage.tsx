import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TeacherProfile } from '../api/teacherProfileApi'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import Card from '../components/ui/Card'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import { describedBy, inputClass } from '../components/ui/formStyles'
import { GRADE_LEVEL_VALUES, SUBJECT_VALUES, gradeLevelLabel, subjectLabel } from '../constants/labels'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSavedSuggestions, useTeacherProfile, useTeacherProfileActions } from '../hooks/useTeacherProfile'
import { parseApiError } from '../utils/apiError'
import { ClassroomsSection } from './ClassroomsPage'

const saveFailure = 'Hệ thống chưa lưu được hồ sơ. Bạn hãy thử lại một lần nữa.'
const choices = [
  { field: 'subject', label: 'Môn đang dạy', options: SUBJECT_VALUES.map((value) => [value, subjectLabel(value)]) },
  { field: 'gradeLevel', label: 'Khối đang dạy', options: GRADE_LEVEL_VALUES.map((value) => [value, gradeLevelLabel(value)]) },
  { field: 'voice', label: 'Giọng đọc mặc định', options: viText.generator.voiceGenders },
] as const

function messageOf(error: unknown, fallback: string) {
  const parsed = parseApiError(error, fallback)
  return parsed.code === 'UNSAFE_CONTENT' ? viText.classrooms.unsafe : parsed.message
}

export default function TeacherProfilePage() {
  usePageTitle('Hồ sơ của tôi')
  const query = useTeacherProfile()
  const [message, setMessage] = useState('')

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Hồ sơ của tôi</h1>
      {query.isPending ? <LoadingSpinner label="Đang tải hồ sơ" /> : null}
      {query.isError ? (
        <ErrorNotice message="Chưa tải được hồ sơ."
          action={<Button variant="secondary" onClick={() => query.refetch()}>Thử lại</Button>} />
      ) : null}
      {query.data ? <ProfileForm profile={query.data} onMessage={setMessage} /> : null}
      {message ? <p role="status">{message}</p> : null}
      <ClassroomsSection embedded />
      <SuggestionsSection />
    </div>
  )
}

function ProfileForm({ profile, onMessage }: { profile: TeacherProfile; onMessage: (message: string) => void }) {
  const [draft, setDraft] = useState<TeacherProfile | null>(null)
  const form = draft ?? profile
  const [confirmReset, setConfirmReset] = useState(false)
  const { save, reset } = useTeacherProfileActions()
  const error = save.isError ? parseApiError(save.error, saveFailure) : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onMessage('')
    save.mutate(form, { onSuccess: () => {
      setDraft(null)
      onMessage('Đã lưu hồ sơ.')
    } })
  }

  return (
    <Card as="section" aria-labelledby="teacher-profile-title">
      <h2 id="teacher-profile-title" className="font-display text-2xl font-extrabold">Thông tin giảng dạy</h2>
      <form onSubmit={submit} className="mt-4">
        <fieldset disabled={save.isPending || reset.isPending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {([['school', 'Trường'], ['textbook', 'Bộ sách giáo khoa']] as const).map(([field, label]) => {
              const id = 'teacher-profile-' + field
              const fieldError = error?.fieldErrors[field]
              return (
                <FormField key={field} id={id} label={label} error={fieldError}>
                  <input id={id} maxLength={field === 'school' ? 255 : 100} value={form[field] ?? ''} className={inputClass(Boolean(fieldError))}
                    aria-invalid={Boolean(fieldError) || undefined} aria-describedby={describedBy(id, { error: Boolean(fieldError) })}
                    onChange={(event) => setDraft({ ...form, [field]: event.target.value })} />
                </FormField>
              )
            })}
            {choices.map(({ field, label, options }) => {
              const id = 'teacher-profile-' + field
              const fieldError = error?.fieldErrors[field]
              return (
                <FormField key={field} id={id} label={label} error={fieldError}>
                  <select id={id} value={form[field] ?? ''} className={inputClass(Boolean(fieldError))}
                    aria-invalid={Boolean(fieldError) || undefined} aria-describedby={describedBy(id, { error: Boolean(fieldError) })}
                    onChange={(event) => setDraft({ ...form, [field]: event.target.value || null })}>
                    <option value="">Chưa chọn</option>
                    {options.map(([value, optionLabel]) => <option value={value} key={value}>{optionLabel}</option>)}
                  </select>
                </FormField>
              )
            })}
          </div>
          {error ? <ErrorNotice message={error.code === 'UNSAFE_CONTENT' ? viText.classrooms.unsafe : error.message} /> : null}
          {reset.isError ? <ErrorNotice message={messageOf(reset.error, 'Chưa xóa được hồ sơ.')} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Lưu hồ sơ</Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmReset(true)}>Xóa hồ sơ</Button>
          </div>
          {confirmReset ? (
            <div className="space-y-2">
              <p>Thông tin giảng dạy và gợi ý đã ghi nhớ sẽ bị xóa. Tài khoản, các lớp và trò chơi vẫn được giữ lại.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => {
                  onMessage('')
                  reset.mutate(undefined, { onSuccess: () => {
                    setDraft(null)
                    setConfirmReset(false)
                    onMessage('Đã xóa hồ sơ giảng dạy.')
                  } })
                }}>Xác nhận xóa hồ sơ</Button>
                <Button type="button" variant="secondary" onClick={() => setConfirmReset(false)}>Giữ hồ sơ</Button>
              </div>
            </div>
          ) : null}
        </fieldset>
      </form>
    </Card>
  )
}

function SuggestionsSection() {
  const query = useSavedSuggestions()
  const { remember, forget } = useTeacherProfileActions()
  const [topic, setTopic] = useState('')
  const [confirmAll, setConfirmAll] = useState(false)
  const pending = remember.isPending || forget.isPending
  const saveError = remember.isError ? parseApiError(remember.error, 'Chưa ghi nhớ được gợi ý.') : undefined

  return (
    <Card as="section" aria-labelledby="teacher-suggestions-title" className="space-y-4">
      <h2 id="teacher-suggestions-title" className="font-display text-2xl font-extrabold">Gợi ý đã ghi nhớ</h2>
      {query.isPending ? <LoadingSpinner label="Đang tải gợi ý" /> : null}
      {query.isError ? <ErrorNotice message="Chưa tải được gợi ý."
        action={<Button variant="secondary" onClick={() => query.refetch()}>Thử lại</Button>} /> : null}
      {query.data?.length === 0 ? <p>Chưa có chủ đề nào được ghi nhớ.</p> : null}
      {query.data?.length ? (
        <>
          <ul className="space-y-2">
            {query.data.map(({ id, topic: savedTopic }) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words">{savedTopic}</span>
                <Button variant="secondary" disabled={pending} aria-label={'Xóa gợi ý ' + savedTopic}
                  onClick={() => forget.mutate(id)}>Xóa</Button>
              </li>
            ))}
          </ul>
          {confirmAll ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={pending}
                onClick={() => forget.mutate(null, { onSuccess: () => setConfirmAll(false) })}>Xác nhận xóa tất cả gợi ý</Button>
              <Button variant="secondary" onClick={() => setConfirmAll(false)}>Giữ gợi ý</Button>
            </div>
          ) : <Button variant="secondary" disabled={pending} onClick={() => setConfirmAll(true)}>Xóa tất cả gợi ý</Button>}
        </>
      ) : null}
      {forget.isError ? <ErrorNotice message={messageOf(forget.error, 'Chưa xóa được gợi ý.')} /> : null}
      <form className="space-y-2" onSubmit={(event) => {
        event.preventDefault()
        if (topic.trim()) remember.mutate(topic.trim(), { onSuccess: () => setTopic('') })
      }}>
        <FormField id="teacher-suggestion-topic" label="Chủ đề muốn ghi nhớ" hint="Chỉ nhập chủ đề bài học, không nhập thông tin học sinh."
          error={saveError?.fieldErrors.topic}>
          <input id="teacher-suggestion-topic" value={topic} maxLength={200} className={inputClass(Boolean(saveError?.fieldErrors.topic))}
            disabled={pending} aria-invalid={Boolean(saveError?.fieldErrors.topic) || undefined}
            aria-describedby={describedBy('teacher-suggestion-topic', { hint: true, error: Boolean(saveError?.fieldErrors.topic) })}
            onChange={(event) => setTopic(event.target.value)} />
        </FormField>
        <Button type="submit" disabled={pending || !topic.trim()}>Ghi nhớ chủ đề</Button>
        {saveError ? <ErrorNotice message={saveError.code === 'UNSAFE_CONTENT' ? viText.classrooms.unsafe : saveError.message} /> : null}
      </form>
    </Card>
  )
}
