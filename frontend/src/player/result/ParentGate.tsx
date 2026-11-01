import { useEffect, useId, useRef } from 'react'
import { viText } from '../../constants/viText'
import { useHoldToUnlock } from './useHoldToUnlock'

const text = viText.player.result

/** Khóa phụ huynh: giữ nút 3 giây mới thấy lời nhắn. */
export default function ParentGate({ message }: { message: string }) {
  const { unlocked, progress, bind } = useHoldToUnlock()
  const hintId = useId()
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (unlocked) titleRef.current?.focus()
  }, [unlocked])

  if (unlocked) {
    return (
      <section aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-play-outline bg-play-surface p-4 text-left">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-lg font-bold">
          {text.parentTitle}
        </h2>
        <p className="mt-2">{message}</p>
      </section>
    )
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-1">
      <button
        type="button"
        aria-describedby={hintId}
        {...bind}
        className="min-h-[var(--play-min-touch)] w-full touch-none select-none rounded-xl border-2 border-play-outline px-6 font-bold"
      >
        {text.parentButton}
      </button>
      <span id={hintId} className="text-sm text-play-ink-soft">
        {text.parentHint}
      </span>
      {progress > 0 ? (
        <div role="progressbar" aria-label={text.parentButton} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-2 w-full overflow-hidden rounded-full bg-play-outline">
          <div className="h-full bg-play-primary" style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}
    </div>
  )
}
