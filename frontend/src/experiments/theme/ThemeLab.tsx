import { useState } from 'react'
import MatchingRenderer from '../../games/matching/MatchingRenderer'
import { mockMatchingQuestion } from '../../games/matching/MatchingRenderer.fixtures'
import QuizRenderer from '../../games/quiz/QuizRenderer'
import { mockQuizQuestion } from '../../games/quiz/QuizRenderer.fixtures'
import ThemeProvider from './ThemeProvider'
import { contrastRows } from './themeReport'
import { ALL_THEMES } from './themes'
import { validateTheme } from './validateTheme'

type Mechanic = 'QUIZ' | 'MATCHING'

/**
 * Phòng xem theme: chọn theme và cơ chế (QUIZ hoặc MATCHING, chế độ xem trước) để xem thật trên canvas, kèm thư
 * viện hình SVG của theme, kết quả `validateTheme` và bảng tương phản. Dữ liệu mẫu cục bộ, không gọi mạng.
 */
export default function ThemeLab() {
  const [themeId, setThemeId] = useState(ALL_THEMES[0].id)
  const [mechanic, setMechanic] = useState<Mechanic>('MATCHING')
  const theme = ALL_THEMES.find((candidate) => candidate.id === themeId) ?? ALL_THEMES[0]
  const issues = validateTheme(theme)
  const rows = contrastRows(theme)

  return (
    <div className="space-y-3 p-4">
      <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
        {ALL_THEMES.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            aria-pressed={candidate.id === theme.id}
            onClick={() => setThemeId(candidate.id)}
            className={`min-h-11 rounded border px-3 ${candidate.id === theme.id ? 'bg-slate-800 text-white' : 'bg-white'}`}
          >
            {candidate.name}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Cơ chế" className="flex flex-wrap gap-2">
        {(['MATCHING', 'QUIZ'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mechanic === value}
            onClick={() => setMechanic(value)}
            className={`min-h-11 rounded border px-3 ${mechanic === value ? 'bg-slate-800 text-white' : 'bg-white'}`}
          >
            {value}
          </button>
        ))}
      </div>

      <ThemeProvider theme={theme}>
        {/* `key`: đổi theme/cơ chế thì dựng lại renderer để không giữ trạng thái chơi cũ. */}
        {mechanic === 'QUIZ' ? (
          <QuizRenderer key={`${theme.id}-quiz`} question={mockQuizQuestion} mode="preview" />
        ) : (
          <MatchingRenderer key={`${theme.id}-matching`} question={mockMatchingQuestion} mode="preview" />
        )}
      </ThemeProvider>

      <p role="status">
        {issues.length === 0 ? `Theme "${theme.name}" hợp lệ theo validateTheme.` : `Theme "${theme.name}" có ${issues.length} lỗi: ${issues.map((i) => i.code).join(', ')}`}
      </p>

      {theme.assets.length > 0 && (
        <ul aria-label="Hình của theme" className="flex flex-wrap gap-4">
          {theme.assets.map((asset) => (
            <li key={asset.id} className="text-center text-xs">
              <img src={asset.src} alt={asset.alt} className="h-20 w-auto" />
              {asset.id}
            </li>
          ))}
        </ul>
      )}

      <table className="text-sm">
        <caption className="text-left">Tương phản (bắt buộc cho chữ; đồ họa chỉ để báo cáo)</caption>
        <thead>
          <tr>
            <th scope="col" className="pr-4 text-left">Cặp</th>
            <th scope="col" className="pr-4 text-left">Tỉ lệ</th>
            <th scope="col" className="pr-4 text-left">Cần</th>
            <th scope="col" className="text-left">Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} data-kind={r.kind}>
              <th scope="row" className="pr-4 text-left font-normal">{r.label}</th>
              <td className="pr-4">{r.ratio === null ? 'không đo được' : r.ratio.toFixed(2)}</td>
              <td className="pr-4">{r.required}</td>
              <td>{r.ok ? 'đạt' : 'KHÔNG đạt'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
