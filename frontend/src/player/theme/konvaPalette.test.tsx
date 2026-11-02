import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MatchingConfirmButton from '../../games/matching/MatchingConfirmButton'
import { DEFAULT_PALETTE } from '../../games/common/palette'
import { PROFILES } from '../profile/profiles'
import { UiProfileProvider } from '../profile/UiProfileContext'

// Cho thấy màu của profile đến được shape Konva thật qua Stage (ngữ cảnh đi xuyên react-konva): shape được giả lập để ghi lại prop màu.
const shapes = vi.hoisted(() => ({ fills: [] as string[] }))
vi.mock('react-konva', async () => {
  const { useContextBridge } = await import('its-fine')

  return {
    // Stage thật bắc cầu ngữ cảnh qua its-fine; ở đây dùng đúng cơ chế đó để kiểm.
    Stage: ({ children }: { children?: React.ReactNode }) => {
      const Bridge = useContextBridge()

      return <Bridge>{children}</Bridge>
    },
    Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Rect: ({ fill }: { fill?: string }) => {
      shapes.fills.push(String(fill))

      return null
    },
    Text: ({ fill }: { fill?: string }) => {
      shapes.fills.push(String(fill))

      return null
    },
  }
})

describe('màu của profile đến được Konva', () => {
  it('nút xác nhận của Matching dùng màu chính của profile, không phải màu cứng', () => {
    shapes.fills.length = 0
    const profile = { ...PROFILES.be, tokens: { ...PROFILES.be.tokens, colors: { ...DEFAULT_PALETTE, primary: '#123456', primaryInk: '#654321' } } }

    render(
      <UiProfileProvider profile={profile}>
        <MatchingConfirmButton y={0} label="Xong rồi!" enabled onPress={() => undefined} />
      </UiProfileProvider>,
    )

    expect(shapes.fills).toContain('#123456')
    expect(shapes.fills).toContain('#654321')
  })

  it('không có provider thì dùng bảng màu mặc định', () => {
    shapes.fills.length = 0
    render(<MatchingConfirmButton y={0} label="Xong rồi!" enabled onPress={() => undefined} />)

    expect(shapes.fills).toContain(DEFAULT_PALETTE.primary)
  })
})
