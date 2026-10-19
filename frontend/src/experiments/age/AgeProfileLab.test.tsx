import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AgeProfileLab from './AgeProfileLab'


describe('AgeProfileLab', () => {
  it('bảng hồ sơ: ba nhóm với ngưỡng 64 / 56 / 48px', () => {
    render(<AgeProfileLab />)
    const table = screen.getByRole('table', { name: 'Hồ sơ độ tuổi' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(1 + 3)
    expect(rows[1]).toHaveTextContent('Mầm non')
    expect(rows[1]).toHaveTextContent('64px')
    expect(rows[2]).toHaveTextContent('56px')
    expect(rows[3]).toHaveTextContent('48px')
  })

  it('mầm non: không đồng hồ, không xếp hạng sống; lớp 1 trở lên được', () => {
    render(<AgeProfileLab />)
    const table = screen.getByRole('table', { name: 'Hồ sơ độ tuổi' })
    const [, preschool, grade12] = within(table).getAllByRole('row')
    expect(within(preschool).getAllByText('không')).toHaveLength(2)
    expect(within(grade12).getAllByText('được')).toHaveLength(2)
  })

  it('ma trận màn chơi: QUIZ và MATCHING đạt ở khung rộng và cả khung 390 (sau T5.4, tỉ lệ lạc quan 0,4875)', () => {
    render(<AgeProfileLab />)
    expect(screen.getByTestId('game-QUIZ-1280-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-MATCHING-768-GRADE_1_2')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-QUIZ-390-GRADE_3_5')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-MATCHING-390-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-MATCHING-390-GRADE_3_5')).toHaveTextContent('đạt')
  })

  it('ma trận màn chơi: có hàng NUMBER_LINE; đạt ở khung 1280 và 390 (tỉ lệ lạc quan 0,4875) cho cả mầm non', () => {
    render(<AgeProfileLab />)
    expect(screen.getByTestId('game-NUMBER_LINE-1280-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-NUMBER_LINE-390-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-NUMBER_LINE-390-GRADE_3_5')).toHaveTextContent('đạt')
  })

  it('ma trận màn chơi: có hàng SYLLABLE_BUILDER; đạt ở khung 1280 và 390 cho cả mầm non', () => {
    render(<AgeProfileLab />)
    expect(screen.getByTestId('game-SYLLABLE_BUILDER-1280-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-SYLLABLE_BUILDER-390-PRESCHOOL')).toHaveTextContent('đạt')
  })

  it('ma trận màn chơi: có hàng PREPOSITION_SCENE; đạt ở khung 1280 và 390 (tỉ lệ lạc quan 0,4875) cho cả mầm non', () => {
    render(<AgeProfileLab />)
    expect(screen.getByTestId('game-PREPOSITION_SCENE-1280-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-PREPOSITION_SCENE-390-PRESCHOOL')).toHaveTextContent('đạt')
    expect(screen.getByTestId('game-PREPOSITION_SCENE-390-GRADE_3_5')).toHaveTextContent('đạt')
  })

  it('bảng theme: mọi ô đạt', () => {
    render(<AgeProfileLab />)
    for (const theme of ['neutral', 'space', 'ocean']) {
      for (const mechanic of ['QUIZ', 'MATCHING']) {
        for (const band of ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5']) {
          expect(screen.getByTestId(`theme-${theme}-${mechanic}-${band}`)).toHaveTextContent('đạt')
        }
      }
    }
  })
})
