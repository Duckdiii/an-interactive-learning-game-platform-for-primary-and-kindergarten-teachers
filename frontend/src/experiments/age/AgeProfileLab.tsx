import { AGE_BAND_ORDER, AGE_PROFILES } from './ageProfiles'
import { gameMatrix, MATRIX_CONTAINER_WIDTHS, themeMatrix } from './profileMatrix'

/**
 * Bảng kiểm hồ sơ độ tuổi: màn QUIZ/MATCHING mẫu theo từng nhóm tuổi và chiều rộng khung (vùng chạm tính bằng px màn
 * hình), và từng theme theo nhóm tuổi. Chỉ đọc; dữ liệu mẫu cục bộ. Ngưỡng 64/56/48px do người dùng chốt, các giới hạn
 * khác là đề xuất chưa được chuyên gia xác nhận.
 */
export default function AgeProfileLab() {
  const games = gameMatrix()
  const themes = themeMatrix()
  const cell = (mechanic: string, containerWidth: number, band: string) =>
    games.find((c) => c.mechanic === mechanic && c.containerWidth === containerWidth && c.band === band)!

  return (
    <div className="space-y-4 p-4">
      <table className="text-sm">
        <caption className="text-left font-semibold">Hồ sơ độ tuổi</caption>
        <thead>
          <tr>
            <th scope="col" className="pr-3 text-left">Nhóm</th>
            <th scope="col" className="pr-3 text-left">Vùng chạm</th>
            <th scope="col" className="pr-3 text-left">Đồng hồ</th>
            <th scope="col" className="pr-3 text-left">Xếp hạng sống</th>
            <th scope="col" className="pr-3 text-left">Chữ/thẻ</th>
            <th scope="col" className="pr-3 text-left">Chữ/câu</th>
            <th scope="col" className="text-left">Lựa chọn</th>
          </tr>
        </thead>
        <tbody>
          {AGE_BAND_ORDER.map((band) => {
            const p = AGE_PROFILES[band]
            return (
              <tr key={band}>
                <th scope="row" className="pr-3 text-left font-normal">{p.label}</th>
                <td className="pr-3">{p.minTouchTargetPx}px</td>
                <td className="pr-3">{p.allowTimer ? 'được' : 'không'}</td>
                <td className="pr-3">{p.allowLiveLeaderboard ? 'được' : 'không'}</td>
                <td className="pr-3">{p.maxCharsPerCard}</td>
                <td className="pr-3">{p.maxQuestionChars}</td>
                <td>{p.maxOptions}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <table className="text-sm">
        <caption className="text-left font-semibold">Màn chơi mẫu (lạc quan: sân chiếm trọn khung)</caption>
        <thead>
          <tr>
            <th scope="col" className="pr-3 text-left">Cơ chế</th>
            <th scope="col" className="pr-3 text-left">Khung</th>
            {AGE_BAND_ORDER.map((band) => (
              <th key={band} scope="col" className="pr-3 text-left">{AGE_PROFILES[band].label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['QUIZ', 'MATCHING'] as const).flatMap((mechanic) =>
            MATRIX_CONTAINER_WIDTHS.map((width) => (
              <tr key={`${mechanic}-${width}`}>
                <th scope="row" className="pr-3 text-left font-normal">{mechanic}</th>
                <td className="pr-3">{width}px</td>
                {AGE_BAND_ORDER.map((band) => {
                  const { issues } = cell(mechanic, width, band)
                  return (
                    <td key={band} className="pr-3 align-top" data-testid={`game-${mechanic}-${width}-${band}`}>
                      {issues.length === 0 ? (
                        'đạt'
                      ) : (
                        <details>
                          <summary>{issues.length} lỗi</summary>
                          <ul>
                            {issues.map((issue) => (
                              <li key={`${issue.code}-${issue.target}`}>{issue.message}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  )
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>

      <table className="text-sm">
        <caption className="text-left font-semibold">Theme theo nhóm tuổi và cơ chế</caption>
        <thead>
          <tr>
            <th scope="col" className="pr-3 text-left">Theme</th>
            <th scope="col" className="pr-3 text-left">Cơ chế</th>
            {AGE_BAND_ORDER.map((band) => (
              <th key={band} scope="col" className="pr-3 text-left">{AGE_PROFILES[band].label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(new Set(themes.map((t) => `${t.themeId}|${t.mechanic}`))).map((key) => {
            const [themeId, mechanic] = key.split('|')
            return (
              <tr key={key}>
                <th scope="row" className="pr-3 text-left font-normal">{themeId}</th>
                <td className="pr-3">{mechanic}</td>
                {AGE_BAND_ORDER.map((band) => {
                  const found = themes.find((t) => t.themeId === themeId && t.mechanic === mechanic && t.band === band)!
                  return (
                    <td key={band} className="pr-3" data-testid={`theme-${themeId}-${mechanic}-${band}`}>
                      {found.issues.length === 0 ? 'đạt' : found.issues.map((i) => i.code).join(', ')}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
