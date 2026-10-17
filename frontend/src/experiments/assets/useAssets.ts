import { useEffect, useRef, useState } from 'react'
import type { ThemeAsset } from '../theme/themeTypes'
import { loadAssets, type AssetLoadResult, type ImageLike, type LoadProgress } from './assetLoader'

export interface UseAssetsState {
  status: 'loading' | 'done'
  progress: LoadProgress
  /** `null` cho đến khi tải xong. */
  result: AssetLoadResult | null
}

interface InternalState extends UseAssetsState {
  /** Danh sách tài nguyên mà state này thuộc về; khác `assets` hiện tại nghĩa là đã cũ. */
  source: readonly ThemeAsset[]
}

const zeroProgress = (total: number): LoadProgress => ({ settled: 0, loaded: 0, failed: 0, total })

/**
 * Tải trước tài nguyên của một theme và theo dõi tiến độ. `assets` phải có danh tính ổn định giữa các lần render
 * (hằng số của theme hoặc `useMemo`), vì đổi danh tính sẽ hủy lần tải cũ và tải lại. `options` được đọc qua ref
 * nên có thể truyền hàm/đối tượng mới mỗi lần render mà không gây tải lại (chỉ giá trị lúc bắt đầu tải được dùng).
 * Rời component thì hủy. Không chặn render: trong lúc `loading` người dùng có thể vẽ bằng ảnh dự phòng.
 */
export function useAssets(
  assets: readonly ThemeAsset[],
  options: { timeoutMs?: number; createImage?: () => ImageLike } = {},
): UseAssetsState {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })
  const [state, setState] = useState<InternalState | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { timeoutMs, createImage } = optionsRef.current
    loadAssets(assets, {
      signal: controller.signal,
      timeoutMs,
      createImage,
      onProgress: (progress) => setState((previous) => ({
        source: assets,
        status: 'loading',
        progress,
        result: previous?.source === assets ? previous.result : null,
      })),
    }).then(
      (result) =>
        setState({
          source: assets,
          status: 'done',
          progress: {
            settled: result.assets.size,
            loaded: result.assets.size - result.failedIds.length,
            failed: result.failedIds.length,
            total: result.assets.size,
          },
          result,
        }),
      () => {
        // `loadAssets` chỉ từ chối khi bị hủy (lỗi từng tài nguyên đã được tính là `failed`): bình thường.
      },
    )
    return () => controller.abort()
  }, [assets])

  // State của danh sách cũ (hoặc chưa có) thì coi như đang tải lại từ đầu.
  if (state === null || state.source !== assets) {
    return { status: 'loading', progress: zeroProgress(new Set(assets.map((a) => a.id)).size), result: null }
  }
  return { status: state.status, progress: state.progress, result: state.result }
}
