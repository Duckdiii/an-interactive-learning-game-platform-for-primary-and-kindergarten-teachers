import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PROFILES } from '../profile/profiles'
import type { AgeBand } from '../profile/types'
import { UiProfileProvider } from '../profile/UiProfileContext'
import BeShell from './BeShell'
import { getShell } from './index'
import PlayerShell from './PlayerShell'
import StudentShell from './StudentShell'

function renderShell(band: AgeBand, props: Partial<Parameters<typeof BeShell>[0]> = {}) {
  const Shell = getShell(band)

  return render(
    <UiProfileProvider profile={PROFILES[band]}>
      <Shell title="Đếm con vật" progress={{ current: 2, total: 5 }} score={30} remainingSeconds={12} {...props}>
        <p>vùng trò chơi</p>
      </Shell>
    </UiProfileProvider>,
  )
}

describe('registry', () => {
  it('mỗi khung có đúng một shell', () => {
    expect(getShell('be')).toBe(BeShell)
    expect(getShell('hocSinh')).toBe(StudentShell)
  })
})

describe('embedded', () => {
  it.each(['be', 'hocSinh'] as const)('khung %s: nhúng thì cao bằng khung chứa, mặc định cao bằng màn hình', (band) => {
    const embedded = renderShell(band, { embedded: true })
    const root = embedded.container.firstElementChild

    expect(root).toHaveClass('h-full', 'min-h-0')
    expect(root).not.toHaveClass('min-h-screen')
    // Nhúng trong trang giáo viên thì không thêm h1 thứ hai.
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    embedded.unmount()
    expect(renderShell(band).container.firstElementChild).toHaveClass('min-h-screen')
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('BeShell', () => {
  it('hiện tiến độ bằng sao, không đồng hồ, không điểm dù được đưa vào', () => {
    const { container } = renderShell('be')

    expect(screen.getByRole('img', { name: 'Câu 2/5' })).toHaveTextContent('★★☆☆☆')
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByText(/điểm/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đếm con vật' })).toBeInTheDocument()
    expect(screen.getByText('vùng trò chơi')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('data-band', 'be')
  })
})

describe('StudentShell', () => {
  it('hiện "Câu x/y", đồng hồ và điểm', () => {
    const { container } = renderShell('hocSinh')

    expect(screen.getByText('Câu 2/5')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('12 giây')
    expect(screen.getByText('30 điểm')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('data-band', 'hocSinh')
  })

  it('không đưa đồng hồ hoặc điểm vào thì không hiện', () => {
    renderShell('hocSinh', { score: undefined, remainingSeconds: null })

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByText(/điểm/)).not.toBeInTheDocument()
  })
})

describe('chỗ chừa chung', () => {
  it.each(['be', 'hocSinh'] as const)('%s: thanh phản hồi và nhân vật chỉ có khi được đưa vào', (band) => {
    const { unmount } = renderShell(band)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    unmount()

    renderShell(band, { feedback: 'Giỏi quá!', mascot: <span>nhân vật</span> })
    expect(screen.getByRole('status')).toHaveTextContent('Giỏi quá!')
    expect(screen.getByText('nhân vật')).toBeInTheDocument()
  })
})

describe('chân khung (P2.6)', () => {
  const MOUSE_ONLY = '[@media(hover:hover)_and_(pointer:fine)]:block'

  it.each(['be', 'hocSinh'] as const)('%s: chân khung dính đáy, dòng phím tắt chỉ hiện trên thiết bị có chuột', (band) => {
    renderShell(band, { feedback: 'Giỏi quá!', showHotkeyHint: true })

    const footer = screen.getByRole('status')
    const hint = screen.getByText(/Phím tắt: Enter câu tiếp/)

    expect(footer).toHaveClass('sticky', 'bottom-0', 'bg-play-page', 'z-10')
    expect(hint).toHaveClass('hidden', MOUSE_ONLY)
  })

  it('chưa có phản hồi: chân khung chỉ hiện trên thiết bị có chuột', () => {
    renderShell('hocSinh', { showHotkeyHint: true })

    expect(screen.getByRole('status')).toHaveClass('hidden', MOUSE_ONLY)
  })

  it('nút Tạm dừng chỉ ở khung Học sinh và chỉ khi được đưa onPause', () => {
    const onPause = vi.fn()
    const { unmount } = renderShell('be', { onPause })

    expect(screen.queryByRole('button', { name: 'Tạm dừng' })).not.toBeInTheDocument()
    unmount()

    renderShell('hocSinh', { onPause })
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }))
    expect(onPause).toHaveBeenCalledTimes(1)
  })
})

describe('PlayerShell', () => {
  it.each(['be', 'hocSinh'] as const)('%s: chọn shell theo profile trong context', (band) => {
    const { container } = render(
      <UiProfileProvider profile={PROFILES[band]}>
        <PlayerShell title="Đếm con vật" progress={{ current: 1, total: 3 }} remainingSeconds={0} />
      </UiProfileProvider>,
    )

    expect(container.firstElementChild).toHaveAttribute('data-band', band)
    // Đồng hồ ở 0 giây vẫn hiện (không bị coi là "không có") nhưng chỉ ở khung có đồng hồ.
    expect(screen.queryAllByRole('timer')).toHaveLength(band === 'hocSinh' ? 1 : 0)
    if (band === 'hocSinh') expect(screen.getByRole('timer')).toHaveTextContent('0 giây')
  })
})
