interface StatCardProps {
  label: string
  value: string
  helper: string
}

export default function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </article>
  )
}
