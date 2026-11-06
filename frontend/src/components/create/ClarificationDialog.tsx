import { useState, useMemo } from 'react'
import Dialog from '../ui/Dialog'
import Button from '../Button'
import Icon from '../ui/Icon'
import {
  type CompletenessAssessment,
  buildEnrichedPrompt,
} from '../../services/pipeline/promptCompletenessAssessor'

export interface ClarificationDialogProps {
  isOpen: boolean
  assessment: CompletenessAssessment | null
  originalPrompt: string
  onApply: (enrichedPrompt: string) => void
  onSkip: () => void
}

export default function ClarificationDialog({
  isOpen,
  assessment,
  originalPrompt,
  onApply,
  onSkip,
}: ClarificationDialogProps) {
  if (!isOpen || !assessment || assessment.questions.length === 0) return null

  // Khởi tạo lựa chọn ban đầu cho từng câu hỏi
  const initialSelections = useMemo(() => {
    const map: Record<string, string> = {}
    for (const q of assessment.questions) {
      map[q.id] = q.selectedOptionId || q.options[0]?.id || ''
    }
    return map
  }, [assessment])

  const [selectedMap, setSelectedMap] = useState<Record<string, string>>(initialSelections)

  const handleSelect = (questionId: string, optionId: string) => {
    setSelectedMap((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }

  // Thu thập các patch được chọn để tính enriched prompt
  const enrichedPrompt = useMemo(() => {
    const patches: string[] = []
    for (const q of assessment.questions) {
      const selectedId = selectedMap[q.id]
      const option = q.options.find((o) => o.id === selectedId)
      if (option?.patchPrompt) {
        patches.push(option.patchPrompt)
      }
    }
    return buildEnrichedPrompt(originalPrompt, patches)
  }, [assessment, selectedMap, originalPrompt])

  return (
    <Dialog
      title="✨ Trợ lý AI đồng hành: Làm rõ mục tiêu tiết dạy"
      wide
      onEscape={onSkip}
    >
      <div className="space-y-6 pt-2">
        {/* Lời nhắn gợi ý thân thiện của trợ lý AI */}
        <div className="rounded-2xl bg-brand-soft/40 border border-brand/20 p-4 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold text-brand-dark flex items-center gap-2 mb-1">
            <span>💡</span> Em thấy Thầy/Cô muốn chuẩn bị bài học cho học sinh:
          </p>
          <p className="text-slate-600">
            Để trò chơi sát với giáo án và không bị lệch kiến thức, Thầy/Cô chọn nhanh các định hướng dưới đây nhé:
          </p>
        </div>

        {/* Danh sách 2-3 câu hỏi làm rõ dạng thẻ lựa chọn 1-Click */}
        <div className="space-y-5">
          {assessment.questions.map((q) => {
            const currentSelected = selectedMap[q.id]

            return (
              <div key={q.id} className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-dark text-xs font-black">
                      •
                    </span>
                    {q.title}
                  </h3>
                  <span className="text-xs text-slate-500 italic">
                    {q.reasoning}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {q.options.map((option) => {
                    const isSelected = currentSelected === option.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelect(q.id, option.id)}
                        className={`group relative flex flex-col items-start px-4 py-2.5 rounded-2xl text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-2 border-brand bg-brand-soft text-brand-dark font-bold shadow-xs scale-[1.02]'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80'
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs font-normal text-slate-500 mt-0.5">
                            {option.description}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Preview câu lệnh sau khi làm rõ */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-4 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <span>📝</span> Đề bài sau khi làm rõ:
          </div>
          <p className="text-sm font-semibold text-slate-800 break-words leading-relaxed">
            {enrichedPrompt}
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="text-slate-600 hover:text-slate-900"
          >
            Bỏ qua & Dùng mặc định
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => onApply(enrichedPrompt)}
            className="gap-2 shadow-sm font-bold"
          >
            <Icon name="sparkles" />
            Áp dụng & Gợi ý trò chơi
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
