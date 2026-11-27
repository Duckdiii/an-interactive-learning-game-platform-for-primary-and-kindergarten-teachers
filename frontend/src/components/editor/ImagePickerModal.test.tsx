import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as mediaService from '../../services/mediaService'
import ImagePickerModal from './ImagePickerModal'

vi.mock('../../services/mediaService', () => ({
  searchPexelsImages: vi.fn(),
}))

describe('ImagePickerModal', () => {
  const onSelect = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal title and search input with initial query', async () => {
    vi.mocked(mediaService.searchPexelsImages).mockResolvedValue([
      { id: 1, url: 'https://img.large.jpg', thumbnailUrl: 'https://img.thumb.jpg', alt: 'Con mèo' },
    ])

    render(<ImagePickerModal initialQuery="mèo" onSelect={onSelect} onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Tìm kiếm ảnh/i)).toHaveValue('mèo')

    await waitFor(() => {
      expect(mediaService.searchPexelsImages).toHaveBeenCalledWith('mèo', 12)
    })
  })

  it('triggers onSelect and onClose when clicking an image', async () => {
    vi.mocked(mediaService.searchPexelsImages).mockResolvedValue([
      { id: 42, url: 'https://example.com/selected-image.jpg', thumbnailUrl: 'https://example.com/thumb.jpg', alt: 'Quả táo' },
    ])

    render(<ImagePickerModal onSelect={onSelect} onClose={onClose} />)

    const input = screen.getByPlaceholderText(/Tìm kiếm ảnh/i)
    fireEvent.change(input, { target: { value: 'quả táo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Chọn ảnh Quả táo/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Chọn ảnh Quả táo/i }))
    expect(onSelect).toHaveBeenCalledWith('https://example.com/selected-image.jpg')
    expect(onClose).toHaveBeenCalled()
  })

  it('displays error message when search fails', async () => {
    vi.mocked(mediaService.searchPexelsImages).mockRejectedValue(new Error('Network error'))

    render(<ImagePickerModal onSelect={onSelect} onClose={onClose} />)

    const input = screen.getByPlaceholderText(/Tìm kiếm ảnh/i)
    fireEvent.change(input, { target: { value: 'lỗi mạng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Không thể tải ảnh/i)
    })
  })

  it('closes on Escape key press or clicking backdrop', () => {
    render(<ImagePickerModal onSelect={onSelect} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
