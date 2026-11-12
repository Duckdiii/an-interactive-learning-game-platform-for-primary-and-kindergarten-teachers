/**
 * Kích thước "thiết kế" và hằng số bố cục dùng chung cho mọi renderer (Quiz, Matching...). Toạ độ theo hệ
 * của `ResponsiveStage`: canvas rộng 800, sau đó tự co theo màn hình thật.
 */
export const STAGE_WIDTH = 800

/** Ảnh minh hoạ cấp câu hỏi (`imageUrl`), vuông, căn giữa. */
export const ILLUSTRATION_SIZE = 140

/** Nút nghe lại cao 96 (>= 64px quy ước); trên màn nhỏ canvas thu nhỏ nên cần dư để còn dễ chạm. */
export const AUDIO_BUTTON_WIDTH = 300
export const AUDIO_BUTTON_HEIGHT = 96

/** Vị trí từng hình nhỏ (trong ô minh họa vuông cạnh `size`) khi vẽ `count` hình cho câu đếm: lưới gần vuông, hàng cuối căn giữa. */
export function illustrationGrid(count: number, size = ILLUSTRATION_SIZE, gap = 6): { x: number; y: number; size: number }[] {
  if (count <= 1) return [{ x: 0, y: 0, size }]
  const perRow = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / perRow)
  const cell = Math.floor((size - gap * (perRow - 1)) / perRow)
  const top = (size - rows * cell - (rows - 1) * gap) / 2
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow)
    const inRow = row === rows - 1 ? count - row * perRow : perRow
    const left = (size - inRow * cell - (inRow - 1) * gap) / 2
    return { x: left + (i % perRow) * (cell + gap), y: top + row * (cell + gap), size: cell }
  })
}
