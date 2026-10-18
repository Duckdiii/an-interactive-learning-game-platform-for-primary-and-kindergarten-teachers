import { fishUri, oceanBackdropUri, waveUri } from '../art/oceanArt'
import type { ThemeManifest } from '../themeTypes'

/**
 * Chủ đề Đại dương: nền xanh biển nhạt có bong bóng, thẻ trắng chữ xanh đậm, nút xanh ngọc, hình cá và sóng tự vẽ bằng SVG.
 * Màu "đúng" là xanh bạc hà, "thử lại" là vàng; không dùng đỏ. Font vẫn là Arial.
 */
export const oceanTheme: ThemeManifest = {
  id: 'ocean',
  name: 'Đại dương',
  ageBands: ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'],
  paintStageBackground: true,
  backdropAssetId: 'backdrop',
  colors: {
    background: '#CFFAFE',
    onBackground: '#0C4A6E',
    surface: '#FFFFFF',
    surfaceSelected: '#BAE6FD',
    surfaceCorrect: '#A7F3D0',
    surfaceTryAgain: '#FEF08A',
    text: '#0C4A6E',
    border: '#0369A1',
    accent: '#0E7490',
    accentBorder: '#164E63',
    onAccent: '#FFFFFF',
    disabledSurface: '#E0F2FE',
    disabledBorder: '#BAE6FD',
    onDisabled: '#5B8DB0',
    audioSurface: '#99F6E4',
    audioBorder: '#0F766E',
    lineCorrect: '#047857',
    lineTryAgain: '#B45309',
    linkColors: ['#0369A1', '#6D28D9', '#BE185D', '#0F766E', '#B45309', '#475569'],
  },
  font: { family: 'Arial', baseSize: 26 },
  compatibleMechanics: ['QUIZ', 'MATCHING', 'NUMBER_LINE', 'SYLLABLE_BUILDER', 'PREPOSITION_SCENE'],
  contentSafety: { noViolence: true },
  assets: [
    { id: 'backdrop', kind: 'svg', src: oceanBackdropUri(), alt: 'Họa tiết bong bóng và sóng' },
    { id: 'fish', kind: 'svg', src: fishUri(), alt: 'Con cá' },
    { id: 'wave', kind: 'svg', src: waveUri(), alt: 'Dải sóng biển' },
  ],
}
