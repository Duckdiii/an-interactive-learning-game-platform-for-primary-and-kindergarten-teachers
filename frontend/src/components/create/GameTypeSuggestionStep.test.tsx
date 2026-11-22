import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GameTypeSuggestionStep from './GameTypeSuggestionStep'
import type { GameTypeSuggestion } from '../../types/game-suggestion.types'

const mockCpfSuggestion: GameTypeSuggestion = {
  type: 'CUSTOM',
  title: 'Hứng Táo Nông Trại',
  track: 'CPF',
  fitScore: 0.99,
  reason: 'Trò chơi vận động tương tác giúp bé vừa rèn phản xạ vừa nhận biết số học một cách trực quan.',
  description: 'Bé di chuyển giỏ hứng sang trái/phải để đón các quả táo mang đáp án đúng, rèn luyện phản xạ và tư duy số học.',
}

const mockStandardSuggestion: GameTypeSuggestion = {
  type: 'QUIZ',
  fitScore: 0.85,
  reason: 'Bé đếm số con vật trong tranh rồi chọn con số đúng, kiểm tra nhanh khả năng đếm.',
  description: 'Bé đọc câu hỏi rồi chọn một đáp án đúng trong vài lựa chọn.',
}

describe('GameTypeSuggestionStep', () => {
  it('hiển thị đúng tựa game sư phạm và mô tả cách chơi do Planner sinh ra', () => {
    render(
      <GameTypeSuggestionStep
        status="success"
        suggestions={[mockCpfSuggestion]}
        subject="MATH"
        context="Toán · Lớp 2 · Hứng táo rơi"
        onUse={vi.fn()}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('Hứng Táo Nông Trại')).toBeInTheDocument()
    expect(screen.getByText(/giỏ hứng sang trái\/phải/i)).toBeInTheDocument()
    expect(screen.getByText(/vận động tương tác/i)).toBeInTheDocument()
  })

  it('gắn huy hiệu thân thiện "Tương tác Vận động" và "Phản xạ & Vận động" cho game track CPF, KHÔNG có chữ "CPF" hay "CPF Engine"', () => {
    const { container } = render(
      <GameTypeSuggestionStep
        status="success"
        suggestions={[mockCpfSuggestion]}
        subject="MATH"
        context="Toán · Lớp 2 · Hứng táo rơi"
        onUse={vi.fn()}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('🎮 Tương tác Vận động')).toBeInTheDocument()
    expect(screen.getByText('Phản xạ & Vận động')).toBeInTheDocument()

    // Kiểm tra toàn bộ text hiển thị trong giao diện không chứa từ CPF
    const renderedText = container.textContent || ''
    expect(renderedText).not.toMatch(/CPF/i)
    expect(renderedText).not.toContain('CPF Engine')
    expect(renderedText).not.toContain('SceneGraph')
  })

  it('nút hành động hiển thị "Dùng kiểu này" và kích hoạt onUse khi bấm', () => {
    const onUseMock = vi.fn()
    render(
      <GameTypeSuggestionStep
        status="success"
        suggestions={[mockCpfSuggestion, mockStandardSuggestion]}
        subject="MATH"
        context="Toán · Lớp 2"
        onUse={onUseMock}
        onBack={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    const buttons = screen.getAllByRole('button', { name: /Dùng kiểu này/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)

    fireEvent.click(buttons[0])
    expect(onUseMock).toHaveBeenCalledWith('CUSTOM')
  })
})
