import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { ROUTES } from '../routes/paths'

export default function GameGeneratorPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Game Generator"
        title="Tạo game mới"
        description="Route này đã sẵn sàng để gắn luồng sinh trò chơi bằng AI trong subtask tiếp theo."
      />
      <section className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <p className="text-base font-semibold">Module đang được chuẩn bị</p>
          <p className="mt-2 text-sm text-slate-600">
            Cấu hình prompt, loại trò chơi và quy trình sinh nội dung sẽ được
            đặt tại đây.
          </p>
          <Link
            to={ROUTES.dashboard}
            className="mt-5 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            Quay lại Dashboard
          </Link>
        </div>
      </section>
    </div>
  )
}
