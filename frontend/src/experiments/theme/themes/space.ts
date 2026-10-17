import { planetUri, rocketUri, spaceBackdropUri } from '../art/spaceArt'
import type { ThemeManifest } from '../themeTypes'

/**
 * Chủ đề Vũ trụ: nền xanh đêm có sao, thẻ sáng chữ tối (chữ trên thẻ luôn dễ đọc), nút tím, hình hành tinh và tên lửa
 * tự vẽ bằng SVG. Màu "đúng" là xanh lá, "thử lại" là vàng; không dùng đỏ. Font vẫn là Arial (đổi font cần đo chữ theo font).
 */
export const spaceTheme: ThemeManifest = {
  id: 'space',
  name: 'Vũ trụ',
  ageBands: ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'],
  paintStageBackground: true,
  backdropAssetId: 'backdrop',
  colors: {
    background: '#0B1026',
    onBackground: '#F8FAFC',
    surface: '#EEF2FF',
    surfaceSelected: '#C7D2FE',
    surfaceCorrect: '#BBF7D0',
    surfaceTryAgain: '#FDE68A',
    text: '#1E1B4B',
    border: '#A5B4FC',
    accent: '#6D28D9',
    accentBorder: '#C4B5FD',
    onAccent: '#FFFFFF',
    disabledSurface: '#312E81',
    disabledBorder: '#4338CA',
    onDisabled: '#A5B4FC',
    audioSurface: '#E0E7FF',
    audioBorder: '#818CF8',
    lineCorrect: '#34D399',
    lineTryAgain: '#FBBF24',
    linkColors: ['#60A5FA', '#C084FC', '#F472B6', '#22D3EE', '#FB923C', '#E2E8F0'],
  },
  font: { family: 'Arial', baseSize: 26 },
  compatibleMechanics: ['QUIZ', 'MATCHING'],
  contentSafety: { noViolence: true },
  assets: [
    { id: 'backdrop', kind: 'svg', src: spaceBackdropUri(), alt: 'Họa tiết sao lấp lánh' },
    { id: 'planet', kind: 'svg', src: planetUri(), alt: 'Hành tinh có vành đai' },
    { id: 'rocket', kind: 'svg', src: rocketUri(), alt: 'Tên lửa' },
  ],
}
