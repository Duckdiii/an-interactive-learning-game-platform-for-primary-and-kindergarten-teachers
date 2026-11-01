import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QRCodeSVG } from 'qrcode.react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QrCode from './QrCode'

const URL_OK = 'https://aigame.vn/play/ABC123'

afterEach(() => vi.restoreAllMocks())

describe('QrCode', () => {
  it('địa chỉ http/https hợp lệ: vẽ mã QR có nhãn mô tả, ẩn hình khỏi trình đọc màn hình và có nút tải', () => {
    const { container } = render(<QrCode value={URL_OK} label="Mã QR để vào chơi" />)

    expect(screen.getByRole('img', { name: 'Mã QR để vào chơi' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: /Tải mã QR/ })).toBeInTheDocument()
  })

  it('địa chỉ không an toàn, không phải http/https, có tên đăng nhập hoặc rỗng thì KHÔNG vẽ gì', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.b/c', 'https://u:p@evil.test/x', '/play/ABC123', '', '   ', null, undefined]) {
      const { container, unmount } = render(<QrCode value={value} label="x" />)

      expect(container, String(value)).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('đủ tương phản (nét đen trên nền trắng) và vùng yên tĩnh rộng hơn 4 ô so với mã không lề', () => {
    const { container } = render(<QrCode value={URL_OK} label="x" />)
    const bare = render(<QRCodeSVG value={URL_OK} size={224} level="M" marginSize={0} />).container.querySelector('svg')
    const svg = container.querySelector('svg')
    const size = (element: Element | null) => Number((element?.getAttribute('viewBox') ?? '').split(' ')[2])

    expect(svg?.innerHTML).toContain('#ffffff')
    expect(svg?.innerHTML).toContain('#000000')
    expect(size(svg)).toBe(size(bare) + 8)
  })

  it('nút tải ghi ra tệp SVG tên theo mã và thu hồi địa chỉ tạm', async () => {
    const user = userEvent.setup()
    const create = vi.fn().mockReturnValue('blob:qr')
    const revoke = vi.fn()

    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true })

    const names: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })

    render(<QrCode value={URL_OK} label="x" fileName="qr-ABC123" />)
    await user.click(screen.getByRole('button', { name: /Tải mã QR/ }))

    const blob = create.mock.calls[0][0] as Blob

    expect(blob.type).toBe('image/svg+xml')
    expect(click).toHaveBeenCalledTimes(1)
    expect(names).toEqual(['qr-ABC123.svg'])
    // Chưa thu hồi ngay (Firefox, Safari có thể hủy tải), nhưng cuối cùng phải thu hồi.
    expect(revoke).not.toHaveBeenCalled()
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:qr'), { timeout: 3000 })
  })
})
