import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ClarificationDialog from './ClarificationDialog'
import type { CompletenessAssessment } from '../../services/pipeline/promptCompletenessAssessor'

const mockAssessment: CompletenessAssessment = {
  score: 35,
  isComplete: false,
  summary: 'Mô tả bài học còn ngắn.',
  questions: [
    {
      id: 'skill',
      title: 'Mục tiêu kỹ năng Toán (Lớp 2)',
      reasoning: 'Lựa chọn dạng phép tính phù hợp.',
      options: [
        { id: 'add-100', label: 'Phép cộng có nhớ phạm vi 100', patchPrompt: 'phép cộng có nhớ trong phạm vi 100' },
        { id: 'sub-100', label: 'Phép trừ có nhớ phạm vi 100', patchPrompt: 'phép trừ có nhớ trong phạm vi 100' },
      ],
      selectedOptionId: 'add-100',
    },
    {
      id: 'theme',
      title: 'Thế giới bối cảnh trực quan',
      reasoning: 'Linh vật mascot giúp bé thích thú.',
      options: [
        { id: 'farm', label: '🌾 Nông trại vui vẻ', patchPrompt: 'trong bối cảnh nông trại vui vẻ' },
        { id: 'ocean', label: '🌊 Đại dương kỳ thú', patchPrompt: 'trong bối cảnh đại dương kỳ thú' },
      ],
      selectedOptionId: 'farm',
    },
  ],
}

describe('ClarificationDialog', () => {
  it('không vẽ gì khi isOpen = false', () => {
    const { container } = render(
      <ClarificationDialog
        isOpen={false}
        assessment={mockAssessment}
        originalPrompt="toán lớp 2"
        onApply={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('hiển thị đầy đủ tiêu đề, các câu hỏi và các lựa chọn khi mở', () => {
    render(
      <ClarificationDialog
        isOpen={true}
        assessment={mockAssessment}
        originalPrompt="toán lớp 2"
        onApply={vi.fn()}
        onSkip={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: /Trợ lý AI đồng hành: Làm rõ mục tiêu tiết dạy/i })).toBeInTheDocument()
    expect(screen.getByText('Mục tiêu kỹ năng Toán (Lớp 2)')).toBeInTheDocument()
    expect(screen.getByText('Thế giới bối cảnh trực quan')).toBeInTheDocument()
    expect(screen.getByText('Phép cộng có nhớ phạm vi 100')).toBeInTheDocument()
    expect(screen.getByText('🌾 Nông trại vui vẻ')).toBeInTheDocument()

    // Preview
    expect(screen.getByText(/toán lớp 2 \(phép cộng có nhớ trong phạm vi 100, trong bối cảnh nông trại vui vẻ\)/)).toBeInTheDocument()
  })

  it('chọn option khác thì preview cập nhật tương ứng', () => {
    render(
      <ClarificationDialog
        isOpen={true}
        assessment={mockAssessment}
        originalPrompt="toán lớp 2"
        onApply={vi.fn()}
        onSkip={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('🌊 Đại dương kỳ thú'))

    expect(screen.getByText(/toán lớp 2 \(phép cộng có nhớ trong phạm vi 100, trong bối cảnh đại dương kỳ thú\)/)).toBeInTheDocument()
  })

  it('bấm "Áp dụng & Gợi ý trò chơi" gọi onApply với enriched prompt', () => {
    const onApply = vi.fn()
    render(
      <ClarificationDialog
        isOpen={true}
        assessment={mockAssessment}
        originalPrompt="toán lớp 2"
        onApply={onApply}
        onSkip={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Áp dụng & Gợi ý trò chơi/i }))
    expect(onApply).toHaveBeenCalledWith(
      'toán lớp 2 (phép cộng có nhớ trong phạm vi 100, trong bối cảnh nông trại vui vẻ)'
    )
  })

  it('bấm "Bỏ qua & Dùng mặc định" gọi onSkip', () => {
    const onSkip = vi.fn()
    render(
      <ClarificationDialog
        isOpen={true}
        assessment={mockAssessment}
        originalPrompt="toán lớp 2"
        onApply={vi.fn()}
        onSkip={onSkip}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Bỏ qua & Dùng mặc định/i }))
    expect(onSkip).toHaveBeenCalled()
  })
})
