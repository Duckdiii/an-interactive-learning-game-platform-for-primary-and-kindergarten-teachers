import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postGenerateNarrationPreview } from '../../api/gamesApi'
import NarrationPreviewControl from './NarrationPreviewControl'

vi.mock('../../api/gamesApi', () => ({ postGenerateNarrationPreview: vi.fn() }))

const preview = vi.mocked(postGenerateNarrationPreview)

describe('NarrationPreviewControl', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires a saved prompt, generates and plays the saved narration', async () => {
    preview.mockResolvedValue({ questionId: 'q1', audioUrl: 'https://storage.test/q1.mp3', bytes: 1200, durationMillis: 1400 })
    const { container, rerender } = render(
      <NarrationPreviewControl gameId="g1" questionId="q1" audioText="Đọc câu này" hasSourceAudio={false} saved={false} />,
    )

    expect(screen.getByRole('button', { name: 'Tạo giọng đọc' })).toBeDisabled()
    expect(container.querySelector('audio')).not.toBeInTheDocument()

    rerender(<NarrationPreviewControl gameId="g1" questionId="q1" audioText="Đọc câu này" hasSourceAudio={false} saved />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo giọng đọc' }))

    await waitFor(() => expect(container.querySelector('audio')).toHaveAttribute('src', 'https://storage.test/q1.mp3'))
    expect(preview).toHaveBeenCalledWith('g1', 'q1')
  })

  it('shows the language-specific provider label and returns the exact saved text snapshot to PlayTest', async () => {
    const onAudioReady = vi.fn()
    preview.mockResolvedValue({ questionId: 'q1', audioUrl: 'https://storage.test/en.mp3', bytes: 1200, durationMillis: 1400 })
    const { container } = render(
      <NarrationPreviewControl gameId="g1" questionId="q1" audioText="Count the stars." subject="ENGLISH"
        onAudioReady={onAudioReady} hasSourceAudio={false} saved />,
    )

    expect(screen.getByText('Giọng đọc tiếng Anh')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo giọng đọc' }))

    await waitFor(() => expect(onAudioReady).toHaveBeenLastCalledWith('q1', {
      gameId: 'g1',
      audioText: 'Count the stars.',
      audioUrl: 'https://storage.test/en.mp3',
    }))
    expect(container.querySelector('audio')).toHaveAttribute('src', 'https://storage.test/en.mp3')
  })

  it('does not publish a preview returned for a different question id', async () => {
    const onAudioReady = vi.fn()
    preview.mockResolvedValue({ questionId: 'other-question', audioUrl: 'https://storage.test/stale.mp3', bytes: 100, durationMillis: 500 })
    const { container } = render(
      <NarrationPreviewControl gameId="g1" questionId="q1" audioText="Count the stars." subject="ENGLISH"
        onAudioReady={onAudioReady} hasSourceAudio={false} saved />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tạo giọng đọc' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(onAudioReady).not.toHaveBeenCalledWith('q1', expect.anything())
    expect(container.querySelector('audio')).not.toBeInTheDocument()
  })

  it('clears a cached preview when the narration text changes', async () => {
    preview.mockResolvedValue({ questionId: 'q1', audioUrl: 'https://storage.test/old.mp3', bytes: 100, durationMillis: 500 })
    const { container, rerender } = render(
      <NarrationPreviewControl gameId="g1" questionId="q1" audioText="Lời cũ" hasSourceAudio={false} saved />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tạo giọng đọc' }))
    await waitFor(() => expect(container.querySelector('audio')).toHaveAttribute('src', 'https://storage.test/old.mp3'))

    rerender(<NarrationPreviewControl gameId="g1" questionId="q1" audioText="Lời mới" hasSourceAudio={false} saved />)

    await waitFor(() => expect(container.querySelector('audio')).not.toBeInTheDocument())
  })

  it('does not show an old response if the teacher changes questions while generation is running', async () => {
    let resolvePreview: (value: { questionId: string; audioUrl: string; bytes: number; durationMillis: number }) => void = () => {}
    preview.mockReturnValue(new Promise((resolve) => { resolvePreview = resolve }))
    const { container, rerender } = render(
      <NarrationPreviewControl gameId="g1" questionId="q1" audioText="Câu một" hasSourceAudio={false} saved />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tạo giọng đọc' }))

    rerender(<NarrationPreviewControl gameId="g1" questionId="q2" audioText="Câu hai" hasSourceAudio={false} saved />)
    resolvePreview({ questionId: 'q1', audioUrl: 'https://storage.test/q1.mp3', bytes: 100, durationMillis: 500 })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo giọng đọc' })).toBeEnabled())
    expect(container.querySelector('audio')).not.toBeInTheDocument()
  })

  it('does not offer generated narration when the question uses source audio', () => {
    const { container } = render(
      <NarrationPreviewControl gameId="g1" questionId="q1" audioText="Lời đọc" hasSourceAudio saved />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
