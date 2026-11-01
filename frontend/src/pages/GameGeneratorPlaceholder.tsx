import { useState } from 'react'
import type { FormEvent } from 'react'
import PageHeader from '../components/ui/PageHeader'
import QuizRenderer from '../games/quiz/QuizRenderer'
import { generateGame, type GeneratedGameResponse } from '../api/gamesApi'
import { parseApiError } from '../utils/apiError'

const REVIEW_LABEL: Record<GeneratedGameResponse['curriculum']['review']['status'], string> = {
  PENDING: 'Đang chờ đối chiếu',
  REVIEWED: 'Đã kiểm tra tự động theo quy tắc pilot',
  UNAVAILABLE: 'Chưa đối chiếu được',
  STALE: 'Nội dung đã thay đổi; cần đối chiếu lại',
}

export default function GameGeneratorPlaceholder() {
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<GeneratedGameResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!topic.trim()) { setError('Hãy mô tả nội dung muốn dạy.'); return }
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const generated = await generateGame({
        gameType: 'QUIZ', topic: topic.trim(), subject: 'MATH', gradeLevel: 'GRADE_1',
      })
      setResult(generated)
    } catch (cause) {
      setError(parseApiError(cause, 'Chưa tạo được game. Vui lòng thử lại.').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Curriculum RAG" title="Tạo game học tập"
        description="Nhập yêu cầu theo cách cô sẽ giao cho lớp. Game và căn cứ chương trình được lưu riêng; DSL 1.0.0 không chứa dữ liệu review." />

      <section className="max-w-3xl rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Môn
            <select disabled value="MATH" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-slate-100 px-3">
              <option value="MATH">Toán</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Lớp
            <select disabled value="GRADE_1" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-slate-100 px-3">
              <option value="GRADE_1">Lớp 1</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Kiểu game
            <select disabled value="QUIZ" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-slate-100 px-3">
              <option value="QUIZ">Trắc nghiệm</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-600">Đây là phạm vi runtime hiện được cấu hình. Các bộ dữ liệu khác đang chờ hoàn tất readiness, đánh giá và duyệt cần thiết.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label htmlFor="game-topic" className="block text-sm font-medium text-slate-700">Cô muốn tạo game cho nội dung nào?</label>
          <textarea id="game-topic" value={topic} onChange={(event) => setTopic(event.target.value)}
            maxLength={200} rows={3} placeholder="Ví dụ: Cho học sinh luyện cộng hai số trong phạm vi 10"
            className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-emerald-700 focus:outline-none" />
          <button type="submit" disabled={busy}
            className="min-h-11 rounded-md bg-emerald-800 px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Đang tạo và kiểm tra…' : 'Tạo game'}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </section>

      {result && <section aria-label="Kết quả game" className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-lg font-semibold">{result.game.metadata.title}</h3>
          <p className="text-sm text-slate-600">Bản nháp đã lưu · mã {result.gameId} · {REVIEW_LABEL[result.curriculum.review.status]}</p>
        </div>
        {result.game.gameType === 'QUIZ' && result.game.questions.map((question, index) => (
          <div key={question.id} className="rounded-md border border-slate-200 p-4">
            <p className="mb-3 text-sm font-medium text-slate-600">Câu {index + 1} · xem trước</p>
            <QuizRenderer question={question} mode="preview" />
          </div>
        ))}
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <h4 className="font-semibold">Căn cứ chương trình</h4>
          {(result.curriculum.evidence.chunks ?? []).length === 0
            ? <p className="text-sm text-amber-800">Không có chunk căn cứ trong kết quả này.</p>
            : result.curriculum.evidence.chunks?.map((chunk) => <article key={chunk.chunkId} className="rounded bg-slate-50 p-3 text-sm">
                <p className="font-medium">{chunk.chunkId} · {chunk.topic}</p>
                <p>{chunk.text}</p>
                <p className="mt-1 text-xs text-slate-600">{chunk.sourceDocument} · PDF {chunk.pdfPages.join(', ')} · trang in {chunk.printedPages.join(', ')}</p>
              </article>)}
        </div>
      </section>}
    </div>
  )
}
