/**
 * Bộ chuyển đổi và tra cứu kho tài nguyên đồ họa (Asset Bank) dành cho mầm non và tiểu học.
 * Hỗ trợ nhận diện tự động từ khóa (tiếng Việt, tiếng Anh, không dấu/có dấu)
 * để gán hình ảnh minh họa vector sắc nét (Candy Vector) cho các câu hỏi, thẻ chơi.
 */

export interface AssetItem {
  id: string
  name: string
  category: 'numbers' | 'fruits' | 'animals' | 'objects'
  url: string
  keywords: readonly string[]
}

export const ASSET_CATALOG: readonly AssetItem[] = [
  // Chữ số 1 - 10
  { id: 'num-1', name: 'Số 1', category: 'numbers', url: '/assets/numbers/number-1.svg', keywords: ['so 1', '1', 'mot', 'one', 'first'] },
  { id: 'num-2', name: 'Số 2', category: 'numbers', url: '/assets/numbers/number-2.svg', keywords: ['so 2', '2', 'hai', 'two', 'second'] },
  { id: 'num-3', name: 'Số 3', category: 'numbers', url: '/assets/numbers/number-3.svg', keywords: ['so 3', '3', 'ba', 'three', 'third'] },
  { id: 'num-4', name: 'Số 4', category: 'numbers', url: '/assets/numbers/number-4.svg', keywords: ['so 4', '4', 'bon', 'four'] },
  { id: 'num-5', name: 'Số 5', category: 'numbers', url: '/assets/numbers/number-5.svg', keywords: ['so 5', '5', 'nam', 'five'] },
  { id: 'num-6', name: 'Số 6', category: 'numbers', url: '/assets/numbers/number-6.svg', keywords: ['so 6', '6', 'sau', 'six'] },
  { id: 'num-7', name: 'Số 7', category: 'numbers', url: '/assets/numbers/number-7.svg', keywords: ['so 7', '7', 'bay', 'seven'] },
  { id: 'num-8', name: 'Số 8', category: 'numbers', url: '/assets/numbers/number-8.svg', keywords: ['so 8', '8', 'tam', 'eight'] },
  { id: 'num-9', name: 'Số 9', category: 'numbers', url: '/assets/numbers/number-9.svg', keywords: ['so 9', '9', 'chin', 'nine'] },
  { id: 'num-10', name: 'Số 10', category: 'numbers', url: '/assets/numbers/number-10.svg', keywords: ['so 10', '10', 'muoi', 'ten'] },

  // Hoa quả
  { id: 'fruit-apple', name: 'Quả táo', category: 'fruits', url: '/assets/fruits/apple.svg', keywords: ['tao', 'apple', 'qua tao', 'trai tao'] },
  { id: 'fruit-banana', name: 'Quả chuối', category: 'fruits', url: '/assets/fruits/banana.svg', keywords: ['chuoi', 'banana', 'qua chuoi', 'trai chuoi'] },
  { id: 'fruit-orange', name: 'Quả cam', category: 'fruits', url: '/assets/fruits/orange.svg', keywords: ['cam', 'orange', 'qua cam', 'trai cam'] },
  { id: 'fruit-strawberry', name: 'Dâu tây', category: 'fruits', url: '/assets/fruits/strawberry.svg', keywords: ['dau tay', 'strawberry', 'qua dau', 'trai dau'] },
  { id: 'fruit-watermelon', name: 'Dưa hấu', category: 'fruits', url: '/assets/fruits/watermelon.svg', keywords: ['dua hau', 'watermelon', 'qua dua hau'] },

  // Con vật
  { id: 'anim-cat', name: 'Con mèo', category: 'animals', url: '/assets/animals/cat.svg', keywords: ['meo', 'cat', 'chu meo', 'con meo', 'kitten'] },
  { id: 'anim-dog', name: 'Con chó', category: 'animals', url: '/assets/animals/dog.svg', keywords: ['cho', 'dog', 'con cho', 'chu cho', 'puppy'] },
  { id: 'anim-fish', name: 'Con cá', category: 'animals', url: '/assets/animals/fish.svg', keywords: ['ca', 'fish', 'con ca', 'chu ca'] },
  { id: 'anim-bird', name: 'Con chim', category: 'animals', url: '/assets/animals/bird.svg', keywords: ['chim', 'bird', 'con chim', 'chu chim'] },
  { id: 'anim-rabbit', name: 'Con thỏ', category: 'animals', url: '/assets/animals/rabbit.svg', keywords: ['tho', 'rabbit', 'bunny', 'con tho', 'chu tho'] },
  { id: 'anim-duck', name: 'Con vịt', category: 'animals', url: '/assets/animals/duck.svg', keywords: ['vit', 'duck', 'con vit', 'chu vit', 'duckling'] },

  // Đồ vật quen thuộc
  { id: 'obj-star', name: 'Ngôi sao', category: 'objects', url: '/assets/objects/star.svg', keywords: ['sao', 'star', 'ngoi sao', 'ong sao'] },
  { id: 'obj-flower', name: 'Bông hoa', category: 'objects', url: '/assets/objects/flower.svg', keywords: ['hoa', 'flower', 'bong hoa', 'canh hoa'] },
  { id: 'obj-ball', name: 'Quả bóng', category: 'objects', url: '/assets/objects/ball.svg', keywords: ['bong', 'ball', 'qua bong', 'trai banh', 'banh'] },
  { id: 'obj-candy', name: 'Cây kẹo', category: 'objects', url: '/assets/objects/candy.svg', keywords: ['keo', 'candy', 'vien keo', 'cay keo', 'sweet'] },
  { id: 'obj-heart', name: 'Trái tim', category: 'objects', url: '/assets/objects/heart.svg', keywords: ['tim', 'heart', 'trai tim', 'hinh tim'] },
  { id: 'obj-car', name: 'Xe ô tô', category: 'objects', url: '/assets/objects/car.svg', keywords: ['xe', 'oto', 'car', 'xe hoi', 'o to'] },
]

/** Chuẩn hóa xâu chữ: bỏ dấu tiếng Việt, ký tự đặc biệt, chuyển chữ thường */
export function normalizeKeyword(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Tạo danh sách phẳng tất cả từ khóa xếp theo độ dài giảm dần (từ ghép được ưu tiên trước từ đơn)
const KEYWORD_MAP = ASSET_CATALOG.flatMap((item) =>
  item.keywords.map((kw) => ({ kw: normalizeKeyword(kw), url: item.url }))
).sort((a, b) => b.kw.length - a.kw.length)

/**
 * Tự động tìm URL hình ảnh từ văn bản hoặc mô tả hình ảnh.
 * Ưu tiên tra cứu `visualPrompt`, nếu không có thì tra cứu `text`.
 */
export function resolveAssetUrl(text?: string, visualPrompt?: string): string | null {
  const candidates = [visualPrompt, text].filter(Boolean) as string[]

  for (const raw of candidates) {
    const normalized = normalizeKeyword(raw)
    if (!normalized) continue

    // Khớp từ khóa dài nhất trước (vd: "bong hoa" khớp trước "bong")
    for (const { kw, url } of KEYWORD_MAP) {
      const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i')
      if (regex.test(normalized) || normalized === kw) {
        return url
      }
    }
  }

  return null
}


/**
 * Tự động gán URL hình ảnh từ Kho Asset cho nội dung câu hỏi nếu chưa có ảnh.
 */
export function enrichGameWithAssets<T extends { gameType: string; questions: unknown[] }>(game: T): T {
  if (game.gameType === 'MATCHING') {
    for (const q of game.questions as Array<{ pairs?: Array<{ left: { text?: string; visualPrompt?: string; imageUrl?: string }; right: { text?: string; visualPrompt?: string; imageUrl?: string } }> }>) {
      if (!Array.isArray(q.pairs)) continue
      for (const pair of q.pairs) {
        if (!pair.left.imageUrl) {
          const url = resolveAssetUrl(pair.left.text, pair.left.visualPrompt)
          if (url) pair.left.imageUrl = url
        }
        if (!pair.right.imageUrl) {
          const url = resolveAssetUrl(pair.right.text, pair.right.visualPrompt)
          if (url) pair.right.imageUrl = url
        }
      }
    }
  } else if (game.gameType === 'MEMORY_CARD') {
    for (const q of game.questions as Array<{ pairs?: Array<{ content: { text?: string; visualPrompt?: string; imageUrl?: string } }> }>) {
      if (!Array.isArray(q.pairs)) continue
      for (const pair of q.pairs) {
        if (!pair.content.imageUrl) {
          const url = resolveAssetUrl(pair.content.text, pair.content.visualPrompt)
          if (url) pair.content.imageUrl = url
        }
      }
    }
  } else if (game.gameType === 'QUIZ') {
    for (const q of game.questions as Array<{ questionText?: string; visualPrompt?: string; imageUrl?: string }>) {
      if (!q.imageUrl) {
        const url = resolveAssetUrl(q.questionText, q.visualPrompt)
        if (url) q.imageUrl = url
      }
    }
  } else if (game.gameType === 'DRAG_DROP') {
    for (const q of game.questions as Array<{ items?: Array<{ text?: string; visualPrompt?: string; imageUrl?: string }> }>) {
      if (!Array.isArray(q.items)) continue
      for (const item of q.items) {
        if (!item.imageUrl) {
          const url = resolveAssetUrl(item.text, item.visualPrompt)
          if (url) item.imageUrl = url
        }
      }
    }
  }

  return game
}
