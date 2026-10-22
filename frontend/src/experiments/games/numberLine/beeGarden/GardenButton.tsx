import type { ButtonHTMLAttributes } from 'react'
import type { ButtonTone } from './gardenUi'

interface GardenButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'className'> {
  tone: ButtonTone
  /** Cạnh ngắn nhất của vùng chạm (px màn hình) theo hồ sơ độ tuổi: Mầm non 64, lớp 1–2 56, lớp 3–5 48. */
  minPx: number
}

/**
 * Nút HTML cùng kiểu với nút trên canvas (`ChunkyButton`): mặt phẳng bo tròn, viền dày, bóng đổ phía dưới, lún xuống khi nhấn.
 * Màu lấy từ token theme qua `ButtonTone`; vùng chạm không bao giờ nhỏ hơn `minPx`.
 */
export default function GardenButton({ tone, minPx, disabled, children, ...rest }: GardenButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      className="rounded-3xl border-4 px-8 text-2xl font-extrabold transition-transform active:translate-y-1 motion-reduce:transition-none"
      style={{
        minHeight: minPx,
        minWidth: minPx,
        background: disabled ? tone.faceOff : tone.face,
        borderColor: disabled ? tone.borderOff : tone.border,
        color: disabled ? tone.inkOff : tone.ink,
        boxShadow: `0 6px 0 ${disabled ? tone.borderOff : tone.shadow}`,
      }}
    >
      {children}
    </button>
  )
}
