import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DragDropQuestion, OrderingQuestion, SpotTheTargetQuestion } from '../../../types/game-dsl.types'
import QuestionEditor from './QuestionEditor'

describe('QuestionEditor dispatcher with new forms', () => {
  it('ORDERING render đúng OrderingForm thay vì CommonOnlyForm', () => {
    const question: OrderingQuestion = {
      id: 'q1',
      timeLimitSeconds: 30,
      points: 10,
      steps: [
        { id: 's1', text: 'Bước 1', correctPosition: 1 },
        { id: 's2', text: 'Bước 2', correctPosition: 2 },
      ],
    }

    render(
      <QuestionEditor
        gameType="ORDERING"
        question={question}
        number={1}
        issues={[]}
        onUpdate={() => {}}
      />
    )

    expect(screen.queryByText(/Loại game này chưa có form sửa chi tiết/i)).not.toBeInTheDocument()
    expect(screen.getByText('Các bước theo thứ tự đúng')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm bước/i })).toBeInTheDocument()
  })

  it('DRAG_DROP render đúng DragDropForm thay vì CommonOnlyForm', () => {
    const question: DragDropQuestion = {
      id: 'q1',
      timeLimitSeconds: 30,
      points: 10,
      dropZones: [
        { id: 'z1', label: 'Giỏ A' },
        { id: 'z2', label: 'Giỏ B' },
      ],
      items: [
        { id: 'i1', text: 'Vật 1', targetZoneId: 'z1' },
        { id: 'i2', text: 'Vật 2', targetZoneId: 'z1' },
        { id: 'i3', text: 'Vật 3', targetZoneId: 'z2' },
      ],
    }

    render(
      <QuestionEditor
        gameType="DRAG_DROP"
        question={question}
        number={1}
        issues={[]}
        onUpdate={() => {}}
      />
    )

    expect(screen.queryByText(/Loại game này chưa có form sửa chi tiết/i)).not.toBeInTheDocument()
    expect(screen.getByText('Các vùng chứa / Giỏ phân loại')).toBeInTheDocument()
    expect(screen.getByText('Các mục phân loại')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm giỏ/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm mục/i })).toBeInTheDocument()
  })

  it('SPOT_THE_TARGET render đúng SpotTheTargetForm thay vì CommonOnlyForm', () => {
    const question: SpotTheTargetQuestion = {
      id: 'q1',
      timeLimitSeconds: 30,
      points: 10,
      visualPrompt: 'https://example.com/park.jpg',
      targetDescription: 'Tìm chú cún con',
      hitRegion: { x: 0.3, y: 0.4, radius: 0.12 },
    }

    render(
      <QuestionEditor
        gameType="SPOT_THE_TARGET"
        question={question}
        number={1}
        issues={[]}
        onUpdate={() => {}}
      />
    )

    expect(screen.queryByText(/Loại game này chưa có form sửa chi tiết/i)).not.toBeInTheDocument()
    expect(screen.getByText('Vị trí mục tiêu đúng trên ảnh')).toBeInTheDocument()
    expect(screen.getByLabelText(/Mô tả đối tượng cần tìm/i)).toBeInTheDocument()
    expect(screen.getByTestId('spot-target-canvas-box')).toBeInTheDocument()
  })
})
