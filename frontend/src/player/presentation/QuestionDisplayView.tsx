import type { LiveArenaQuestion } from './presentationTypes'

export interface QuestionDisplayViewProps {
  question: LiveArenaQuestion | null
}

/**
 * Hiển thị câu hỏi đơn giản cho cả lớp xem trên màn chiếu.
 * (KHÔNG phải màn tương tác trả lời — học sinh trả lời trên thiết bị riêng của mình qua Canvas Engine).
 */
export function QuestionDisplayView({ question }: QuestionDisplayViewProps) {
  if (!question) {
    return (
      <div className="text-center p-12 space-y-4">
        <p className="text-3xl text-slate-400 animate-pulse font-bold">Đang chờ câu hỏi...</p>
      </div>
    )
  }

  const title =
    question.instructionText ??
    question.questionText ??
    (typeof question.text === 'string' ? question.text : undefined) ??
    'Câu hỏi tiếp theo'
  const imageUrl = question.sceneImageUrl ?? question.imageUrl

  return (
    <div className="text-center space-y-6 max-w-4xl w-full p-8 bg-slate-800/80 rounded-3xl border border-slate-700 shadow-2xl">
      <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
        {title}
      </h2>

      {imageUrl && (
        <div className="flex justify-center my-6">
          <img
            src={imageUrl}
            alt="Minh họa câu hỏi"
            className="max-h-96 w-auto rounded-2xl shadow-lg object-contain bg-slate-900/50 p-2"
          />
        </div>
      )}

      <p className="text-2xl font-bold text-amber-400 mt-6 animate-bounce">
        Trả lời trên thiết bị của con nhé!
      </p>
    </div>
  )
}

export default QuestionDisplayView
