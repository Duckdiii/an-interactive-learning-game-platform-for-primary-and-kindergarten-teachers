import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'
import { viText } from '../../constants/viText'
import { safeHttpUrl } from '../../utils/safeUrl'
import Button from '../Button'

interface QrCodeProps {
  // Chỉ vẽ khi là http/https hợp lệ (qua `safeHttpUrl`): địa chỉ lạ (javascript:, data:...) hoặc rỗng thì KHÔNG vẽ gì, để không cho học sinh quét ra nơi không rõ.
  value: string | null | undefined
  // Mô tả cho trình đọc màn hình, ví dụ "Mã QR để vào chơi trò chơi".
  label: string
  // Tên tệp khi tải ảnh về (không kèm đuôi).
  fileName?: string
}

const text = viText.qr
// Nền trắng, nét đen và vùng yên tĩnh 4 ô (mức tối thiểu theo chuẩn QR) để máy quét đọc được cả khi in nhỏ hoặc chiếu lên màn hình.
const QUIET_ZONE_MODULES = 4
const REVOKE_DELAY_MS = 1000

export default function QrCode({ value, label, fileName = 'ma-qr' }: QrCodeProps) {
  const url = safeHttpUrl(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  if (!url) return null

  const download = () => {
    const svg = wrapperRef.current?.querySelector('svg')

    if (!svg) return

    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = href
    link.download = `${fileName}.svg`
    link.click()
    // Thu hồi chậm: một số trình duyệt (Firefox, Safari) hủy tải nếu địa chỉ bị thu hồi ngay sau khi bấm.
    setTimeout(() => URL.revokeObjectURL(href), REVOKE_DELAY_MS)
  }

  return (
    <div className="space-y-2">
      <div ref={wrapperRef} role="img" aria-label={label} className="mx-auto w-full max-w-56 rounded-xl border-2 border-ink/10 bg-white p-1">
        <QRCodeSVG value={url} size={224} level="M" marginSize={QUIET_ZONE_MODULES} bgColor="#ffffff" fgColor="#000000" className="h-auto w-full" aria-hidden="true" />
      </div>
      <div className="flex justify-center">
        <Button type="button" variant="secondary" onClick={download}>
          {text.download}
        </Button>
      </div>
    </div>
  )
}
