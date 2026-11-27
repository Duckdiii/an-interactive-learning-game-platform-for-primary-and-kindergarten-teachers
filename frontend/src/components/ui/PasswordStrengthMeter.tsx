import { viText } from '../../constants/viText'
import { passwordStrength } from '../../utils/passwordStrength'

// Thanh 3 vạch + nhãn đọc to khi đổi; theo đúng luật Backend (xem passwordStrength) nhưng chỉ gợi ý, không chặn nộp. Không dùng đỏ: mức thấp là vàng.
export default function PasswordStrengthMeter({ password }: { password: string }) {
  const { level, label } = passwordStrength(password)

  return (
    <div className="mt-2">
      <div aria-hidden="true" className="flex gap-1.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={`h-2 flex-1 rounded-full ${
              bar > level ? 'bg-line' : level === 3 ? 'bg-brand' : 'bg-sun'
            }`}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-1 text-sm font-semibold text-ink-soft">
        <span className="sr-only">{viText.auth.strengthLabel}: </span>
        {label}
      </p>
    </div>
  )
}
