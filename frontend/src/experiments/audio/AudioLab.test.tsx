import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AudioLab from './AudioLab'
import { AudioService } from './audioService'
import { FakeAudioContext } from './fakeAudioContext'
import { soundPlan } from './tones'

function setup() {
  const contexts: FakeAudioContext[] = []
  let time = 0
  const service = new AudioService({
    createContext: () => {
      const context = new FakeAudioContext()
      contexts.push(context)
      return context
    },
    now: () => (time += 1000),
  })
  render(<AudioLab service={service} />)
  return { service, contexts }
}

describe('AudioLab', () => {
  it('ban đầu báo chưa mở khóa và chưa dựng AudioContext', () => {
    const { contexts } = setup()
    expect(screen.getByRole('status')).toHaveTextContent('chưa mở khóa')
    expect(contexts).toHaveLength(0)
  })

  it('bấm nút: mở khóa rồi phát đúng số nốt của âm đó, trạng thái đổi', async () => {
    const { contexts } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Đúng' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('đã mở khóa'))
    expect(contexts).toHaveLength(1)
    expect(contexts[0].oscillators).toHaveLength(soundPlan('correct').length)
  })

  it.each([
    ['Thử lại', 'tryAgain'],
    ['Hoàn thành', 'complete'],
  ] as const)('nút %s phát âm %s', async (label, sound) => {
    const { contexts } = setup()
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(contexts[0]?.oscillators).toHaveLength(soundPlan(sound).length))
  })

  it('tắt tiếng rồi bấm nút thì không có nốt nào', async () => {
    const { contexts } = setup()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tắt tiếng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đúng' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('đã mở khóa'))
    expect(contexts[0].oscillators).toHaveLength(0)
  })

  it('thanh âm lượng cập nhật service và nhãn phần trăm', () => {
    const { service } = setup()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.25' } })
    expect(service.currentVolume).toBe(0.25)
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('nút nghe thử đủ lớn theo quy ước 64px (lớp min-h-16/min-w-16)', () => {
    setup()
    for (const name of ['Đúng', 'Thử lại', 'Hoàn thành']) {
      const button = screen.getByRole('button', { name })
      expect(button.className).toContain('min-h-16')
      expect(button.className).toContain('min-w-16')
    }
  })
})
