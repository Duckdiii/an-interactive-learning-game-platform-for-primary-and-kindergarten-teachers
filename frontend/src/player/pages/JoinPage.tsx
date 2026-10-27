import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'
import { viText } from '../../constants/viText'
import { ROUTES } from '../../routes/paths'
import { usePageTitle } from '../../hooks/usePageTitle'
import { publishInfoQuery } from '../api/publishInfoQuery'
import PlayButton from '../components/PlayButton'
import { isJoinCodeFormat, normalizeJoinCode, publishErrorKind } from '../join/joinCode'
import { PROFILES } from '../profile/profiles'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'

const text = viText.player
const ERROR_ID = 'join-code-error'

interface JoinMessage {
  title?: string
  description: string
}

// Màn nhập mã: kiểm tra mã bằng đúng query của PlayPage nên PlayPage dùng lại cache, không gọi lại.
export default function JoinPage() {
  usePlayerRootStyle(PROFILES.hocSinh)
  usePageTitle(text.join.pageTitle)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<JoinMessage | null>(null)
  // Khóa đồng bộ: state `busy` chỉ có hiệu lực sau lần render kế tiếp, hai lần submit liền nhau vẫn lọt.
  const pending = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const fail = (next: JoinMessage) => {
    pending.current = false
    setMessage(next)
    setBusy(false)
    inputRef.current?.focus()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (pending.current) return

    const code = normalizeJoinCode(raw)

    if (!isJoinCodeFormat(code)) return fail({ description: text.join.formatError })

    pending.current = true
    setMessage(null)
    setBusy(true)

    try {
      await queryClient.fetchQuery(publishInfoQuery(code))
      // Đã rời trang (bấm Back) trong lúc chờ thì không kéo người dùng sang /play.
      if (mounted.current) navigate(generatePath(ROUTES.play, { shareCode: code }))
    } catch (error) {
      if (mounted.current) fail(text.publishError[publishErrorKind(error)])
    }
  }

  return (
    <main className="grid min-h-screen place-items-start bg-play-page play-safe-x play-safe-y text-play-ink md:place-items-center">
      <div className="w-full min-w-0 md:max-w-md md:rounded-2xl md:border md:border-play-outline md:bg-play-surface md:p-8">
        <h1 className="text-3xl font-bold">{text.join.heading}</h1>
        <form onSubmit={(event) => void submit(event)} className="mt-6 flex flex-col gap-3" noValidate>
          <label htmlFor="join-code" className="text-lg font-bold">
            {text.join.codeLabel}
          </label>
          <input
            id="join-code"
            ref={inputRef}
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value)
              setMessage(null)
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={12}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? ERROR_ID : undefined}
            className="min-h-[var(--play-min-touch)] w-full min-w-0 rounded-xl border-2 border-play-outline bg-play-surface px-4 text-2xl font-bold uppercase tracking-widest text-play-ink"
          />
          {message ? (
            <div id={ERROR_ID} role="alert" className="rounded-xl border border-play-outline bg-play-surface p-3 text-play-ink">
              {message.title ? <p className="font-bold">{message.title}</p> : null}
              <p>{message.description}</p>
            </div>
          ) : null}
          <PlayButton type="submit" disabled={busy} aria-busy={busy}>
            {busy ? text.join.searching : text.join.submit}
            {busy ? null : <span className="ml-2 hidden font-normal md:inline">{text.join.submitHint}</span>}
          </PlayButton>
          {/* Nút đang khóa nên mất focus: báo trạng thái chờ cho trình đọc màn hình qua vùng live. */}
          <p role="status" className="sr-only">
            {busy ? text.join.searching : ''}
          </p>
        </form>
        <p className="mt-6 text-play-ink-soft">{text.join.noAccount}</p>
        {/* Máy tính thường không quét QR (wireframe Hs-Desk-Join). */}
        <p className="mt-2 text-play-ink-soft md:hidden">{text.join.qrHint}</p>
      </div>
    </main>
  )
}
