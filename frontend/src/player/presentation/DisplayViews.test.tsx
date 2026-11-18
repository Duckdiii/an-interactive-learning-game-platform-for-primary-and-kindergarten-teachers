import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QuestionDisplayView } from './QuestionDisplayView'
import { LeaderboardDisplayView } from './LeaderboardDisplayView'

describe('QuestionDisplayView', () => {
  it('hiển thị câu hỏi, ảnh minh họa và lời nhắc trả lời trên thiết bị', () => {
    const question = {
      id: 'q1',
      instructionText: 'Đâu là con vật sống dưới nước?',
      sceneImageUrl: 'https://example.com/fish.png',
    }

    render(<QuestionDisplayView question={question} />)

    expect(screen.getByText('Đâu là con vật sống dưới nước?')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /minh họa/i })).toHaveAttribute(
      'src',
      'https://example.com/fish.png'
    )
    expect(screen.getByText('Trả lời trên thiết bị của con nhé!')).toBeInTheDocument()
  })

  it('hiển thị thông báo chờ câu hỏi khi question=null', () => {
    render(<QuestionDisplayView question={null} />)
    expect(screen.getByText('Đang chờ câu hỏi...')).toBeInTheDocument()
  })
})

describe('LeaderboardDisplayView', () => {
  it('hiển thị danh sách bảng xếp hạng top điểm', () => {
    const entries = [
      { rank: 1, name: 'Bé An', score: 100 },
      { rank: 2, name: 'Bé Bảo', score: 80 },
    ]

    render(<LeaderboardDisplayView entries={entries} />)

    expect(screen.getByText('🏆 Bảng xếp hạng')).toBeInTheDocument()
    expect(screen.getByText('Bé An')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Bé Bảo')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('hiển thị thông báo khi chưa có dữ liệu bảng điểm', () => {
    render(<LeaderboardDisplayView entries={[]} />)
    expect(screen.getByText('Chưa có điểm số nào được ghi nhận.')).toBeInTheDocument()
  })
})
