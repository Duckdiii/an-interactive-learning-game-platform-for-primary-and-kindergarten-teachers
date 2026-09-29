interface LoadingSpinnerProps {
  label?: string
}

export default function LoadingSpinner({
  label = 'Loading',
}: LoadingSpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      <span>{label}</span>
    </span>
  )
}
