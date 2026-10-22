import type { ThemeManifest } from '../../../theme/themeTypes'

/**
 * Theme của trò «Vườn hoa»: màu giao diện (nút, khung đề, thanh tiến độ) và font Nunito bo tròn (tự host, xem `src/assets/ASSETS.md`).
 * CẢNH (trời, đồi, ong, hoa) vẫn dùng `GARDEN_COLORS`: theme chỉ chi phối phần giao diện bao quanh, nên các theme khác (Đại dương, Vũ trụ...)
 * đổi được màu nút và khung mà không phải vẽ lại cảnh.
 *
 * Vai trò dùng trong trò (xem `gardenUi.ts`): nút chính («Xong rồi!», «Câu tiếp theo») = `accent`; nút phụ (mũi tên, «Thử lại») = `surfaceSelected`
 * viền `border`; nút «Nghe lại» = `audioSurface`; khung đề và ô số = `surface` viền `border`; nút khóa = `disabled*`.
 */
export const beeGardenTheme: ThemeManifest = {
  id: 'bee-garden',
  name: 'Vườn hoa',
  ageBands: ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'],
  paintStageBackground: false,
  colors: {
    background: '#EAF9FF',
    onBackground: '#1F2A44',
    surface: '#FFFFFF',
    surfaceSelected: '#DFF1FF',
    surfaceCorrect: '#9BF0A8',
    surfaceTryAgain: '#FFE27A',
    text: '#1F2A44',
    border: '#2E8BC9',
    accent: '#FF9F1C',
    accentBorder: '#C77700',
    onAccent: '#3A2200',
    disabledSurface: '#E3E8EF',
    disabledBorder: '#BCC6D3',
    onDisabled: '#5B6675',
    audioSurface: '#BFE3FF',
    audioBorder: '#2078BE',
    lineCorrect: '#2E9E4F',
    lineTryAgain: '#B7791F',
    linkColors: ['#2078BE', '#6D28D9', '#BE185D', '#0F766E', '#B45309', '#475569'],
  },
  font: { family: 'Nunito', baseSize: 26 },
  compatibleMechanics: ['NUMBER_LINE'],
  contentSafety: { noViolence: true },
  assets: [],
  // Bảng đề bài là bảng gỗ nhạt (chữ nâu đậm), huy hiệu số là giọt mật ong vàng (chữ nâu đậm): chữ luôn đạt tương phản trên mặt của nó.
  hud: {
    signFace: '#F6D9A8',
    signBorder: '#9A6A35',
    signInk: '#3B2410',
    badgeFace: '#FFD43B',
    badgeBorder: '#C98A00',
    badgeInk: '#3A2200',
  },
  // Quy tắc nét viền: giao diện dày 4 có bóng nổi 6; cảnh mảnh 2, không bóng.
  strokes: { ui: 4, uiShadow: 6, scene: 2 },
  // Vật trang trí lấy từ bộ Fluent Emoji qua resolveImage. Bầu trời (y ≤ 0,4: dưới hàng đề bài, trên hàng hoa) ở trên hàng hoa, mặt cỏ (y ≥ 0,8 trong dải cỏ sát đáy, cỡ ≤ 40) ở dưới hàng hoa:
  // cả hai ngoài tầng chữ số, theme khác thay danh sách này là đổi cảnh mà không sửa component.
  // Ít vật hơn và có độ sâu (`depth`: 0 xa, 1 gần): vật xa nhỏ, nhạt; vật gần to, đậm và có bóng dưới chân. Chim đỏ thẫm đã bỏ; bồ câu trắng chìm vào mây nên đổi thành vẹt nhiều màu (hồng, cam, xanh). Vật ở trời nằm trong dải hẹp giữa bảng và ong, nên tự mờ khi ong tới gần.
  decorations: [
    { keyword: 'bướm', layer: 'sky', x: 0.22, y: 0.39, size: 44, motion: 'float', amplitude: 4, speed: 0.9, phase: 0, depth: 0.9, reaction: 'flutter' },
    { keyword: 'bướm', layer: 'sky', x: 0.62, y: 0.39, size: 40, motion: 'float', amplitude: 4, speed: 1.1, phase: 2, depth: 0.5, reaction: 'flutter' },
    { keyword: 'vẹt', layer: 'sky', x: 0.42, y: 0.385, size: 44, motion: 'drift', amplitude: 14, speed: 0.35, phase: 1, depth: 0.6, reaction: 'hop' },
    { keyword: 'nấm', layer: 'ground', x: 0.9, y: 0.9, size: 40, motion: 'sway', amplitude: 4, speed: 1, phase: 0.5, depth: 1, reaction: 'boing' },
    { keyword: 'bọ rùa', layer: 'ground', x: 0.12, y: 0.95, size: 36, motion: 'drift', amplitude: 8, speed: 0.4, phase: 0, depth: 0.8, reaction: 'wiggle' },
    { keyword: 'ốc sên', layer: 'ground', x: 0.52, y: 0.9, size: 40, motion: 'drift', amplitude: 12, speed: 0.25, phase: 1, depth: 0.6, reaction: 'boing' },
  ],

  // Biến thể thời điểm trong ngày (mặc định «sáng»; chọn bằng tham số `timeOfDay` của renderer). Dữ liệu thuần: theme khác tự khai báo.
  // Lớp phủ chỉ phủ trời, mây và đồi; hoa, số trên hoa và chú ong không bị phủ nên luôn đủ tương phản (test kiểm viền/thân ong với màu trời của từng biến thể).
  ambience: {
    default: 'morning',
    variants: {
      morning: {
        label: 'Sáng',
        sky: ['#8FD4FF', '#EAF9FF'],
        tint: { color: '#FFFFFF', opacity: 0 },
        celestial: 'sun',
        celestialDrop: 0,
        beams: true,
        pollen: 12,
        stars: 0,
        fireflies: 0,
        cloud: { color: '#FFFFFF', opacity: 1 },
      },
      sunset: {
        label: 'Hoàng hôn',
        sky: ['#9A88CC', '#FFC38A'],
        tint: { color: '#FF8A4D', opacity: 0.16 },
        celestial: 'sun',
        celestialDrop: 40,
        beams: true,
        pollen: 8,
        stars: 0,
        fireflies: 0,
        cloud: { color: '#FFD3BA', opacity: 0.92 },
        decorations: [
          { keyword: 'bướm', layer: 'sky', x: 0.22, y: 0.39, size: 44, motion: 'float', amplitude: 4, speed: 0.9, phase: 0, depth: 0.9, reaction: 'flutter' },
          { keyword: 'vẹt', layer: 'sky', x: 0.42, y: 0.385, size: 44, motion: 'drift', amplitude: 14, speed: 0.35, phase: 1, depth: 0.6, reaction: 'hop' },
          { keyword: 'nấm', layer: 'ground', x: 0.9, y: 0.9, size: 40, motion: 'sway', amplitude: 4, speed: 1, phase: 0.5, depth: 1, reaction: 'boing' },
          { keyword: 'bọ rùa', layer: 'ground', x: 0.12, y: 0.95, size: 36, motion: 'drift', amplitude: 8, speed: 0.4, phase: 0, depth: 0.8, reaction: 'wiggle' },
          { keyword: 'ốc sên', layer: 'ground', x: 0.52, y: 0.9, size: 40, motion: 'drift', amplitude: 12, speed: 0.25, phase: 1, depth: 0.6, reaction: 'boing' },
        ],
      },
      night: {
        label: 'Đêm',
        sky: ['#101C4F', '#2E4C8C'],
        tint: { color: '#0B1840', opacity: 0.3 },
        celestial: 'moon',
        celestialDrop: 0,
        beams: false,
        pollen: 0,
        stars: 14,
        fireflies: 8,
        cloud: { color: '#8396C8', opacity: 0.45 },
        decorations: [
          { keyword: 'nấm', layer: 'ground', x: 0.9, y: 0.9, size: 40, motion: 'sway', amplitude: 4, speed: 1, phase: 0.5, depth: 1, reaction: 'boing' },
          { keyword: 'bọ rùa', layer: 'ground', x: 0.12, y: 0.95, size: 36, motion: 'drift', amplitude: 8, speed: 0.4, phase: 0, depth: 0.8, reaction: 'wiggle' },
          { keyword: 'ốc sên', layer: 'ground', x: 0.52, y: 0.9, size: 40, motion: 'drift', amplitude: 12, speed: 0.25, phase: 1, depth: 0.6, reaction: 'boing' },
        ],
      },
    },
  },
}