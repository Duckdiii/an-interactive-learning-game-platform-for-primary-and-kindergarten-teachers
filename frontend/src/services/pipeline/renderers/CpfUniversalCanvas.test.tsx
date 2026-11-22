import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CpfUniversalCanvas } from './CpfUniversalCanvas'
import { generateDynamicCpfSceneGraph } from '../dynamicCpfGenerator'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div data-testid="layer">{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="group" onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span data-testid="text">{text}</span>,
  Image: () => null,
  Circle: () => null,
  Shape: () => null,
  Line: () => null,
}))

describe('CpfUniversalCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders FARM theme with Pippy mascot for falling catcher game', () => {
    const graph = generateDynamicCpfSceneGraph(
      'Bé hứng các quả táo mang số chẵn rơi từ trên cây ở nông trại',
      2,
      'Math'
    )
    render(<CpfUniversalCanvas sceneGraph={graph} />)

    expect(screen.getByTestId('stage')).toBeInTheDocument()
    // Mission HUD shows dynamic uppercase title
    expect(screen.getByText(graph.title.toUpperCase())).toBeInTheDocument()
    // Score badge
    expect(screen.getByText(/⭐ ĐIỂM: 0/)).toBeInTheDocument()
    // Basket label
    expect(screen.getByText(/GIỎ SỐ CHẴN/)).toBeInTheDocument()
  })

  it('renders OCEAN theme with Sam mascot for direct tap game', () => {
    const graph = generateDynamicCpfSceneGraph(
      'Chạm nổ bong bóng số lẻ dưới đại dương xanh',
      1,
      'Math'
    )
    render(<CpfUniversalCanvas sceneGraph={graph} />)

    expect(screen.getByTestId('stage')).toBeInTheDocument()
    expect(screen.getByText(graph.title.toUpperCase())).toBeInTheDocument()
    expect(screen.getByText(/⭐ ĐIỂM: 0/)).toBeInTheDocument()
  })

  it('renders SPACE theme with Leo mascot for sling archery game', () => {
    const graph = generateDynamicCpfSceneGraph(
      'Lái phi thuyền bắn vỡ bong bóng năng lượng mang số lẻ ngoài vũ trụ',
      3,
      'Math'
    )
    render(<CpfUniversalCanvas sceneGraph={graph} />)

    expect(screen.getByTestId('stage')).toBeInTheDocument()
    expect(screen.getByText(graph.title.toUpperCase())).toBeInTheDocument()
    expect(screen.getByText(/👈 KÉO VỀ SAU/)).toBeInTheDocument()
  })

  it('renders CANDY and FOREST themes without throwing', () => {
    const candyGraph = generateDynamicCpfSceneGraph(
      'Tìm các kẹo ngọt số chẵn ở vương quốc kẹo ngọt',
      2,
      'Vietnamese'
    )
    const { unmount } = render(<CpfUniversalCanvas sceneGraph={candyGraph} />)
    expect(screen.getByTestId('stage')).toBeInTheDocument()
    unmount()

    const forestGraph = generateDynamicCpfSceneGraph(
      'Thu thập hạt dẻ số chẵn trong khu rừng xanh',
      2,
      'Science'
    )
    render(<CpfUniversalCanvas sceneGraph={forestGraph} />)
    expect(screen.getByTestId('stage')).toBeInTheDocument()
  })
})
