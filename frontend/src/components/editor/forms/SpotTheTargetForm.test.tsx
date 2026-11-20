import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { QuestionDsl, SpotTheTargetQuestion } from '../../../types/game-dsl.types'
import SpotTheTargetForm from './SpotTheTargetForm'

const createInitialQuestion = (): SpotTheTargetQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  visualPrompt: 'https://example.com/forest.jpg',
  targetDescription: 'Tìm chú chim màu xanh trên cành cây',
  hitRegion: { x: 0.5, y: 0.5, radius: 0.1 },
})

describe('SpotTheTargetForm', () => {
  it('hiển thị mô tả đối tượng và vùng ảnh tương tác', () => {
    const q = createInitialQuestion()
    render(<SpotTheTargetForm gameType="SPOT_THE_TARGET" question={q} issues={[]} onUpdate={() => {}} />)

    expect(screen.getByLabelText(/Mô tả đối tượng cần tìm/i)).toHaveValue('Tìm chú chim màu xanh trên cành cây')
    expect(screen.getByTestId('spot-target-canvas-box')).toBeInTheDocument()
    expect(screen.getByTestId('spot-target-hit-circle')).toBeInTheDocument()
    expect(screen.getByText(/Tọa độ tâm: X=50%, Y=50% · Bán kính: 10%/i)).toBeInTheDocument()
  })

  it('bấm Xóa vùng đã chọn sẽ loại bỏ hitRegion', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <SpotTheTargetForm
            gameType="SPOT_THE_TARGET"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="hit-region-status">
            {(question as SpotTheTargetQuestion).hitRegion ? 'has-hit' : 'no-hit'}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('hit-region-status')).toHaveTextContent('has-hit')

    fireEvent.click(screen.getByRole('button', { name: /Xóa vùng đã chọn/i }))
    expect(screen.getByTestId('hit-region-status')).toHaveTextContent('no-hit')
    expect(screen.queryByTestId('spot-target-hit-circle')).not.toBeInTheDocument()
  })

  it('thay đổi slider bán kính cập nhật radius của hitRegion', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <SpotTheTargetForm
            gameType="SPOT_THE_TARGET"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="radius-val">
            {(question as SpotTheTargetQuestion).hitRegion?.radius}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('radius-val')).toHaveTextContent('0.1')

    const slider = screen.getByLabelText(/Độ rộng vùng chạm/i)
    fireEvent.change(slider, { target: { value: '0.25' } })
    expect(screen.getByTestId('radius-val')).toHaveTextContent('0.25')
  })

  it('nhấp vào ảnh tương tác cập nhật tọa độ hitRegion', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <SpotTheTargetForm
            gameType="SPOT_THE_TARGET"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="hit-x">
            {(question as SpotTheTargetQuestion).hitRegion?.x}
          </output>
        </>
      )
    }

    render(<Harness />)
    const canvasBox = screen.getByTestId('spot-target-canvas-box')

    // Mock getBoundingClientRect
    canvasBox.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 400,
      height: 300,
      right: 500,
      bottom: 400,
      x: 100,
      y: 100,
      toJSON: () => {},
    })

    // Click at clientX: 200, clientY: 200 => (200-100)/400 = 0.25
    fireEvent.click(canvasBox, { clientX: 200, clientY: 200 })
    expect(screen.getByTestId('hit-x')).toHaveTextContent('0.25')
  })
})
