export type SelectedTheme = 'AUTO' | 'FARM' | 'OCEAN' | 'JUNGLE' | 'SPACE'

interface ThemeOption {
  key: SelectedTheme
  name: string
  subtitle: string
  icon: string
  mascotName?: string
  mascotAvatar?: string
  previewBg?: string
  themeColor: string
  badgeText?: string
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    key: 'AUTO',
    name: 'AI Tự Đề Xuất',
    subtitle: 'Tự động phân tích bài học để chọn thế giới phù hợp nhất',
    icon: '✨',
    badgeText: 'Khuyên dùng',
    themeColor: 'from-amber-100 to-indigo-100 border-amber-300',
  },
  {
    key: 'FARM',
    name: 'Nông Trại Vui Vẻ',
    subtitle: 'Thân thiện, gần gũi với nông sản, gia súc và cánh đồng vàng',
    icon: '🌾',
    mascotName: 'Gà Con Pippy',
    mascotAvatar: '/assets/mascots/pippy.svg',
    previewBg: '/assets/themes/farm/bg-farm.svg',
    themeColor: 'from-amber-100 to-yellow-50 border-amber-400',
  },
  {
    key: 'OCEAN',
    name: 'Đại Dương Kỳ Thú',
    subtitle: 'Dịu mát, phiêu lưu rạn san hô và sinh vật biển lung linh',
    icon: '🌊',
    mascotName: 'Rùa Biển Sam',
    mascotAvatar: '/assets/mascots/sam.svg',
    previewBg: '/assets/themes/ocean/bg-ocean.svg',
    themeColor: 'from-cyan-100 to-sky-50 border-sky-400',
  },
  {
    key: 'JUNGLE',
    name: 'Rừng Xanh Thám Hiểm',
    subtitle: 'Sinh động, thiên nhiên muông thú hoang dã và cây cối rậm rạp',
    icon: '🌴',
    mascotName: 'Mèo Cam Mimi',
    mascotAvatar: '/assets/mascots/mimi.svg',
    previewBg: '/assets/themes/jungle/bg-jungle.svg',
    themeColor: 'from-emerald-100 to-teal-50 border-emerald-400',
  },
  {
    key: 'SPACE',
    name: 'Du Hành Vũ Trụ',
    subtitle: 'Kích thích trí tưởng tượng với phi thuyền, hành tinh và sao băng',
    icon: '🚀',
    mascotName: 'Bé Phi Hành Gia Leo',
    mascotAvatar: '/assets/mascots/leo.svg',
    previewBg: '/assets/themes/space/bg-space.svg',
    themeColor: 'from-violet-100 to-indigo-50 border-purple-400',
  },
]

interface ThemeSelectorProps {
  value: SelectedTheme
  onChange: (theme: SelectedTheme) => void
  disabled?: boolean
}

export default function ThemeSelector({ value, onChange, disabled }: ThemeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-base font-extrabold text-ink">
          🎨 Phong cách & Thế giới game (Theme)
        </label>
        <span className="text-xs font-semibold text-brand bg-brand-soft px-2.5 py-1 rounded-full">
          Stage 2.5 Asset Engine
        </span>
      </div>
      <p className="text-sm text-ink-soft">
        Chọn không gian thế giới mà bé sẽ bước vào khi chơi game. Linh vật và hình ảnh sẽ tự động thay đổi theo phong cách này.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1" role="radiogroup" aria-label="Chọn thế giới game">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = value === theme.key
          return (
            <button
              key={theme.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(theme.key)}
              className={`relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-brand bg-brand-soft/30 shadow-md ring-2 ring-brand ring-offset-2'
                  : 'border-ink/15 bg-surface hover:border-ink/30 hover:shadow-sm'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {theme.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                      {theme.name}
                      {theme.badgeText ? (
                        <span className="text-[10px] uppercase tracking-wider bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded">
                          {theme.badgeText}
                        </span>
                      ) : null}
                    </h3>
                    {theme.mascotName ? (
                      <p className="text-[11px] font-semibold text-brand">
                        Linh vật: {theme.mascotName}
                      </p>
                    ) : null}
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs font-black shrink-0">
                    ✓
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-ink/20 shrink-0" />
                )}
              </div>

              <p className="text-xs text-ink-soft mt-2 line-clamp-2 leading-relaxed">
                {theme.subtitle}
              </p>

              {theme.mascotAvatar ? (
                <div className="flex items-center justify-end mt-2 pt-2 border-t border-ink/5">
                  <img
                    src={theme.mascotAvatar}
                    alt={theme.mascotName}
                    className="w-7 h-7 object-contain drop-shadow"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
