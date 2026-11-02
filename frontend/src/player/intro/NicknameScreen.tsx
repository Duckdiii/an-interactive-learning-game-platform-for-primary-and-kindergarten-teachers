import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { viText } from '../../constants/viText'
import { gradeLevelLabel, subjectLabel } from '../../constants/labels'
import type { PublishInfo } from '../../types/game-student.types'
import PlayButton from '../components/PlayButton'
import { useUiProfile } from '../profile/useUiProfile'
import { validateNickname } from './nickname'

const text = viText.player.nickname
const ERROR_ID = 'nickname-error'

interface NicknameScreenProps {
  info: PublishInfo
  /** Chữ đã gõ lần trước (giữ lại khi máy chủ từ chối). */
  initialValue?: string
  /** Lỗi từ máy chủ (ví dụ từ không phù hợp). */
  serverError?: string | null
  onSubmit: (nickname: string) => void
}

// Hs-Nickname: chỉ hiện ở khung có `askNickname`.
export default function NicknameScreen({ info, initialValue = '', serverError = null, onSubmit }: NicknameScreenProps) {
  const { band } = useUiProfile()
  const inputRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState(initialValue)
  const [localError, setLocalError] = useState<string | null>(null)
  const [serverShown, setServerShown] = useState(serverError)
  const error = localError ?? serverShown

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const check = validateNickname(raw)

    if (!check.ok) {
      setServerShown(null)
      setLocalError(text[check.reason])
      inputRef.current?.focus()

      return
    }

    onSubmit(check.value)
  }

  return (
    <main data-band={band} className="grid min-h-screen place-items-start bg-play-page play-safe-x play-safe-y text-play-ink md:place-items-center">
      <div className="w-full min-w-0 md:max-w-md md:rounded-2xl md:border md:border-play-outline md:bg-play-surface md:p-8">
        <h1 className="text-3xl font-bold">{info.gameTitle}</h1>
        <p className="mt-1 text-play-ink-soft">
          {text.meta(subjectLabel(info.metadata.subject), gradeLevelLabel(info.metadata.gradeLevel), info.questionCount)}
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
          <label htmlFor="nickname" className="text-lg font-bold">
            {text.label}
          </label>
          <input
            id="nickname"
            ref={inputRef}
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value)
              setLocalError(null)
              setServerShown(null)
            }}
            autoComplete="off"
            // Bị máy chủ từ chối thì màn dựng lại: đưa con trỏ về ô để gõ lại ngay.
            autoFocus={Boolean(serverError)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ERROR_ID : undefined}
            className="min-h-[var(--play-min-touch)] w-full min-w-0 rounded-xl border-2 border-play-outline bg-play-surface px-4 text-xl text-play-ink"
          />
          <p className="text-play-ink-soft">{text.hint}</p>
          {error ? (
            <div id={ERROR_ID} role="alert" className="rounded-xl border border-play-outline bg-play-surface p-3 text-play-ink">
              {error}
            </div>
          ) : null}
          <PlayButton type="submit">{text.submit}</PlayButton>
        </form>
      </div>
    </main>
  )
}
