import type { ImageLike } from './assetLoader'

/** Cách ảnh giả phản ứng khi gán `src`: tải được, lỗi, giải mã lỗi/treo, hoặc không bao giờ xong. */
export type FakeBehavior = 'ok' | 'fail' | 'decode-fail' | 'decode-hang' | 'hang'

/**
 * Dùng trong test: jsdom không tải ảnh thật nên thay `Image` bằng bản giả theo từng `src`.
 * Không import từ mã chạy thật.
 */
export function makeImageFactory(behaviors: Record<string, FakeBehavior>, { withDecode = true } = {}) {
  const created: ImageLike[] = []

  const createImage = (): ImageLike => {
    let behavior: FakeBehavior = 'ok'
    const image: ImageLike = {
      onload: null,
      onerror: null,
      get src() {
        return current
      },
      set src(value: string) {
        current = value
        behavior = behaviors[value] ?? 'ok'
        if (behavior === 'hang') return
        // Bất đồng bộ như ảnh thật; dùng Promise (không dùng hẹn giờ) để không dính giả lập thời gian.
        void Promise.resolve().then(() => {
          if (behavior === 'fail') image.onerror?.(new Event('error'))
          else image.onload?.(new Event('load'))
        })
      },
    }
    let current = ''
    if (withDecode) {
      image.decode = () => {
        if (behavior === 'decode-hang') return new Promise<void>(() => {})
        return behavior === 'decode-fail' ? Promise.reject(new Error('decode')) : Promise.resolve()
      }
    }
    created.push(image)
    return image
  }

  return { createImage, created }
}
