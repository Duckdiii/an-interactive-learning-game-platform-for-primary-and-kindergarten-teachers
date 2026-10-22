import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../../../theme/contrast'
import { ALL_THEMES } from '../../../theme/themes'
import { validateTheme } from '../../../theme/validateTheme'
import { beeGardenTheme } from './beeGardenTheme'
import { gardenUi, shade } from './gardenUi'

describe('beeGardenTheme', () => {
  it('đạt mọi kiểm tra của theme (tương phản chữ/nền, không đỏ gắt, an toàn nội dung...)', () => {
    expect(validateTheme(beeGardenTheme)).toEqual([])
  })
  it('font là Nunito, mã không trùng các theme có sẵn', () => {
    expect(beeGardenTheme.font.family).toBe('Nunito')
    expect(ALL_THEMES.map((theme) => theme.id)).not.toContain(beeGardenTheme.id)
  })
  it('chữ trên mọi kiểu nút (nút chính, phụ, nghe lại, khung đề) đạt tương phản ≥ 4,5:1', () => {
    const ui = gardenUi(beeGardenTheme)
    for (const [name, ink, face] of [
      ['primary', ui.primary.ink, ui.primary.face],
      ['secondary', ui.secondary.ink, ui.secondary.face],
      ['audio', ui.audio.ink, ui.audio.face],
      ['panel', ui.panel.ink, ui.panel.fill],
    ] as const) {
      expect(contrastRatio(ink, face) ?? 0, name).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('viền nút đủ tách khỏi nền sân sáng (≥ 3:1) để trẻ nhận ra nút (WCAG 1.4.11)', () => {
    const ui = gardenUi(beeGardenTheme)
    for (const [name, border] of [['primary', ui.primary.border], ['secondary', ui.secondary.border], ['audio', ui.audio.border]] as const) {
      expect(contrastRatio(border, beeGardenTheme.colors.background) ?? 0, name).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('gardenUi', () => {
  it('suy ra từ token: nút chính = accent, nút phụ = surfaceSelected, nghe lại = audioSurface, khung = surface', () => {
    const c = beeGardenTheme.colors
    const ui = gardenUi(beeGardenTheme)
    expect(ui.primary).toMatchObject({ face: c.accent, border: c.accentBorder, ink: c.onAccent })
    expect(ui.secondary).toMatchObject({ face: c.surfaceSelected, border: c.border, ink: c.text })
    expect(ui.audio).toMatchObject({ face: c.audioSurface, border: c.audioBorder, ink: c.text })
    expect(ui.panel).toEqual({ fill: c.surface, border: c.border, ink: c.text })
    expect(ui.progress.fill).toBe(c.accent)
  })
  it('nút khóa dùng token disabled* ở mọi kiểu', () => {
    const c = beeGardenTheme.colors
    for (const tone of [gardenUi(beeGardenTheme).primary, gardenUi(beeGardenTheme).secondary, gardenUi(beeGardenTheme).audio]) {
      expect(tone).toMatchObject({ faceOff: c.disabledSurface, borderOff: c.disabledBorder, inkOff: c.onDisabled })
    }
  })
  it('đổi theme thì đổi màu giao diện (không còn màu viết cứng trong nút)', () => {
    const ocean = ALL_THEMES.find((theme) => theme.id === 'ocean')!
    expect(gardenUi(ocean).primary.face).toBe(ocean.colors.accent)
    expect(gardenUi(ocean).primary.face).not.toBe(gardenUi(beeGardenTheme).primary.face)
  })
})

describe('shade', () => {
  it('làm tối theo tỉ lệ, kẹp trong [0, 1]', () => {
    expect(shade('#FF8000', 0.5)).toBe('#804000')
    expect(shade('#FFFFFF', 0)).toBe('#ffffff')
    expect(shade('#FFFFFF', 1)).toBe('#000000')
    expect(shade('#FFFFFF', 2)).toBe('#000000')
    expect(shade('#FFFFFF', -1)).toBe('#ffffff')
  })
  it('hỗ trợ #RGB; màu hỏng trả nguyên', () => {
    expect(shade('#F00', 0.5)).toBe('#800000')
    expect(shade('đỏ', 0.5)).toBe('đỏ')
    expect(shade('#12', 0.5)).toBe('#12')
  })
})

describe('token giao diện trong cảnh (hud, strokes)', () => {
  it('theme vườn khai báo hud và strokes; chữ trên bảng và huy hiệu đạt tương phản ≥ 4,5:1', () => {
    const ui = gardenUi(beeGardenTheme)
    expect(ui.hud).toEqual(beeGardenTheme.hud)
    expect(ui.strokes).toEqual({ ui: 4, uiShadow: 6, scene: 2 })
    expect(contrastRatio(ui.hud.signInk, ui.hud.signFace) ?? 0).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(ui.hud.badgeInk, ui.hud.badgeFace) ?? 0).toBeGreaterThanOrEqual(4.5)
  })
  it('quy tắc nét: viền cảnh MẢNH hơn viền giao diện; giao diện có bóng nổi, cảnh thì không có token bóng', () => {
    const { ui, uiShadow, scene } = gardenUi(beeGardenTheme).strokes
    expect(scene).toBeLessThan(ui)
    expect(uiShadow).toBeGreaterThan(0)
  })
  it('theme không khai báo: suy từ token chung (bảng = khung đề, huy hiệu = nút chính) và nét mặc định', () => {
    const ocean = ALL_THEMES.find((theme) => theme.id === 'ocean')!
    const ui = gardenUi(ocean)
    expect(ui.hud).toMatchObject({ signFace: ocean.colors.surface, signBorder: ocean.colors.border, badgeFace: ocean.colors.accent })
    expect(ui.strokes).toEqual({ ui: 4, uiShadow: 6, scene: 2 })
  })
  it('validateTheme từ chối hud sai màu hoặc chữ khó đọc, và nét viền ngoài giới hạn hoặc cảnh dày hơn giao diện', () => {
    const codes = (patch: Partial<typeof beeGardenTheme>) => validateTheme({ ...beeGardenTheme, ...patch }).map((issue) => `${issue.code}:${issue.path}`)
    const hud = beeGardenTheme.hud!
    expect(codes({ hud: { ...hud, signFace: 'đỏ' } })).toContain('HUD_INVALID:hud.signFace')
    expect(codes({ hud: { ...hud, signInk: hud.signFace } })).toContain('HUD_INVALID:hud.signInk')
    expect(codes({ hud: { ...hud, badgeInk: hud.badgeFace } })).toContain('HUD_INVALID:hud.badgeInk')
    expect(codes({ strokes: { ui: 1, uiShadow: 6, scene: 1 } })).toContain('STROKES_INVALID:strokes.ui')
    expect(codes({ strokes: { ui: 4, uiShadow: 20, scene: 2 } })).toContain('STROKES_INVALID:strokes.uiShadow')
    expect(codes({ strokes: { ui: 4, uiShadow: 6, scene: 6 } })).toContain('STROKES_INVALID:strokes.scene')
    expect(codes({ strokes: { ui: 4, uiShadow: 6, scene: 4 } })).toContain('STROKES_INVALID:strokes.scene') // không mảnh hơn
    expect(codes({ hud, strokes: { ui: 4, uiShadow: 6, scene: 2 } })).toEqual([])
  })
})
