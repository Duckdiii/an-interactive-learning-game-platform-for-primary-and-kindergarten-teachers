// Bố cục thuần của CPF: đổi vùng có tên (region) + cách xếp (arrangement) thành ô pixel trên sân khấu thiết kế.
// AI không sinh toạ độ (docs/cpf-game-v2.0.0.md nguyên tắc 1); mọi toạ độ tính ở đây và có test duyệt mọi tổ hợp.
import type { CpfArrangement, CpfRegion } from '../../types/cpf-game.types'

export const CPF_STAGE_WIDTH = 1280
export const CPF_STAGE_HEIGHT = 720
/** Dải trên cùng dành cho câu hỏi, nút nghe lại, điểm; vật chơi không đặt vào đây. */
export const CPF_HUD_HEIGHT = 110
/** Lớn hơn 64px của quy ước chạm, chừa chỗ cho nhãn chữ trên vật. */
export const CPF_MIN_ITEM_SIZE = 80
const MAX_ITEM_SIZE = 150
const SINGLE_ITEM_SIZE = 170
const GAP = 24

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

const REGIONS: Record<CpfRegion, Box> = {
  TOP: { x: 60, y: 130, w: 1160, h: 180 },
  MIDDLE: { x: 60, y: 320, w: 1160, h: 190 },
  BOTTOM: { x: 60, y: 520, w: 1160, h: 190 },
  LEFT: { x: 30, y: 130, w: 340, h: 580 },
  RIGHT: { x: 910, y: 130, w: 340, h: 580 },
  CENTER: { x: 390, y: 220, w: 500, h: 400 },
}

export function regionBox(region: CpfRegion): Box {
  return REGIONS[region]
}

/** Số cột, số hàng cho `count` ô vuông cạnh `size` vừa trong vùng. */
function gridFit(area: Box, count: number, preferRow: boolean): { cols: number; rows: number; size: number } {
  let best = { cols: 1, rows: count, size: 0 }
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows)
    const size = Math.min(
      MAX_ITEM_SIZE,
      Math.floor((area.w - GAP * (cols - 1)) / cols),
      Math.floor((area.h - GAP * (rows - 1)) / rows),
    )
    // Ưu tiên một hàng khi vừa đủ lớn: trẻ nhìn một lượt từ trái sang phải.
    if (preferRow && rows === 1 && size >= CPF_MIN_ITEM_SIZE) return { cols, rows, size }
    if (size > best.size) best = { cols, rows, size }
  }
  return best
}

/** Hash nhỏ để SCATTER lệch ổn định theo vị trí (cùng game luôn ra cùng bố cục, test lặp lại được). */
function jitter(index: number, salt: number): number {
  const v = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Ô cho `count` vật xếp trong vùng. Mọi ô nằm trong vùng, cạnh ≥ CPF_MIN_ITEM_SIZE và không chồng nhau.
 * `SINGLE` chỉ dành cho một vật (Lớp 2 chặn `bindTo` + `SINGLE`); nếu vẫn có nhiều vật thì xếp như `ROW`.
 */
export function layoutGroup(region: CpfRegion, arrangement: CpfArrangement, count: number): Box[] {
  const area = regionBox(region)
  if (count <= 0) return []

  if (arrangement === 'SINGLE' && count === 1) {
    const size = Math.min(SINGLE_ITEM_SIZE, area.w, area.h)
    return [{ x: area.x + (area.w - size) / 2, y: area.y + (area.h - size) / 2, w: size, h: size }]
  }

  const { cols, rows, size } = gridFit(area, count, arrangement !== 'GRID')
  const cellW = (area.w - GAP * (cols - 1)) / cols
  const cellH = (area.h - GAP * (rows - 1)) / rows
  const boxes: Box[] = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const slackX = cellW - size
    const slackY = cellH - size
    // SCATTER: lệch ngẫu nhiên ổn định trong ô của mình nên không bao giờ chồng ô khác.
    const offX = arrangement === 'SCATTER' ? jitter(i, 1) * slackX : slackX / 2
    const offY = arrangement === 'SCATTER' ? jitter(i, 2) * slackY : slackY / 2
    boxes.push({ x: area.x + col * (cellW + GAP) + offX, y: area.y + row * (cellH + GAP) + offY, w: size, h: size })
  }
  return boxes
}

/** Vị trí ngang của vật PROGRESS sau `step` nấc trên `total` nấc, chạy hết bề rộng vùng của nó. */
export function progressX(box: Box, region: CpfRegion, step: number, total: number): number {
  const area = regionBox(region)
  const start = area.x
  const end = area.x + area.w - box.w
  const ratio = total <= 0 ? 0 : Math.min(1, Math.max(0, step / total))
  return start + (end - start) * ratio
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

export function center(box: Box): { x: number; y: number } {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

export function containsPoint(box: Box, p: { x: number; y: number }): boolean {
  return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h
}
