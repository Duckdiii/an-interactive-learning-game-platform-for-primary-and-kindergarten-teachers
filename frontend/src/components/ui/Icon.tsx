// Bộ biểu tượng nét 24x24 vẽ tay (không dùng thư viện). Luôn mang tính trang trí (aria-hidden): nút chỉ có biểu tượng
// phải tự có aria-label, còn nút có chữ thì biểu tượng chỉ làm đẹp.

const PATHS = {
  home: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  library: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  sparkles: [
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
    'M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z',
  ],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M21 21l-4.3-4.3'],
  copy: ['M9 9h11v11H9z', 'M5 15V5a1 1 0 0 1 1-1h10'],
  check: ['M5 12l5 5L20 7'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4'],
  pencil: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 6l3 3'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  eyeOff: ['M3 3l18 18', 'M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.6', 'M6.5 7.5C3.8 9.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4-.9'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  chevronDown: ['M6 9l6 6 6-6'],
  alert: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18v.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v6', 'M12 7.5v.01'],
  play: ['M7 4l13 8-13 8z'],
  share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6'],
  dice: ['M4 4h16v16H4z', 'M9 9v.01', 'M15 9v.01', 'M12 12v.01', 'M9 15v.01', 'M15 15v.01'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
} as const

export type IconName = keyof typeof PATHS

export default function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
