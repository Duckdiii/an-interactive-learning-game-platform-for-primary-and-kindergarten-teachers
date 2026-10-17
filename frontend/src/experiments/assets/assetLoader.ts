import type { ThemeAsset } from '../theme/themeTypes'

/** SVG dự phòng khi một tài nguyên tải lỗi: khung xám với dấu hỏi, nhúng sẵn (không tải từ ngoài). */
export const FALLBACK_ASSET_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect x="4" y="4" width="92" height="92" rx="16" fill="#E2E8F0" stroke="#94A3B8" stroke-width="4"/>' +
      '<text x="50" y="66" font-size="52" text-anchor="middle" fill="#64748B" font-family="Arial">?</text>' +
      '</svg>',
  )

/** Thời gian chờ tối đa cho mỗi tài nguyên (ms) trước khi coi là lỗi. */
export const DEFAULT_ASSET_TIMEOUT_MS = 5000

/** Phần của `HTMLImageElement` mà bộ tải dùng, để thay bằng bản giả khi test (jsdom không tải ảnh). */
export interface ImageLike {
  onload: ((event: Event) => unknown) | null
  onerror: ((event: Event) => unknown) | null
  src: string
  decode?: () => Promise<void>
}

export type AssetStatus = 'ready' | 'failed'

export interface LoadedAsset {
  id: string
  status: AssetStatus
  /** Đường dẫn dùng để vẽ: `src` gốc khi `ready`, `FALLBACK_ASSET_SRC` khi `failed`. */
  src: string
  /** Ảnh đã giải mã khi `ready`; `null` khi `failed` (dùng `src` dự phòng). */
  image: ImageLike | null
}

export interface LoadProgress {
  /** Số tài nguyên đã xong (thành công hoặc lỗi). */
  settled: number
  loaded: number
  failed: number
  total: number
}

export interface AssetLoadResult {
  assets: ReadonlyMap<string, LoadedAsset>
  failedIds: readonly string[]
}

export interface LoadAssetsOptions {
  signal?: AbortSignal
  /** Gọi một lần ngay lúc bắt đầu (tất cả bằng 0) rồi sau mỗi tài nguyên xong. Không gọi sau khi đã hủy. */
  onProgress?: (progress: LoadProgress) => void
  timeoutMs?: number
  createImage?: () => ImageLike
}

function abortError(): DOMException {
  return new DOMException('Đã hủy tải tài nguyên.', 'AbortError')
}

function loadOne(
  asset: ThemeAsset,
  createImage: () => ImageLike,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<LoadedAsset> {
  return new Promise((resolve) => {
    let image: ImageLike | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    const finish = (result: LoadedAsset) => {
      if (timer !== undefined) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (image) {
        image.onload = null
        image.onerror = null
      }
      resolve(result)
    }
    const failed = (): LoadedAsset => ({ id: asset.id, status: 'failed', src: FALLBACK_ASSET_SRC, image: null })
    // Hủy: dọn bộ hẹn giờ và trình nghe; kết quả bị bỏ ở `loadAssets` nên giá trị này không dùng.
    const onAbort = () => finish(failed())

    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => finish(failed()), timeoutMs)
    try {
      const loading = createImage()
      image = loading
      loading.onerror = () => finish(failed())
      loading.onload = () => {
        const ready = (): LoadedAsset => ({ id: asset.id, status: 'ready', src: asset.src, image: loading })
        // Giải mã trước khi báo xong để lần vẽ đầu không bị khựng; trình duyệt không có `decode` thì coi như xong.
        if (typeof loading.decode === 'function') loading.decode().then(() => finish(ready()), () => finish(failed()))
        else finish(ready())
      }
      loading.src = asset.src
    } catch {
      // Dựng ảnh hoặc gán src ném lỗi: tính là lỗi của riêng tài nguyên này, không làm hỏng cả bộ.
      finish(failed())
    }
  })
}

/**
 * Tải trước các tài nguyên SVG của theme, song song, kèm tiến độ. Lỗi một tài nguyên (sai, quá hạn) không làm
 * hỏng cả bộ: tài nguyên đó trả `failed` và dùng `FALLBACK_ASSET_SRC`. Trùng mã thì lấy mục đầu tiên.
 * Hủy bằng `signal` thì Promise bị từ chối bằng `AbortError`, không còn `onProgress` nào được gọi.
 */
export async function loadAssets(
  assets: readonly ThemeAsset[],
  { signal, onProgress, timeoutMs = DEFAULT_ASSET_TIMEOUT_MS, createImage = () => new Image() }: LoadAssetsOptions = {},
): Promise<AssetLoadResult> {
  if (signal?.aborted) throw abortError()

  const firstById = new Map<string, ThemeAsset>()
  for (const asset of assets) if (!firstById.has(asset.id)) firstById.set(asset.id, asset)
  const unique = [...firstById.values()]
  const progress: LoadProgress = { settled: 0, loaded: 0, failed: 0, total: unique.length }
  let aborted = false
  const emit = () => {
    if (!aborted) onProgress?.({ ...progress })
  }

  let onAbortAll: (() => void) | undefined
  const aborting = new Promise<never>((_, reject) => {
    onAbortAll = () => {
      aborted = true
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbortAll, { once: true })
  })

  emit()
  const loading = Promise.all(
    unique.map(async (asset) => {
      const result = await loadOne(asset, createImage, timeoutMs, signal)
      progress.settled += 1
      if (result.status === 'ready') progress.loaded += 1
      else progress.failed += 1
      emit()
      return result
    }),
  )

  try {
    const results = await Promise.race([loading, aborting])
    return {
      assets: new Map(results.map((result) => [result.id, result])),
      failedIds: results.filter((result) => result.status === 'failed').map((result) => result.id),
    }
  } finally {
    // Không để lại trình nghe trên signal dùng chung sau khi xong.
    if (onAbortAll) signal?.removeEventListener('abort', onAbortAll)
  }
}
