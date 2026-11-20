import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { DragDropQuestion, QuestionDsl } from '../../../types/game-dsl.types'
import DragDropForm from './DragDropForm'

const createInitialQuestion = (): DragDropQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  dropZones: [
    { id: 'z1', label: 'Hoa quả' },
    { id: 'z2', label: 'Rau củ' },
  ],
  items: [
    { id: 'i1', text: 'Quả cam', targetZoneId: 'z1' },
    { id: 'i2', text: 'Quả chuối', targetZoneId: 'z1' },
    { id: 'i3', text: 'Củ cà rốt', targetZoneId: 'z2' },
  ],
})

describe('DragDropForm', () => {
  it('hiển thị danh sách giỏ và danh sách các mục kéo thả', () => {
    const q = createInitialQuestion()
    render(<DragDropForm gameType="DRAG_DROP" question={q} issues={[]} onUpdate={() => {}} />)

    expect(screen.getByText('Giỏ 1')).toBeInTheDocument()
    expect(screen.getByText('Giỏ 2')).toBeInTheDocument()
    expect(screen.getByText('Mục 1')).toBeInTheDocument()
    expect(screen.getByText('Mục 2')).toBeInTheDocument()
    expect(screen.getByText('Mục 3')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Thêm giỏ/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm mục/i })).toBeInTheDocument()
  })

  it('bấm Thêm giỏ tăng số lượng giỏ', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <DragDropForm
            gameType="DRAG_DROP"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="zones-count">
            {(question as DragDropQuestion).dropZones.length}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('zones-count')).toHaveTextContent('2')

    fireEvent.click(screen.getByRole('button', { name: /Thêm giỏ/i }))
    expect(screen.getByTestId('zones-count')).toHaveTextContent('3')
  })

  it('bấm Thêm mục tăng số lượng item', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <DragDropForm
            gameType="DRAG_DROP"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="items-count">
            {(question as DragDropQuestion).items.length}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('items-count')).toHaveTextContent('3')

    fireEvent.click(screen.getByRole('button', { name: /Thêm mục/i }))
    expect(screen.getByTestId('items-count')).toHaveTextContent('4')
  })

  it('chọn giỏ đích cho mục trong select dropdown gọi onUpdate', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <DragDropForm
            gameType="DRAG_DROP"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="item-1-zone">
            {(question as DragDropQuestion).items[0]?.targetZoneId}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('item-1-zone')).toHaveTextContent('z1')

    const select = screen.getByLabelText(/Thuộc giỏ/i, { selector: '#item-i1-zone' })
    fireEvent.change(select, { target: { value: 'z2' } })
    expect(screen.getByTestId('item-1-zone')).toHaveTextContent('z2')
  })

  it('xóa giỏ tự động cập nhật item đang trỏ giỏ đó sang giỏ còn lại', () => {
    function Harness() {
      const initial = createInitialQuestion()
      // Thêm giỏ thứ 3 để có thể xóa
      const q3: DragDropQuestion = {
        ...initial,
        dropZones: [...initial.dropZones, { id: 'z3', label: 'Gia vị' }],
        items: [...initial.items, { id: 'i4', text: 'Muối', targetZoneId: 'z3' }],
      }
      const [question, setQuestion] = useState<QuestionDsl>(q3)
      return (
        <>
          <DragDropForm
            gameType="DRAG_DROP"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="item-4-zone">
            {(question as DragDropQuestion).items[3]?.targetZoneId}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('item-4-zone')).toHaveTextContent('z3')

    fireEvent.click(screen.getByRole('button', { name: /Xóa giỏ 3/i }))
    // Sau khi xóa giỏ z3, item 4 tự động chuyển về z1
    expect(screen.getByTestId('item-4-zone')).toHaveTextContent('z1')
  })
})
