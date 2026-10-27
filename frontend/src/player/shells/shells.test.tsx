import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
