export interface OddOneOutLayout {
  width: number
  height: number
  itemSize: number
  positions: { x: number; y: number }[]
}

export function getOddOneOutLayout(count: number): OddOneOutLayout | null {
  if (!Number.isInteger(count) || count < 4 || count > 6) return null
  const width = 800
  const itemSize = 160
  const gap = 24
  const columns = count === 4 ? 2 : 3
  return {
    width, height: 464, itemSize,
    positions: Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / columns)
      const rowCount = Math.min(columns, count - row * columns)
      const rowWidth = rowCount * itemSize + (rowCount - 1) * gap
      return { x: (width - rowWidth) / 2 + (index % columns) * (itemSize + gap), y: 96 + row * (itemSize + gap) }
    }),
  }
}
