import type { ButtonHTMLAttributes } from 'react'

/** Nút của phần chơi: màu và vùng chạm tối thiểu (64px ở khung Bé) lấy từ token của profile qua biến CSS, nên dùng được cả ngoài UiProfileProvider. */
export default function PlayButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        'inline-flex min-h-[var(--play-min-touch)] items-center justify-center rounded-xl bg-play-primary px-6 text-lg font-bold text-play-primary-ink',
        'transition hover:bg-play-primary-strong disabled:cursor-not-allowed disabled:opacity-60',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
