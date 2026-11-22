import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { OrderingQuestion, QuestionDsl } from '../../../types/game-dsl.types'
import OrderingForm from './OrderingForm'

const createInitialQuestion = (): OrderingQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  steps: [
    { id: 's1', text: 'Bước 1: Trứng', correctPosition: 1 },
    { id: 's2', text: 'Bước 2: Sâu bướm', correctPosition: 2 },
    { id: 's3', text: 'Bước 3: Bướm', correctPosition: 3 },
  ],
})

describe('OrderingForm', () => {
  it('hiển thị danh sách các bước và các nút thao tác', () => {
    const q = createInitialQuestion()
    render(<OrderingForm gameType="ORDERING" question={q} issues={[]} onUpdate={() => {}} />)

    expect(screen.getByText('Bước 1')).toBeInTheDocument()
    expect(screen.getByText('Bước 2')).toBeInTheDocument()
    expect(screen.getByText('Bước 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm bước/i })).toBeInTheDocument()
  })

  it('bấm Thêm bước sẽ gọi onUpdate với bước mới', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <OrderingForm
            gameType="ORDERING"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="steps-count">
            {(question as OrderingQuestion).steps.length}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('steps-count')).toHaveTextContent('3')

    fireEvent.click(screen.getByRole('button', { name: /Thêm bước/i }))
    expect(screen.getByTestId('steps-count')).toHaveTextContent('4')
  })

  it('bấm Xóa bước thì giảm số bước và cập nhật lại', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <OrderingForm
            gameType="ORDERING"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="step-ids">
            {(question as OrderingQuestion).steps.map((s) => s.id).join(',')}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('step-ids')).toHaveTextContent('s1,s2,s3')

    fireEvent.click(screen.getByRole('button', { name: /Xóa bước 2/i }))
    expect(screen.getByTestId('step-ids')).toHaveTextContent('s1,s3')
  })

  it('bấm Di chuyển xuống hoán đổi vị trí của 2 bước liền kề', () => {
    function Harness() {
      const [question, setQuestion] = useState<QuestionDsl>(createInitialQuestion())
      return (
        <>
          <OrderingForm
            gameType="ORDERING"
            question={question}
            issues={[]}
            onUpdate={(update) => setQuestion(update)}
          />
          <output data-testid="step-texts">
            {(question as OrderingQuestion).steps.map((s) => s.text).join(' -> ')}
          </output>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByTestId('step-texts')).toHaveTextContent(
      'Bước 1: Trứng -> Bước 2: Sâu bướm -> Bước 3: Bướm'
    )

    fireEvent.click(screen.getByRole('button', { name: /Di chuyển xuống 1/i }))
    expect(screen.getByTestId('step-texts')).toHaveTextContent(
      'Bước 2: Sâu bướm -> Bước 1: Trứng -> Bước 3: Bướm'
    )
  })

  it('hiển thị thông báo lỗi khi có issues trong mảng steps', () => {
    const q = createInitialQuestion()
    render(
      <OrderingForm
        gameType="ORDERING"
        question={q}
        issues={[
          {
            questionIndex: 0,
            field: 'steps',
            code: 'duplicate',
            message: 'Câu 1: các bước không được trùng chữ.',
          },
        ]}
        onUpdate={() => {}}
      />
    )

    expect(screen.getByText('Các bước không được trùng chữ.')).toBeInTheDocument()
  })
})
