import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExperimentsPage from './ExperimentsPage'
import { FRAME_WIDTHS } from './frameWidths'
import {
  duplicateExperimentIds,
  EXPERIMENT_ENTRIES,
  findExperiment,
  type ExperimentEntry,
} from './registry'

const entry = (id: string, title = id): ExperimentEntry => ({
  id,
  title,
  area: 'INFRA',
  render: () => <p>nội dung {id}</p>,
})

describe('registry', () => {
  it('bảng đăng ký thật không trùng mã', () => {
    expect(duplicateExperimentIds(EXPERIMENT_ENTRIES)).toEqual([])
  })

  it('phát hiện mã trùng', () => {
    expect(duplicateExperimentIds([entry('a'), entry('b'), entry('a')])).toEqual(['a'])
  })

  it('findExperiment tìm đúng và trả undefined khi không có', () => {
    const entries = [entry('a'), entry('b')]
    expect(findExperiment('b', entries)?.id).toBe('b')
    expect(findExperiment('x', entries)).toBeUndefined()
  })
})

describe('ExperimentsPage', () => {
  it('không có mục nào thì báo trống và không vỡ', () => {
    render(<ExperimentsPage entries={[]} />)
    expect(screen.getByText('Chưa có mục thử nghiệm nào.')).toBeInTheDocument()
    expect(screen.getByTestId('experiment-frame')).toBeEmptyDOMElement()
  })

  it('mặc định chọn mục đầu và đổi mục thì đổi nội dung', () => {
    render(<ExperimentsPage entries={[entry('a', 'Mục A'), entry('b', 'Mục B')]} />)
    expect(screen.getByText('nội dung a')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mục B' }))
    expect(screen.getByText('nội dung b')).toBeInTheDocument()
    expect(screen.queryByText('nội dung a')).not.toBeInTheDocument()
  })

  it('đổi chiều rộng khung theo 390, 768, 1280', () => {
    render(<ExperimentsPage entries={[]} />)
    const frame = screen.getByTestId('experiment-frame')
    expect(frame).toHaveStyle({ width: '390px' })
    for (const width of FRAME_WIDTHS) {
      fireEvent.click(screen.getByRole('button', { name: `${width}px` }))
      expect(frame).toHaveStyle({ width: `${width}px` })
      expect(screen.getByRole('button', { name: `${width}px` })).toHaveAttribute('aria-pressed', 'true')
    }
  })
})
