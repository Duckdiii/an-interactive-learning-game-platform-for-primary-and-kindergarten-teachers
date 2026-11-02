// Cờ dữ liệu mô phỏng THEO TỪNG NHÓM endpoint: nhóm nào backend đã có thật thì tắt mô phỏng ở nhóm đó, các nhóm còn lại
// vẫn chạy bằng dữ liệu mẫu. Đăng nhập, đăng ký không nằm trong danh sách này: luôn gọi backend thật.
//
// Biến môi trường `VITE_USE_MOCK`:
//   - bỏ trống: bật hết khi chạy `npm run dev`, tắt hết ở bản build;
//   - `all`: bật hết; `none`: tắt hết;
//   - danh sách nhóm cách nhau bởi dấu phẩy, ví dụ `games,ai,sessions`; tên lạ bị bỏ qua.

export const MOCK_GROUPS = ['games', 'editor', 'media', 'ai', 'sessions', 'results'] as const
export type MockGroup = (typeof MOCK_GROUPS)[number]

/** Hiểu giá trị của `VITE_USE_MOCK` (thuần, dễ test). */
export function parseMockSetting(value: string | undefined, isDev: boolean): ReadonlySet<MockGroup> {
  const text = (value ?? '').trim().toLowerCase()

  if (text === '') return new Set(isDev ? MOCK_GROUPS : [])
  if (text === 'all') return new Set(MOCK_GROUPS)
  if (text === 'none') return new Set()

  const wanted = text.split(',').map((part) => part.trim())

  // "all" lẫn trong danh sách (ví dụ "games,all") vẫn hiểu là bật hết.
  if (wanted.includes('all')) return new Set(MOCK_GROUPS)

  return new Set(MOCK_GROUPS.filter((group) => wanted.includes(group)))
}

/** Các mục trong `VITE_USE_MOCK` không nhận ra được (thường là gõ sai tên nhóm), để cảnh báo thay vì im lặng bỏ qua. */
export function unknownMockTokens(value: string | undefined): string[] {
  const known = new Set<string>([...MOCK_GROUPS, 'all', 'none', ''])

  return (value ?? '')
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
    .filter((part) => !known.has(part))
}

/** Các nhóm đang mô phỏng theo cấu hình hiện tại (đọc lại mỗi lần để test đổi được cờ). */
export function getMockGroups(): ReadonlySet<MockGroup> {
  return parseMockSetting(import.meta.env.VITE_USE_MOCK as string | undefined, import.meta.env.DEV)
}

export const isMock = (group: MockGroup) => getMockGroups().has(group)

export const anyMock = () => getMockGroups().size > 0

let warned = false

/** Cảnh báo một lần trên console khi có nhóm đang mô phỏng, để dev và người chấm không nhầm với dữ liệu thật. */
export function warnMockMode(log: (message: string) => void = console.warn) {
  const groups = [...getMockGroups()]
  const unknown = unknownMockTokens(import.meta.env.VITE_USE_MOCK as string | undefined)

  if (warned || (groups.length === 0 && unknown.length === 0)) return

  warned = true

  if (unknown.length > 0) {
    log(
      `[AI Game Platform] VITE_USE_MOCK có mục không nhận ra: ${unknown.join(', ')}. ` +
        `Các nhóm hợp lệ: ${MOCK_GROUPS.join(', ')}, hoặc all, none.`,
    )
  }

  if (groups.length === 0) return

  log(
    `[AI Game Platform] Đang dùng DỮ LIỆU MÔ PHỎNG cho: ${groups.join(', ')}. Đây không phải dữ liệu thật. ` +
      'Đặt VITE_USE_MOCK=none (hoặc bỏ nhóm tương ứng) để gọi backend thật.',
  )
}

/** Chỉ cho test: cho phép cảnh báo chạy lại. */
export function resetMockWarning() {
  warned = false
}
