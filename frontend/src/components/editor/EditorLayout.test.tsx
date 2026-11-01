import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditorLayout from './EditorLayout'
import type { EditorPane } from './EditorLayout'

function Harness() {
  const [pane, setPane] = useState<EditorPane>('list')

  return <EditorLayout pane={pane} onPaneChange={setPane} questionCount={3} list={<p>Danh sách</p>} preview={<p>Xem</p>} see={<p>Bé thấy</p>} />
}

const mockDesktop = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} }))

afterEach(() => vi.unstubAllGlobals())

describe('EditorLayout: điện thoại (ba tab theo mẫu WAI-ARIA)', () => {
  it('chỉ tab đang chọn nằm trong thứ tự Tab (roving tabindex); hai khung có vai trò tabpanel gắn với tab', () => {
    render(<Harness />)

    expect(screen.getByRole('tab', { name: /Câu hỏi/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Sửa câu' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: 'Bé sẽ thấy' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(3)
  })

  it('phím mũi tên Phải/Trái, End, Home đổi tab và đưa tiêu điểm sang tab đó', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    screen.getByRole('tab', { name: /Câu hỏi/ }).focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Sửa câu' })).toHaveAttribute('aria-selected', 'true')
    await vi.waitFor(() => expect(screen.getByRole('tab', { name: 'Sửa câu' })).toHaveFocus())

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Bé sẽ thấy' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Câu hỏi/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Bé sẽ thấy' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /Câu hỏi/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft ở tab đầu vòng về tab cuối "Bé sẽ thấy"; mỗi tab trỏ đúng khung của nó', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    screen.getByRole('tab', { name: /Câu hỏi/ }).focus()
    await user.keyboard('{ArrowLeft}')

    expect(screen.getByRole('tab', { name: 'Bé sẽ thấy' })).toHaveAttribute('aria-selected', 'true')
    for (const tab of screen.getAllByRole('tab')) {
      expect(document.getElementById(tab.getAttribute('aria-controls') ?? '')).not.toBeNull()
    }
  })

  it('phím khác không đổi tab', () => {
    render(<Harness />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'a' })

    expect(screen.getByRole('tab', { name: /Câu hỏi/ })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('EditorLayout: máy tính (ba khung cùng hiện, không có tab)', () => {
  it('không còn vai trò tabpanel mồ côi; hai khung là vùng thường có tên', () => {
    mockDesktop(true)
    render(<Harness />)

    expect(screen.queryAllByRole('tabpanel')).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Câu hỏi' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Sửa câu' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Bé sẽ thấy' })).toBeInTheDocument()
  })
})
