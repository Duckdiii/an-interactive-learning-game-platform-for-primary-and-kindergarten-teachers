/** Băm chuỗi thành số nguyên 32 bit không dấu (FNV-1a). */
function hashSeed(seed: string): number {
  let hash = 2166136261
  for (const char of seed) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32), trả số trong [0, 1). */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Xáo thứ tự sao cho KHÔNG phần tử nào còn ở vị trí cũ (derangement), kết quả xác định theo `seed`.
 *
 * Dùng thuật toán Sattolo: hoán vị tạo ra luôn là một chu trình duy nhất nên không thể có điểm bất động, với
 * mọi `items.length >= 2`. Dùng cho cột phải của MATCHING: không ô nào nằm cùng hàng ngang với ô ghép đúng
 * của nó. Xáo thường (Fisher–Yates) có thể giữ nguyên một vài vị trí, thậm chí cả dãy.
 *
 * Có hạt giống (thường là `question.id`) nên render lại hay tải lại trang vẫn ra cùng thứ tự, tránh giật
 * hình, và test kiểm chứng được. Dãy ngắn hơn 2 phần tử không thể xáo nên trả về bản sao nguyên vẹn.
 */
export function seededDerangement<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]
  if (result.length < 2) return result

  const random = createRandom(hashSeed(seed))
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * i) // trong [0, i-1], không bao giờ chọn chính i
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
