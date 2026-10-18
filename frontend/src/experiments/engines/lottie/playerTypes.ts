import type { LottieAnimation } from './lottieAnimations'

/** Cách phát hoạt ảnh phản hồi: Lottie bằng `lottie-web` (SVG hoặc canvas), `dotlottie-web` (canvas + WASM). */
export type LottieEngine = 'lottie-svg' | 'lottie-canvas' | 'dotlottie'
export const LOTTIE_ENGINES: readonly LottieEngine[] = ['lottie-svg', 'lottie-canvas', 'dotlottie']
export const LOTTIE_ENGINE_LABEL: Record<LottieEngine, string> = {
  'lottie-svg': 'lottie-web (SVG)',
  'lottie-canvas': 'lottie-web (canvas)',
  dotlottie: 'dotlottie-web (canvas + WASM)',
}

export interface LottiePlayerProps {
  animation: LottieAnimation
  /** Tăng mỗi lần muốn phát lại từ đầu (0 = chưa phát). */
  replayKey: number
  /** Giảm chuyển động: không phát, chỉ hiện khung cuối làm hình tĩnh. */
  reducedMotion: boolean
  /** Cạnh hộp hiển thị (px). */
  size: number
  /** Phát ngay khi dựng nếu `replayKey` > 0 (lớp phủ dựng bộ phát mới cho mỗi phản hồi). Mặc định chỉ phát khi `replayKey` ĐỔI. */
  playOnMount?: boolean
  /** Gọi khi thư viện đã nạp xong hoạt ảnh (lottie-web: DOMLoaded; dotlottie: load). */
  onReady?: () => void
}

/** Tín hiệu cho bộ đo tự động (chỉ có ở bản dev hoặc `VITE_EXPERIMENTS=1`). */
export interface LottieHarness {
  engine: LottieEngine
  /** Số bộ phát đang sống (khi nhiều bản cùng lúc, mọi số liệu dưới đây là TỔNG của chúng). */
  count: number
  /** Thư viện đã nạp xong hoạt ảnh và sẵn sàng phát (lottie-web: DOMLoaded; dotlottie: load). */
  ready: () => boolean
  /** Số khung hình mà thư viện đã báo (sự kiện khung) từ lúc dựng. */
  frames: () => number
  /** Số lần đã bấm phát. */
  plays: () => number
  /** Hoạt ảnh lần phát gần nhất đã chạy hết chưa. */
  completed: () => boolean
  /** Số nút DOM mà người phát đang giữ (SVG nhiều nút; canvas chỉ một). */
  domNodes: () => number
}

declare global {
  interface Window {
    __lottieHarness?: LottieHarness
  }
}
