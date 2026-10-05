import useImage from 'use-image'

/**
 * Tải ảnh minh hoạ cấp câu hỏi (`imageUrl`). `reserveSpace` cho biết có nên chừa chỗ cho ảnh trong bố cục:
 * chừa ngay khi có `imageUrl` (tránh bố cục nhảy khi ảnh tải xong), còn ảnh tải lỗi thì bỏ chỗ đó đi để
 * không để lại khoảng trống.
 */
export function useIllustration(imageUrl: string | undefined) {
  const [image, status] = useImage(imageUrl ?? '')
  return { image, reserveSpace: Boolean(imageUrl) && status !== 'failed' }
}
