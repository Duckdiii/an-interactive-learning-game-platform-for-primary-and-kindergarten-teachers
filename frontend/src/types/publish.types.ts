/** Kết quả POST /games/{id}/publish (PublishResult trong openapi.yaml). */
export interface PublishResult {
  gameId: string
  status: 'PUBLISHED'
  // 6 ký tự chữ và số, giữ nguyên khi xuất bản lại.
  shareCode: string
  shareUrl: string
}
