/** Văn bản thay thế của hình dự phòng. */
export const PLACEHOLDER_ALT = 'Hình đang được bổ sung'

/**
 * Hình dự phòng thân thiện khi chưa có hình cho từ khóa: ngôi sao vàng mỉm cười trên nền xanh nhạt, không có chữ (khỏi phụ thuộc font),
 * không dấu hỏi hay dấu lỗi (trẻ nhỏ không nên thấy «lỗi»). Nhúng sẵn dạng data URI, không tải gì từ ngoài.
 */
export const PLACEHOLDER_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">' +
      '<rect x="3" y="3" width="58" height="58" rx="16" fill="#E0F2FE" stroke="#7DD3FC" stroke-width="3"/>' +
      '<path d="M32 10l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 43l-13 6.9 2.5-14.5L11 25.3l14.5-2.1z" fill="#FFD43B" stroke="#F59F00" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="26.5" cy="30" r="2" fill="#5A3E00"/><circle cx="37.5" cy="30" r="2" fill="#5A3E00"/>' +
      '<path d="M27 36q5 4 10 0" fill="none" stroke="#5A3E00" stroke-width="2.2" stroke-linecap="round"/>' +
      '</svg>',
  )
