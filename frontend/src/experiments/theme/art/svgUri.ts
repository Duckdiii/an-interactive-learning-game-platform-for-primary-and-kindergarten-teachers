/** Đổi chuỗi SVG thành data URI (không tải gì từ ngoài). Kết quả qua được `validateTheme` (chỉ nhận `data:image/svg+xml`). */
export function svgDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/** Giải ngược data URI do `svgDataUri` tạo ra (dùng trong test và công cụ xem thử). */
export function decodeSvgDataUri(uri: string): string {
  return decodeURIComponent(uri.slice(uri.indexOf(',') + 1))
}

const XMLNS = 'http://www.w3.org/2000/svg'

/** Bọc phần thân thành một SVG hoàn chỉnh có kích thước nội tại (cần cho `Image.decode()` trên một số trình duyệt). */
export function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="${XMLNS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}
