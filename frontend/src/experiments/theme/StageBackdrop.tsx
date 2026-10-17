import { useMemo } from 'react'
import { Layer, Rect } from 'react-konva'
import { useAssets } from '../assets/useAssets'
import type { ThemeAsset } from './themeTypes'
import { useTheme } from './useTheme'

interface StageBackdropProps {
  /** Kích thước thiết kế của sân (toạ độ Konva, trước khi co giãn). */
  width: number
  height: number
}

interface BackdropTileProps extends StageBackdropProps {
  asset: ThemeAsset
}

/** Ô họa tiết lặp. Tách thành component riêng để CHỈ theme có họa tiết mới nạp tài nguyên (neutral không chạy hook nào). */
function BackdropTile({ width, height, asset }: BackdropTileProps) {
  const assets = useMemo(() => [asset], [asset])
  const { result } = useAssets(assets)
  const tile = result?.assets.get(asset.id)
  // Konva cần HTMLImageElement thật (bộ tải mặc định dùng `new Image()`); đối tượng khác thì bỏ họa tiết thay vì vẽ sai.
  if (tile?.status !== 'ready' || !(tile.image instanceof HTMLImageElement)) return null
  return <Rect width={width} height={height} fillPatternImage={tile.image} fillPatternRepeat="repeat" listening={false} />
}

/**
 * Nền sân theo theme: màu đặc, rồi (nếu có và đã nạp xong) ô họa tiết SVG lặp phủ lên. Theme không bật
 * `paintStageBackground` (neutral) thì không vẽ gì và không nạp gì. Họa tiết nạp lỗi hoặc chưa nạp xong thì chỉ có
 * màu đặc: nền không bao giờ chặn việc chơi. Là lớp đầu tiên của `Stage`, không nhận chạm.
 */
export default function StageBackdrop({ width, height }: StageBackdropProps) {
  const { colors, paintStageBackground, assets, backdropAssetId } = useTheme()
  if (!paintStageBackground) return null

  const backdrop = backdropAssetId === undefined ? undefined : assets.find((asset) => asset.id === backdropAssetId)
  return (
    <Layer listening={false}>
      <Rect width={width} height={height} fill={colors.background} />
      {backdrop && <BackdropTile width={width} height={height} asset={backdrop} />}
    </Layer>
  )
}
