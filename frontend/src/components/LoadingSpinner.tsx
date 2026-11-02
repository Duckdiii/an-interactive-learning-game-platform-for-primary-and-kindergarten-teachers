import { viText } from '../constants/viText'

interface LoadingSpinnerProps {
  label?: string
}

export default function LoadingSpinner({
  label = viText.common.loading,
}: LoadingSpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2 text-base font-medium text-ink-soft">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-[3px] border-ink/15 border-t-brand motion-reduce:animate-none"
      />
      <span>{label}</span>
    </span>
  )
}
