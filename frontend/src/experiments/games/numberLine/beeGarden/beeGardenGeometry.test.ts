import { describe, expect, it } from 'vitest'
import { AGE_PROFILES } from '../../../age/ageProfiles'
import { overlaps, type Box } from '../numberLineLayout'
import {
  beeBob,
  beeMood,
  BEE_ABOVE_FLOWER,
  CONTROL_GAP,
  FLOWER_HEAD_FROM_BOTTOM,
  GO_BUTTON_WIDTH,
  GRASS_FROM_BOTTOM,
  SCENE_HEIGHT,
  SCENE_MAX_SCALE,
  questionTextWidth,
  PHONE_STAGE_SCALE,
  TOUCH_SIZE_CONFIRM,
  touchSizeForBand,
  TOUCH_SIZE_TAP,
  VALUE_BOX_WIDTH,
  type LayoutBox,
  BOUNCE_PEAK,
  DEFAULT_INTERACTION_MODE,
  HOP_ARC,
  hopSeconds,
  interactionModeForBand,
  pathValues,
  CONFETTI_COLORS,
  CONFETTI_SECONDS,
  computeGardenLayout,
  confettiPose,
  easeOutCubic,
  FLOWER_CENTER_RADIUS,
  FLOWER_RADIUS,
  BEE_EDGE_MARGIN,
  BEE_HALF_WIDTH,
  BADGE_NUMBER_FONT_SIZE,
  BADGE_SIZE,
  BEE_HIT_RADIUS,
  HUD_PAD,
  MAX_QUESTION_HEIGHT,
  QUESTION_FONT_SIZE,
  SCENE_TOP,
  signWidth,
  BEE_SCALE,
  flowerScale,
  GARDEN_LEFT,
  GARDEN_RIGHT,
  GARDEN_WIDTH,
  GARDEN_X,
  GAP,
  HAPPY_SECONDS,
  happyHop,
  happySpin,
  makeConfetti,
  OOPS_SECONDS,
  oopsShake,
  PETAL_COLORS,
  petalColor,
  pulse,
  HILL_PAD,
  PARALLAX,
  parallaxOffset,
  BEE_BOB_AMPLITUDE,
  BEE_TOP_EXTENT,
  DECOR_FADE_FAR,
  DECOR_FADE_MIN,
  DECOR_FADE_NEAR,
  decorFade,
  FRAME_ASPECT,
  FRAME_INSET_PERCENT,
  hopArcFor,
  SUN_GLOW_RADIUS,
  SUN_X,
  SUN_Y,
  BUSH_MAX_HEIGHT,
  GARDEN_BUSHES,
  GARDEN_CLOUDS,
  sunGlowOpacity,
  sunGlowScale,
  seededRandom,
  SPIN_SECONDS,
  wingScale,
} from './beeGardenGeometry'

describe('bố cục vườn', () => {
  const input = { hasAudio: true, hasBadge: true, questionHeight: 40, showConfirm: true }
  const overlapsAny = (boxes: Record<string, LayoutBox>) => {
    const names = Object.keys(boxes)
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        if (overlaps(boxes[names[i]] as Box, boxes[names[j]] as Box)) return `${names[i]} đè ${names[j]}`
      }
    }
    return null
  }

  it('các phần không đè nhau và nằm trong khung ở mọi tổ hợp: nghe lại, huy hiệu, nút xong, hàng điều khiển, cỡ nút theo tuổi, chữ ngắn/dài', () => {
    for (const hasAudio of [false, true]) {
      for (const hasBadge of [false, true]) {
        for (const showConfirm of [false, true]) {
          for (const showControls of [false, true]) {
            for (const touchSize of [TOUCH_SIZE_CONFIRM, TOUCH_SIZE_TAP, touchSizeForBand('GRADE_3_5')]) {
              for (const questionHeight of [0, 10, 40, 120, 400]) {
                const layout = computeGardenLayout({ hasAudio, hasBadge, questionHeight, showConfirm, showControls, touchSize })
                const boxes: Record<string, LayoutBox> = { scene: [GARDEN_X, layout.gardenY, GARDEN_WIDTH, layout.gardenHeight] }
                const label = `${hasAudio}/${hasBadge}/${showConfirm}/${showControls}/${touchSize}/${questionHeight}`
                // các phần của hàng đề bài không đè nhau (không so với cảnh vì chúng nằm trong cảnh)
                const hud: Record<string, LayoutBox> = { sign: layout.sign }
                if (layout.badge) hud.badge = layout.badge
                if (layout.speaker) hud.speaker = layout.speaker
                expect(overlapsAny(hud), label).toBeNull()
                // và nằm TRỌN trong cảnh, cách mép ít nhất HUD_PAD
                for (const [name, box] of Object.entries(hud)) {
                  expect(box[0], `${name} trái ${label}`).toBeGreaterThanOrEqual(GARDEN_X + HUD_PAD)
                  expect(box[0] + box[2], `${name} phải ${label}`).toBeLessThanOrEqual(GARDEN_X + GARDEN_WIDTH - HUD_PAD)
                  expect(box[1], `${name} trên ${label}`).toBeGreaterThanOrEqual(layout.gardenY + HUD_PAD)
                }
                if (layout.controls) {
                  const c = layout.controls
                  boxes.minus = [c.minusX, c.y, c.size, c.size]
                  boxes.value = [c.valueX, c.y, VALUE_BOX_WIDTH, c.size]
                  boxes.plus = [c.plusX, c.y, c.size, c.size]
                  if (c.goX !== null) boxes.go = [c.goX, c.y, GO_BUTTON_WIDTH, c.size]
                }
                expect(overlapsAny(boxes), label).toBeNull()
                for (const [name, box] of Object.entries(boxes)) {
                  expect(box[0], `${name} x ${label}`).toBeGreaterThanOrEqual(0)
                  expect(box[0] + box[2], `${name} phải ${label}`).toBeLessThanOrEqual(800)
                }
                expect(layout.stageHeight).toBeGreaterThan(Math.max(...Object.values(boxes).map((b) => b[1] + b[3])))
                // chữ nằm trọn trong bảng
                expect(layout.questionTextX).toBeGreaterThanOrEqual(layout.sign[0])
                expect(layout.questionTextX + layout.questionTextWidth).toBeLessThanOrEqual(layout.sign[0] + layout.sign[2])
                expect(layout.questionTextY).toBeGreaterThanOrEqual(layout.sign[1])
                expect(layout.questionTextY + layout.questionTextHeight).toBeLessThanOrEqual(layout.sign[1] + layout.sign[3])
                expect(layout.questionTextWidth).toBe(questionTextWidth(hasBadge, hasAudio, touchSize))
              }
            }
          }
        }
      }
    }
  })

  it('hàng đề bài nằm ở BẦU TRỜI: kết thúc trước dải hoa (kể cả lúc hoa nở to) và trước râu ong nghỉ, ở mọi tổ hợp và độ dài chữ', () => {
    for (const touchSize of [TOUCH_SIZE_CONFIRM, TOUCH_SIZE_TAP, touchSizeForBand('GRADE_3_5')]) {
      for (const questionHeight of [0, 40, 72, 400]) {
        const layout = computeGardenLayout({ ...input, touchSize, questionHeight })
        const [, rowY, , rowH] = layout.hudRow
        expect(rowY + rowH, `${touchSize}/${questionHeight}`).toBeLessThanOrEqual(layout.flowerY - FLOWER_RADIUS * 1.5)
        expect(rowY + rowH, `râu ong ${touchSize}/${questionHeight}`).toBeLessThanOrEqual(layout.beeY - 64 * BEE_SCALE + 4)
      }
    }
  })

  it('bảng đề bài: huy hiệu bên trái, nút nghe lại bên phải, bảng ở giữa lấp phần còn lại; không có huy hiệu hay loa thì bảng rộng hơn', () => {
    const full = computeGardenLayout({ ...input, touchSize: TOUCH_SIZE_TAP })
    expect(full.badge![0]).toBe(GARDEN_X + HUD_PAD)
    expect(full.sign[0]).toBe(full.badge![0] + BADGE_SIZE + GAP)
    expect(full.speaker![0] + full.speaker![2]).toBe(GARDEN_X + GARDEN_WIDTH - HUD_PAD)
    expect(full.sign[0] + full.sign[2] + GAP).toBe(full.speaker![0])
    expect(full.sign[2]).toBe(signWidth(true, true, TOUCH_SIZE_TAP))
    const bare = computeGardenLayout({ hasAudio: false, hasBadge: false, questionHeight: 40, showConfirm: true })
    expect(bare.badge).toBeNull()
    expect(bare.speaker).toBeNull()
    expect(bare.sign[2]).toBeGreaterThan(full.sign[2])
    expect(bare.sign[0]).toBe(GARDEN_X + HUD_PAD)
  })

  it('nút nghe lại đạt cỡ vùng chạm theo tuổi (vuông cạnh touchSize); huy hiệu to hơn nhiều so với chữ đề', () => {
    for (const touchSize of [TOUCH_SIZE_CONFIRM, TOUCH_SIZE_TAP]) {
      const layout = computeGardenLayout({ ...input, touchSize })
      expect(layout.speaker![2]).toBe(touchSize)
      expect(layout.speaker![3]).toBe(touchSize)
    }
    expect(BADGE_NUMBER_FONT_SIZE).toBeGreaterThan(QUESTION_FONT_SIZE * 2) // con số là thứ nổi nhất
    expect(QUESTION_FONT_SIZE).toBeLessThan(44) // nhỏ hơn số trên hoa (cỡ 44)
  })

  it('nút đủ lớn: 112 đơn vị đạt ≥ 48px và 144 đạt ≥ 64px ở khung điện thoại 390px (sân co ×0,445)', () => {
    const phone = 356 / 800
    expect(TOUCH_SIZE_CONFIRM * phone).toBeGreaterThanOrEqual(48)
    expect(TOUCH_SIZE_TAP * phone).toBeGreaterThanOrEqual(64)
    expect(TOUCH_SIZE_TAP).toBeGreaterThan(TOUCH_SIZE_CONFIRM) // Mầm non to hơn
  })

  it('hàng điều khiển là MỘT hàng: − số + «Xong rồi!» cùng y, cùng cao, cách nhau CONTROL_GAP, căn giữa sân; xem lại bài thì không có nút xong', () => {
    const layout = computeGardenLayout(input)
    const c = layout.controls!
    expect(c.valueX - (c.minusX + c.size)).toBe(CONTROL_GAP)
    expect(c.plusX - (c.valueX + VALUE_BOX_WIDTH)).toBe(CONTROL_GAP)
    expect(c.goX! - (c.plusX + c.size)).toBe(CONTROL_GAP)
    expect(c.minusX).toBeCloseTo(800 - (c.goX! + GO_BUTTON_WIDTH), 5) // lề trái = lề phải
    const review = computeGardenLayout({ ...input, showConfirm: false }).controls!
    expect(review.goX).toBeNull()
    expect(review.minusX).toBeCloseTo(800 - (review.plusX + review.size), 5)
    expect(layout.controls!.y).toBe(layout.gardenY + layout.gardenHeight + GAP)
  })

  it('chế độ chạm (không hàng điều khiển): không có controls, khung kết thúc ngay dưới vườn + đệm đáy', () => {
    const tap = computeGardenLayout({ ...input, showControls: false, touchSize: TOUCH_SIZE_TAP })
    expect(tap.controls).toBeNull()
    expect(tap.stageHeight).toBe(tap.gardenY + tap.gardenHeight + 20)
  })

  it('chiều cao cảnh CỐ ĐỊNH: không đổi theo chế độ chơi, cỡ nút theo tuổi, nghe lại, huy hiệu hay độ dài chữ đề', () => {
    for (const hasAudio of [false, true]) {
      for (const hasBadge of [false, true]) {
        for (const showControls of [false, true]) {
          for (const touchSize of [TOUCH_SIZE_CONFIRM, TOUCH_SIZE_TAP, touchSizeForBand('GRADE_3_5')]) {
            for (const questionHeight of [0, 40, 120, 400]) {
              const layout = computeGardenLayout({ hasAudio, hasBadge, questionHeight, showConfirm: true, showControls, touchSize })
              expect(layout.gardenHeight).toBe(SCENE_HEIGHT)
              expect(layout.gardenY).toBe(SCENE_TOP) // cảnh luôn bắt đầu ở cùng một chỗ: không còn hàng đầu ở trên cảnh làm cảnh dịch xuống
            }
          }
        }
      }
    }
    expect(SCENE_HEIGHT).toBe(520)
  })

  it('hàng điều khiển BÊN DƯỚI cảnh chỉ làm khung ngoài dài thêm: bỏ nó thì khung ngắn đúng bằng hàng đó + khoảng cách, cảnh không đổi', () => {
    const touchSize = TOUCH_SIZE_CONFIRM
    const withControls = computeGardenLayout({ ...input, touchSize })
    const without = computeGardenLayout({ ...input, showControls: false, touchSize })
    expect(withControls.gardenHeight).toBe(without.gardenHeight)
    expect(withControls.gardenY).toBe(without.gardenY)
    expect(withControls.flowerY).toBe(without.flowerY)
    expect(withControls.stageHeight - without.stageHeight).toBe(GAP + touchSize)
  })

  it('SCENE_MAX_SCALE > 1 để khối game lớn hơn ở màn rộng, nhưng vừa phải (không quá 1,5)', () => {
    expect(SCENE_MAX_SCALE).toBeGreaterThan(1)
    expect(SCENE_MAX_SCALE).toBeLessThanOrEqual(1.5)
  })

  it('chiều cao chữ: nhỏ hơn tối thiểu hoặc không hợp lệ thì dùng 40; dài quá thì bị chặn ở mức tối đa (đề dài không làm hàng đề tràn xuống hoa)', () => {
    for (const questionHeight of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const height = computeGardenLayout({ ...input, questionHeight }).questionTextHeight
      expect(height).toBeGreaterThanOrEqual(40)
      expect(height).toBeLessThanOrEqual(MAX_QUESTION_HEIGHT)
    }
    expect(computeGardenLayout({ ...input, questionHeight: 0 }).questionTextHeight).toBe(40)
    expect(computeGardenLayout({ ...input, questionHeight: 60 }).questionTextHeight).toBe(60)
    expect(computeGardenLayout({ ...input, questionHeight: 400 }).questionTextHeight).toBe(MAX_QUESTION_HEIGHT)
  })

  it('đầu hoa và chú ong nằm trong khung vườn neo theo đáy, ong ở phía trên hoa với khoảng hở để không che số', () => {
    for (const showControls of [false, true]) {
      const layout = computeGardenLayout({ ...input, showControls })
      const bottom = layout.gardenY + layout.gardenHeight
      expect(layout.flowerY).toBe(bottom - FLOWER_HEAD_FROM_BOTTOM)
      expect(layout.groundY).toBe(bottom - GRASS_FROM_BOTTOM)
      expect(layout.beeY).toBe(layout.flowerY - BEE_ABOVE_FLOWER)
      expect(layout.flowerY).toBeLessThan(layout.groundY)
      // thân ong cao nhất khoảng 38 dưới tâm, hoa to nhất cao FLOWER_RADIUS trên tâm hoa: còn hở
      expect(layout.beeY + 38).toBeLessThan(layout.flowerY - FLOWER_RADIUS)
      // râu ong (khoảng 64 trên tâm) vẫn nằm trong khung vườn
      expect(layout.beeY - 64).toBeGreaterThanOrEqual(layout.gardenY)
      expect(GARDEN_LEFT).toBeGreaterThan(GARDEN_X)
      expect(GARDEN_RIGHT).toBeLessThan(GARDEN_X + GARDEN_WIDTH)
    }
  })
})

describe('cỡ nút theo hồ sơ độ tuổi', () => {
  it('đạt minTouchTargetPx của hồ sơ ở khung điện thoại 390px (sân co ×0,445): Mầm non 64px, lớp 1–2 56px, lớp 3–5 48px', () => {
    for (const band of ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'] as const) {
      const px = touchSizeForBand(band) * PHONE_STAGE_SCALE
      expect(px, band).toBeGreaterThanOrEqual(AGE_PROFILES[band].minTouchTargetPx)
      expect(px, band).toBeLessThan(AGE_PROFILES[band].minTouchTargetPx + 1) // sát, không phình thừa
    }
    expect(touchSizeForBand('PRESCHOOL')).toBe(144)
    expect(touchSizeForBand('GRADE_1_2')).toBe(126)
    expect(touchSizeForBand('GRADE_3_5')).toBe(108)
  })
  it('nhóm tuổi nhỏ hơn thì nút không nhỏ hơn', () => {
    expect(touchSizeForBand('PRESCHOOL')).toBeGreaterThan(touchSizeForBand('GRADE_1_2'))
    expect(touchSizeForBand('GRADE_1_2')).toBeGreaterThan(touchSizeForBand('GRADE_3_5'))
  })
  it('mọi cỡ nút theo nhóm tuổi vẫn xếp được hàng điều khiển đầy đủ trong sân 800 không đè nhau', () => {
    for (const band of ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'] as const) {
      const c = computeGardenLayout({ hasAudio: true, questionHeight: 40, showConfirm: true, touchSize: touchSizeForBand(band) }).controls!
      expect(c.minusX, band).toBeGreaterThanOrEqual(0)
      expect(c.goX! + GO_BUTTON_WIDTH, band).toBeLessThanOrEqual(800)
    }
  })
})

describe('ong ở hai đầu hàng hoa', () => {
  it('cánh ong (đã thu 0,9) nằm TRỌN trong khung cảnh ở hoa đầu và hoa cuối, cách mép ít nhất BEE_EDGE_MARGIN', () => {
    const reach = BEE_HALF_WIDTH * BEE_SCALE
    expect(GARDEN_LEFT - reach).toBeGreaterThanOrEqual(GARDEN_X + BEE_EDGE_MARGIN)
    expect(GARDEN_RIGHT + reach).toBeLessThanOrEqual(GARDEN_X + GARDEN_WIDTH - BEE_EDGE_MARGIN)
  })
  it('đối xứng: lề trái bằng lề phải; ong thu nhỏ nhưng vùng chạm hữu hiệu vẫn 72 (bù tỉ lệ)', () => {
    expect(GARDEN_LEFT - GARDEN_X).toBe(GARDEN_X + GARDEN_WIDTH - GARDEN_RIGHT)
    expect(BEE_SCALE).toBeLessThan(1)
    expect((BEE_HIT_RADIUS / BEE_SCALE) * BEE_SCALE).toBeCloseTo(72, 8)
  })
  it('trục số vẫn ĐỀU và THẲNG: khoảng cách giữa các hoa bằng nhau ở mọi số vạch', () => {
    for (let ticks = 2; ticks <= 21; ticks += 1) {
      const step = (GARDEN_RIGHT - GARDEN_LEFT) / (ticks - 1)
      const xs = Array.from({ length: ticks }, (_, i) => GARDEN_LEFT + i * step)
      for (let i = 1; i < xs.length; i += 1) expect(xs[i] - xs[i - 1]).toBeCloseTo(step, 9)
      expect(xs[0]).toBe(GARDEN_LEFT)
      expect(xs[xs.length - 1]).toBeCloseTo(GARDEN_RIGHT, 9)
    }
  })
})

describe('hoa', () => {
  it('petalColor lặp theo bảng màu kể cả chỉ số âm; không có màu đỏ gắt trong bảng', () => {
    expect(petalColor(0)).toBe(PETAL_COLORS[0])
    expect(petalColor(PETAL_COLORS.length)).toBe(PETAL_COLORS[0])
    expect(petalColor(-1)).toBe(PETAL_COLORS[PETAL_COLORS.length - 1])
    expect(PETAL_COLORS.map((color) => color.toUpperCase())).not.toContain('#FF0000')
    expect(PETAL_COLORS).toHaveLength(6)
  })

  it('flowerScale: tối đa 1, tối thiểu 0,5, không tăng khi thêm vạch; 2 vạch thì 1; số vạch lạ thì 1', () => {
    expect(flowerScale(2)).toBe(1)
    expect(flowerScale(Number.NaN)).toBe(1)
    expect(flowerScale(1)).toBe(1)
    let previous = flowerScale(2)
    for (let ticks = 3; ticks <= 21; ticks += 1) {
      const scale = flowerScale(ticks)
      expect(scale).toBeLessThanOrEqual(previous)
      expect(scale).toBeGreaterThanOrEqual(0.5)
      expect(scale).toBeLessThanOrEqual(1)
      previous = scale
    }
    expect(flowerScale(21)).toBe(0.5)
  })

  it('nhụy hai hoa kề nhau không đè nhau ở mọi số vạch (khoảng cách tâm lớn hơn tổng bán kính nhụy)', () => {
    for (let ticks = 2; ticks <= 21; ticks += 1) {
      const spacing = (GARDEN_RIGHT - GARDEN_LEFT) / (ticks - 1)
      const scale = flowerScale(ticks)
      expect(spacing).toBeGreaterThan(2 * FLOWER_CENTER_RADIUS * scale)
    }
  })
})

describe('chuyển động', () => {
  const samples = Array.from({ length: 200 }, (_, i) => i * 0.05)

  it('beeBob dao động trong ±6 và chạm cả hai phía', () => {
    const values = samples.map(beeBob)
    expect(Math.max(...values)).toBeLessThanOrEqual(6)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-6)
    expect(Math.max(...values)).toBeGreaterThan(5)
    expect(Math.min(...values)).toBeLessThan(-5)
  })

  it('wingScale nằm trong [0,72, 1] và thật sự thay đổi', () => {
    const values = samples.map(wingScale)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.72)
    expect(Math.max(...values)).toBeLessThanOrEqual(1)
    expect(new Set(values.map((v) => v.toFixed(3))).size).toBeGreaterThan(10)
  })

  it('pulse quanh 1 trong ±0,12; easeOutCubic kẹp [0,1], tăng dần, 0→0, 1→1', () => {
    expect(Math.max(...samples.map(pulse))).toBeLessThanOrEqual(1.12)
    expect(Math.min(...samples.map(pulse))).toBeGreaterThanOrEqual(0.88)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
    expect(easeOutCubic(0.3)).toBeLessThan(easeOutCubic(0.6))
  })

  it('happyHop: chỉ đi lên (≤ 0), giảm dần, 0 trước khi trả lời và sau khi hết thời gian; không quá 34 đơn vị', () => {
    expect(happyHop(-1)).toBe(0)
    expect(happyHop(Number.NaN)).toBe(0)
    expect(happyHop(HAPPY_SECONDS)).toBe(0)
    expect(happyHop(HAPPY_SECONDS + 5)).toBe(0)
    const values = Array.from({ length: 100 }, (_, i) => happyHop((i / 100) * HAPPY_SECONDS))
    expect(Math.max(...values)).toBeLessThanOrEqual(0)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-34)
    expect(Math.min(...values)).toBeLessThan(-10)
    // biên độ giảm dần theo thời gian
    const early = Math.min(...values.slice(0, 30))
    const late = Math.min(...values.slice(70))
    expect(Math.abs(late)).toBeLessThan(Math.abs(early))
  })

  it('happySpin: 0 → gần 360 rồi về 0 đúng lúc hết thời gian xoay; không âm', () => {
    expect(happySpin(-0.1)).toBe(0)
    expect(happySpin(0)).toBe(0)
    expect(happySpin(SPIN_SECONDS - 0.001)).toBeGreaterThan(359)
    expect(happySpin(SPIN_SECONDS - 0.001)).toBeLessThanOrEqual(360)
    for (const since of [0.1, 0.3, 0.5, 0.9]) expect(happySpin(since)).toBeLessThanOrEqual(360)
    expect(happySpin(SPIN_SECONDS)).toBe(0)
    expect(happySpin(Number.NaN)).toBe(0)
    expect(happySpin(0.2)).toBeLessThan(happySpin(0.6))
  })

  it('oopsShake: biên độ tối đa 9 độ (nhẹ), tắt dần về 0, 0 ngoài thời gian', () => {
    const values = Array.from({ length: 200 }, (_, i) => oopsShake((i / 200) * OOPS_SECONDS))
    expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(9)
    expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(3)
    expect(oopsShake(-1)).toBe(0)
    expect(oopsShake(OOPS_SECONDS)).toBe(0)
    expect(oopsShake(Number.NaN)).toBe(0)
    expect(Math.max(...values.slice(150).map(Math.abs))).toBeLessThan(Math.max(...values.slice(0, 50).map(Math.abs)))
  })

  it('beeMood: chưa có kết quả/chưa trả lời → idle; đúng → happy; sai → oops một lúc rồi idle', () => {
    expect(beeMood(null, 5)).toBe('idle')
    expect(beeMood({ isCorrect: true }, -1)).toBe('idle')
    expect(beeMood({ isCorrect: true }, 0)).toBe('happy')
    expect(beeMood({ isCorrect: true }, 99)).toBe('happy')
    expect(beeMood({ isCorrect: false }, 0)).toBe('oops')
    expect(beeMood({ isCorrect: false }, OOPS_SECONDS + 0.9)).toBe('oops')
    expect(beeMood({ isCorrect: false }, OOPS_SECONDS + 1)).toBe('idle')
    expect(beeMood({ isCorrect: false }, 99)).toBe('idle')
    expect(beeMood({ isCorrect: false }, Number.NaN)).toBe('idle')
  })
})

describe('hoa giấy', () => {
  it('seededRandom: cùng hạt giống cho cùng dãy, khác hạt giống thì khác, luôn trong [0, 1)', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const c = seededRandom(43)
    const sequenceA = Array.from({ length: 50 }, () => a())
    const sequenceB = Array.from({ length: 50 }, () => b())
    const sequenceC = Array.from({ length: 50 }, () => c())
    expect(sequenceA).toEqual(sequenceB)
    expect(sequenceA).not.toEqual(sequenceC)
    for (const value of sequenceA) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('makeConfetti: đúng số hạt, tất định, kẹp 0..40, số lạ thì 0; kích cỡ và màu hợp lệ; có hạt bay lên và bay xuống', () => {
    const particles = makeConfetti(7, 18)
    expect(particles).toHaveLength(18)
    expect(makeConfetti(7, 18)).toEqual(particles)
    expect(makeConfetti(8, 18)).not.toEqual(particles)
    expect(makeConfetti(1, 1000)).toHaveLength(40)
    expect(makeConfetti(1, -3)).toHaveLength(0)
    expect(makeConfetti(1, Number.NaN)).toHaveLength(0)
    expect(makeConfetti(1, 2.9)).toHaveLength(2)
    for (const particle of particles) {
      expect(particle.size).toBeGreaterThanOrEqual(9)
      expect(particle.size).toBeLessThanOrEqual(17)
      expect(CONFETTI_COLORS).toContain(particle.color)
    }
    expect(particles.some((p) => p.vy < 0)).toBe(true)
    expect(particles.some((p) => p.vx < 0)).toBe(true)
    expect(particles.some((p) => p.vx > 0)).toBe(true)
  })

  it('confettiPose: bắt đầu tại ong (0,0) hoàn toàn rõ, mờ dần đến hết, ngoài thời gian thì opacity 0; rơi xuống theo trọng lực', () => {
    const [particle] = makeConfetti(3, 1)
    const start = confettiPose(particle, 0)
    expect(start.x).toBeCloseTo(0, 10)
    expect(start.y).toBeCloseTo(0, 10)
    expect(start.rotation).toBeCloseTo(0, 10)
    expect(start.opacity).toBe(1)
    expect(confettiPose(particle, -0.1).opacity).toBe(0)
    expect(confettiPose(particle, Number.NaN).opacity).toBe(0)
    expect(confettiPose(particle, CONFETTI_SECONDS).opacity).toBe(0)
    expect(confettiPose(particle, CONFETTI_SECONDS + 3).opacity).toBe(0)
    // ngoài thời gian hiệu ứng: không còn vị trí, không còn xoay (hạt không bay tiếp ra xa)
    for (const since of [CONFETTI_SECONDS, CONFETTI_SECONDS + 3, 100]) expect(confettiPose(particle, since)).toEqual({ x: 0, y: 0, rotation: 0, opacity: 0 })
    const mid = confettiPose(particle, CONFETTI_SECONDS / 2)
    expect(mid.opacity).toBeGreaterThan(0)
    expect(mid.opacity).toBeLessThan(1)
    expect(confettiPose(particle, 1.7).opacity).toBeLessThan(confettiPose(particle, 0.5).opacity)
    // y = vy t + 0,5 g t²: hạt không có vận tốc dọc vẫn rơi xuống
    const still = { ...particle, vx: 0, vy: 0, spin: 0 }
    expect(confettiPose(still, 1).y).toBeCloseTo(260, 5)
    expect(confettiPose(still, 1).x).toBe(0)
  })
})

describe('cách chơi theo nhóm tuổi', () => {
  it('Mầm non chạm là chấm (tap); các nhóm còn lại giữ cách cũ (confirm); mặc định là confirm', () => {
    expect(interactionModeForBand('PRESCHOOL')).toBe('tap')
    expect(interactionModeForBand('GRADE_1_2')).toBe('confirm')
    expect(interactionModeForBand('GRADE_3_5')).toBe('confirm')
    expect(DEFAULT_INTERACTION_MODE).toBe('confirm')
  })
})

describe('chuyến bay', () => {
  it('pathValues đi từng vạch, không gồm điểm xuất phát, gồm điểm đích, cả hai chiều và mọi bước nhảy', () => {
    expect(pathValues(0, 3, 1)).toEqual([1, 2, 3])
    expect(pathValues(7, 4, 1)).toEqual([6, 5, 4])
    expect(pathValues(0, 10, 2)).toEqual([2, 4, 6, 8, 10])
    expect(pathValues(10, 0, 5)).toEqual([5, 0])
    expect(pathValues(5, 6, 1)).toEqual([6])
  })

  it('pathValues rỗng khi cùng chỗ hoặc dữ liệu lạ; lệch vạch thì dừng ở vạch cuối không vượt qua đích', () => {
    expect(pathValues(4, 4, 1)).toEqual([])
    expect(pathValues(Number.NaN, 4, 1)).toEqual([])
    expect(pathValues(0, Number.POSITIVE_INFINITY, 1)).toEqual([])
    expect(pathValues(0, 4, 0)).toEqual([])
    expect(pathValues(0, 4, -1)).toEqual([])
    expect(pathValues(0, 4, 1.5)).toEqual([])
    expect(pathValues(0, 5, 2)).toEqual([2, 4])
  })

  it('hopSeconds: bước gần thì 0,26 giây; bay xa thì ngắn lại để cả chuyến ≤ ~1,6 giây nhưng không dưới 0,12; dữ liệu lạ thì 0,26', () => {
    expect(hopSeconds(1)).toBe(0.26)
    expect(hopSeconds(3)).toBe(0.26)
    expect(hopSeconds(10)).toBeCloseTo(0.16, 5)
    expect(hopSeconds(20)).toBe(0.12)
    expect(hopSeconds(100)).toBe(0.12)
    expect(hopSeconds(Number.NaN)).toBe(0.26)
    expect(hopSeconds(0)).toBe(0.26)
    for (let hops = 1; hops <= 10; hops += 1) expect(hopSeconds(hops) * hops).toBeLessThanOrEqual(1.6 + 1e-9)
    expect(HOP_ARC).toBeGreaterThan(0)
    expect(BOUNCE_PEAK).toBeGreaterThan(1)
  })
})

describe('chiều sâu cảnh: mây thị sai, bụi cây, vầng sáng mặt trời', () => {
  it('mây theo lớp: càng xa càng nhỏ, mờ, trôi chậm và hẹp (thị sai); mọi mây trôi hết biên độ vẫn nằm trong khung ngang', () => {
    const byScale = [...GARDEN_CLOUDS].sort((a, b) => a.scale - b.scale)
    for (let i = 1; i < byScale.length; i += 1) {
      expect(byScale[i].speed).toBeGreaterThan(byScale[i - 1].speed)
      expect(byScale[i].amplitude).toBeGreaterThan(byScale[i - 1].amplitude)
      expect(byScale[i].opacity).toBeGreaterThanOrEqual(byScale[i - 1].opacity)
    }
    for (const cloud of GARDEN_CLOUDS) {
      expect(cloud.speed, 'trôi chậm, không vượt 0,4 rad/s').toBeLessThanOrEqual(0.4)
      const half = 54 * cloud.scale
      expect(cloud.x - cloud.amplitude - half).toBeGreaterThanOrEqual(0)
      expect(cloud.x + cloud.amplitude + half).toBeLessThanOrEqual(GARDEN_WIDTH - 130) // chừa chỗ mặt trời ở góc phải
    }
  })

  it('bụi cây tiền cảnh KHÔNG che hoa và chữ số: cao tối đa thấp hơn đáy bông hoa kể cả lúc nở to; nằm trọn trong khung ngang', () => {
    const lowestPetalFromBottom = FLOWER_HEAD_FROM_BOTTOM - FLOWER_RADIUS * 1.5
    expect(BUSH_MAX_HEIGHT).toBeLessThan(lowestPetalFromBottom)
    for (const bush of GARDEN_BUSHES) {
      expect(bush.height).toBeLessThanOrEqual(BUSH_MAX_HEIGHT)
      expect(bush.x).toBeGreaterThanOrEqual(0)
      expect(bush.x).toBeLessThanOrEqual(GARDEN_WIDTH)
    }
  })

  it('vầng sáng mặt trời thở chậm quanh 1: tỉ lệ 0,94 đến 1,06 và độ đục 0,45 đến 0,65', () => {
    const times = Array.from({ length: 200 }, (_, i) => i * 0.1)
    expect(Math.min(...times.map(sunGlowScale))).toBeGreaterThanOrEqual(0.94 - 1e-9)
    expect(Math.max(...times.map(sunGlowScale))).toBeLessThanOrEqual(1.06 + 1e-9)
    expect(Math.min(...times.map(sunGlowOpacity))).toBeGreaterThanOrEqual(0.45 - 1e-9)
    expect(Math.max(...times.map(sunGlowOpacity))).toBeLessThanOrEqual(0.65 + 1e-9)
  })
})

describe('vòng 2: hàng tiến độ trong cảnh, trần độ cao của ong, khung màn bắt đầu/kết thúc', () => {
  const base = { hasAudio: true, questionHeight: 40, showConfirm: true }
  const bands = ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'] as const

  it('hàng tiến độ nằm TRONG cảnh ở trên cùng, thẳng hàng hai mép với hàng đề bài, và hàng đề bài nằm dưới nó', () => {
    for (const band of bands) {
      const layout = computeGardenLayout({ ...base, hasBadge: band === 'PRESCHOOL', touchSize: touchSizeForBand(band) })
      const [px, py, pw, ph] = layout.progress
      expect(py).toBeGreaterThanOrEqual(layout.gardenY)
      expect(py + ph).toBeLessThanOrEqual(layout.hudRow[1])
      expect(px).toBe(layout.hudRow[0])
      expect(pw).toBe(layout.hudRow[2])
      expect(px + pw).toBeLessThanOrEqual(GARDEN_X + GARDEN_WIDTH)
      // bảng gỗ treo từ đáy thanh tiến độ: dây có độ dài dương
      expect(layout.sign[1]).toBeGreaterThan(py + ph)
    }
  })

  it('ong luôn nằm DƯỚI hàng đề bài: ở độ cao nghỉ, ở đỉnh cung bay và ở đỉnh nhảy cẫng (cả khi nhún, cả khi vươn lúc cất cánh) với mọi nhóm tuổi', () => {
    for (const band of bands) {
      for (const hasBadge of [false, true]) {
        for (const showControls of [false, true]) {
          const layout = computeGardenLayout({ ...base, hasBadge, showControls, touchSize: touchSizeForBand(band) })
          const hudBottom = layout.hudRow[1] + layout.hudRow[3]
          expect(layout.beeMaxLift).toBeGreaterThanOrEqual(0)
          expect(layout.beeCeilingY).toBeGreaterThan(hudBottom)
          const topAt = (lift: number) => layout.beeY - lift - BEE_BOB_AMPLITUDE - BEE_TOP_EXTENT
          expect(topAt(0), 'nghỉ').toBeGreaterThanOrEqual(layout.beeCeilingY - 1e-9)
          expect(topAt(hopArcFor(layout.beeMaxLift)), 'đỉnh cung bay').toBeGreaterThanOrEqual(layout.beeCeilingY - 1e-9)
          let peak = 0
          for (let t = 0; t < HAPPY_SECONDS; t += 0.01) peak = Math.min(peak, happyHop(t, layout.beeMaxLift))
          expect(topAt(-peak), 'đỉnh nhảy cẫng').toBeGreaterThanOrEqual(layout.beeCeilingY - 1e-9)
          expect(layout.beeY).toBe(layout.flowerY - BEE_ABOVE_FLOWER)
        }
      }
    }
  })

  it('nhóm tuổi nhỏ (nút nghe lại to) có ít chỗ nâng hơn nhóm lớn; cung bay và nhảy cẫng không vượt giá trị gốc', () => {
    const lift = (band: (typeof bands)[number]) => computeGardenLayout({ ...base, touchSize: touchSizeForBand(band) }).beeMaxLift
    expect(lift('PRESCHOOL')).toBeLessThan(lift('GRADE_3_5'))
    expect(hopArcFor(1000)).toBe(HOP_ARC)
    expect(hopArcFor(12)).toBe(12)
    expect(hopArcFor(-5)).toBe(0)
    expect(happyHop(0.3, 1000)).toBe(happyHop(0.3)) // vượt trần gốc thì dùng chiều cao gốc
    expect(Math.abs(happyHop(0.3, 5))).toBeLessThanOrEqual(5)
    expect(Math.abs(happyHop(0.3, 0))).toBe(0)
  })

  it('mặt trời nằm dưới hàng đề bài và trên hàng hoa (quầng sáng mờ dần, tia không chạm nút nghe lại)', () => {
    const layout = computeGardenLayout({ ...base, hasBadge: true, touchSize: touchSizeForBand('PRESCHOOL') })
    const hudBottomLocal = layout.hudRow[1] + layout.hudRow[3] - layout.gardenY
    expect(SUN_Y - 64).toBeGreaterThanOrEqual(hudBottomLocal) // tia trên cùng
    expect(SUN_Y + 64).toBeLessThanOrEqual(layout.flowerY - layout.gardenY - FLOWER_RADIUS + 1) // tia dưới cùng vừa tới ngọn cánh
    expect(SUN_X + 64).toBeLessThanOrEqual(GARDEN_WIDTH)
    expect(SUN_GLOW_RADIUS).toBeLessThan(104) // nhỏ hơn quầng cũ
  })

  it('mây nằm dưới hàng đề bài và trên ngọn hoa', () => {
    const layout = computeGardenLayout({ ...base, hasBadge: true, touchSize: touchSizeForBand('PRESCHOOL') })
    const hudBottomLocal = layout.hudRow[1] + layout.hudRow[3] - layout.gardenY
    const petalTopLocal = layout.flowerY - layout.gardenY - FLOWER_RADIUS
    for (const cloud of GARDEN_CLOUDS) {
      expect(cloud.y - 38 * cloud.scale).toBeGreaterThanOrEqual(hudBottomLocal - 30) // có thể lấp ló sau huy hiệu, không xuống tận bảng
      expect(cloud.y + 30 * cloud.scale).toBeLessThanOrEqual(petalTopLocal)
    }
  })

  it('độ mờ của vật trang trí khi ong tới gần: ≥ 0,2, tăng đơn điệu theo khoảng cách, đủ rõ khi xa', () => {
    expect(decorFade(0)).toBe(DECOR_FADE_MIN)
    expect(decorFade(DECOR_FADE_NEAR)).toBe(DECOR_FADE_MIN)
    expect(decorFade(DECOR_FADE_FAR)).toBe(1)
    expect(decorFade(10_000)).toBe(1)
    let previous = 0
    for (let d = 0; d <= 200; d += 5) {
      const fade = decorFade(d)
      expect(fade).toBeGreaterThanOrEqual(previous)
      expect(fade).toBeGreaterThanOrEqual(DECOR_FADE_MIN)
      expect(fade).toBeLessThanOrEqual(1)
      previous = fade
    }
    expect(decorFade(Number.NaN)).toBe(1)
  })

  it('màn bắt đầu và kết thúc khớp khung cảnh: lề bằng lề cảnh trong sân, tỉ lệ rộng : cao bằng khung', () => {
    expect(FRAME_INSET_PERCENT).toBeCloseTo((GARDEN_X / 800) * 100, 8)
    expect(FRAME_ASPECT).toBeCloseTo(GARDEN_WIDTH / SCENE_HEIGHT, 8)
    expect(FRAME_INSET_PERCENT * 2 + (GARDEN_WIDTH / 800) * 100).toBeCloseTo(100, 6) // lề trái + khung + lề phải = cả bề rộng
  })
})

describe('camera nhẹ (thị sai)', () => {
  it('parallaxOffset: ong ở giữa 0, mép trái +1 (lớp nền trượt sang phải), mép phải -1; kẹp ngoài mép; giá trị lạ là 0', () => {
    const mid = (GARDEN_LEFT + GARDEN_RIGHT) / 2
    expect(parallaxOffset(mid)).toBeCloseTo(0, 10)
    expect(parallaxOffset(GARDEN_LEFT)).toBeCloseTo(1, 10)
    expect(parallaxOffset(GARDEN_RIGHT)).toBeCloseTo(-1, 10)
    expect(parallaxOffset(-500)).toBe(1)
    expect(parallaxOffset(5000)).toBe(-1)
    expect(parallaxOffset(Number.NaN)).toBe(0)
    expect(parallaxOffset(GARDEN_LEFT + 100)).toBeGreaterThan(parallaxOffset(GARDEN_LEFT + 200)) // đơn điệu giảm theo vị trí ong
  })
  it('hệ số lớp: rất nhỏ (≤ 10 đơn vị, không lộ mép), lớp gần trượt nhiều hơn lớp xa, tiền cảnh trượt ngược chiều nền', () => {
    for (const value of Object.values(PARALLAX)) expect(Math.abs(value)).toBeLessThanOrEqual(10)
    expect(Math.abs(PARALLAX.backHill)).toBeGreaterThan(Math.abs(PARALLAX.farHill))
    expect(Math.abs(PARALLAX.frontHill)).toBeGreaterThanOrEqual(Math.abs(PARALLAX.backHill))
    expect(Math.sign(PARALLAX.frontHill)).toBe(-Math.sign(PARALLAX.backHill))
    for (const k of Object.values(PARALLAX)) expect(Math.abs(k)).toBeLessThanOrEqual(HILL_PAD) // đồi vẽ rộng thêm HILL_PAD nên dịch tối đa vẫn che kín mép
  })
})
