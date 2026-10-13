import { viText } from '../constants/viText'

interface LoadingSpinnerProps {
  label?: string
}

export default function LoadingSpinner({
  label = viText.common.loading,
}: LoadingSpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      <span>{label}</span>
    </span>
  )
}
