import type { ThemeManifest } from '../themeTypes'

/**
 * Theme "trung tính": tái hiện đúng giao diện hiện tại của renderer QUIZ/MATCHING, từng giá trị lấy từ mã nguồn:
 * - thẻ/đáp án: `games/matching/MatchingCard.tsx` (FILL, viền `#334155`), `games/common/OptionButton.tsx`
 * - nút «Xong rồi!»: `games/matching/MatchingConfirmButton.tsx`
 * - nút «Nghe lại»: `games/common/QuestionAudioButton.tsx`
 * - màu đường nối: `games/matching/MatchingRenderer.tsx` (LINK_COLORS, CORRECT_COLOR, WRONG_COLOR)
 * - chữ: Konva mặc định (đen, Arial), không đặt `fill`/`fontFamily` ở renderer.
 * Cố ý KHÔNG sửa cho đẹp hay đạt chuẩn hơn: đây là mốc so sánh cho các theme khác.
 *
 * Phạm vi: chỉ MÀU và họ phông. Các giá trị phi màu (độ dày viền 3/8, cỡ chữ 26/28/30/32 theo từng chỗ, chữ đậm,
 * bo góc 20) vẫn là hằng số trong renderer/bố cục và theme KHÔNG ghi đè (T1.4 giữ nguyên; cỡ chữ đổi sẽ làm lệch
 * bố cục đã được test). `font.baseSize` = 26 chỉ là cỡ chữ thẻ (`CARD_FONT_SIZE`), dùng để chọn ngưỡng chữ lớn.
 * `background` (#FFFFFF) không khớp màu nào trong renderer (sân đang trong suốt, `paintStageBackground: false`);
 * nó chỉ dùng để tính tương phản chữ/nền.
 */
export const neutralTheme: ThemeManifest = {
  id: 'neutral',
  name: 'Trung tính',
  ageBands: ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'],
  colors: {
    background: '#FFFFFF',
    onBackground: '#000000',
    surface: '#FFFFFF',
    surfaceSelected: '#DBEAFE',
    surfaceCorrect: '#A5D6A7',
    surfaceTryAgain: '#FFE082',
    text: '#000000',
    border: '#334155',
    accent: '#2563EB',
    accentBorder: '#1E40AF',
    onAccent: '#FFFFFF',
    disabledSurface: '#E2E8F0',
    disabledBorder: '#CBD5E1',
    onDisabled: '#94A3B8',
    audioSurface: '#E0F2FE',
    audioBorder: '#0284C7',
    lineCorrect: '#43A047',
    lineTryAgain: '#F59E0B',
    linkColors: ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#92400E', '#64748B'],
  },
  // Renderer hiện tại để nền sân trong suốt.
  paintStageBackground: false,
  font: { family: 'Arial', baseSize: 26 },
  // Chỉ hai renderer đã có; cơ chế thử nghiệm khai báo ở theme của chính chúng.
  compatibleMechanics: ['QUIZ', 'MATCHING'],
  contentSafety: { noViolence: true },
  assets: [],
}
