import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { CHAT_MESSAGE_MAX } from '../../constants/aiLimits'
import { viText } from '../../constants/viText'
import type { ChatTurn, ClarifyingQuestion } from '../../types/understanding.types'
import Button from '../Button'
import Icon from '../ui/Icon'
import MockBadge from '../ui/MockBadge'
import { textareaClass } from '../ui/formStyles'

interface RequestChatProps {
  messages: ChatTurn[]
  question: ClarifyingQuestion | null
  pending: boolean
  error: string | null
  canSend: boolean
  mock: boolean
  onSend: (text: string) => boolean
  onRetry: () => void
  /** Đổi tiêu đề, lời nhắc và mã phần tử khi dùng ở nơi khác trang tạo game (ví dụ sửa game bằng chat trong trình soạn). */
  labels?: { title: string; placeholder: string; thinking: string; inputLabel: string }
  idPrefix?: string
  /** Nhắn trước tin đầu tiên (ví dụ hướng dẫn cách nhắn). */
  intro?: string
  /** Số ký tự tối đa của một tin (mặc định của khung chat tạo game). */
  maxLength?: number
}

const text = viText.chat

// Khung chat bên trái của bước "Trao đổi với trợ lý": lịch sử, nút trả lời nhanh cho câu hỏi lại, ô nhập. Enter để gửi, Shift+Enter xuống dòng.
export default function RequestChat({ messages, question, pending, error, canSend, mock, onSend, onRetry, labels, idPrefix = 'request-chat', intro, maxLength = CHAT_MESSAGE_MAX }: RequestChatProps) {
  const words = labels ?? { title: text.title, placeholder: text.placeholder, thinking: text.thinking, inputLabel: text.inputLabel }
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLLIElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [messages.length, pending])

  // Nút trả lời nhanh và "Thử lại" biến mất khi đang gửi: đưa tiêu điểm về ô nhập để bàn phím không rơi về đầu trang.
  const send = (value: string) => {
    if (!onSend(value)) return
    setDraft('')
    inputRef.current?.focus()
  }

  const retry = () => {
    onRetry()
    inputRef.current?.focus()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    send(draft)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(draft)
    }
  }

  return (
    <section aria-labelledby={`${idPrefix}-title`} className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${idPrefix}-title`} className="font-display text-xl font-extrabold">
          {words.title}
        </h2>
        {mock ? <MockBadge /> : null}
      </div>

      {intro ? <p className="text-base text-ink-soft">{intro}</p> : null}

      <ol role="log" aria-live="polite" aria-label={text.logLabel} className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {messages.map((turn, index) => (
          <li key={index} className={turn.role === 'TEACHER' ? 'flex justify-end' : 'flex justify-start'}>
            <p
              className={[
                'max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-base leading-7',
                turn.role === 'TEACHER' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-paper text-ink',
              ].join(' ')}
            >
              <span className="sr-only">{turn.role === 'TEACHER' ? text.you : text.assistant}: </span>
              {turn.text}
            </p>
          </li>
        ))}
        {pending ? (
          <li className="flex justify-start">
            <p className="rounded-2xl rounded-bl-md bg-paper px-4 py-2.5 text-base text-ink-soft">{words.thinking}</p>
          </li>
        ) : null}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      {question && !pending && question.quickReplies.length > 0 ? (
        <div role="group" aria-label={text.quickRepliesLabel} className="flex flex-wrap gap-2">
          {question.quickReplies.map((reply) => (
            <Button key={reply} type="button" variant="secondary" disabled={!canSend} onClick={() => send(reply)}>
              {reply}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-sun-soft px-4 py-3 text-base">
          <Icon name="alert" className="h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button type="button" variant="secondary" onClick={retry}>
            {text.retry}
          </Button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label htmlFor={`${idPrefix}-input`} className="sr-only">
          {words.inputLabel}
        </label>
        <textarea
          id={`${idPrefix}-input`}
          ref={inputRef}
          rows={2}
          value={draft}
          maxLength={maxLength}
          placeholder={canSend || pending ? words.placeholder : text.limitReached}
          disabled={!canSend && !pending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          className={`${textareaClass(false)} min-h-0 flex-1`}
        />
        <Button type="submit" disabled={!canSend || !draft.trim()}>
          {text.send}
        </Button>
      </form>
    </section>
  )
}
