/**
 * Dynamic Language Generator (Giai đoạn A)
 *
 * Tra cứu và sinh bài tập Tiếng Việt động:
 * - Phân biệt âm đầu (l/n, s/x, ch/tr, d/đ, c/k, g/gh, ng/ngh)
 * - Phân biệt dấu thanh (hỏi/ngã, sắc/huyền)
 * - Luyện tập vần (an/at, am/ap, en/et, ong/oc)
 * - Chữ cái mầm non & lớp 1
 * - Ánh xạ trực quan với kho Asset Vector OpenMoji SVG
 */

import type { PedagogicalConstraints } from './constraintParser'

export interface GeneratedLanguagePair {
  pairId: string
  left: { text: string; imageUrl?: string }
  right: { text: string; imageUrl?: string }
}

interface VocabItem {
  word: string
  label: string
  imageUrl: string
  category: string
}

// Từ điển ngữ âm kèm hình ảnh SVG
const VOCAB_DATABASE: Record<string, VocabItem[]> = {
  // Âm đầu
  l: [
    { word: 'hoa lan', label: 'hoa lan', imageUrl: '/assets/objects/flower.svg', category: 'l' },
    { word: 'con lợn', label: 'con lợn', imageUrl: '/assets/themes/farm/pig.svg', category: 'l' },
    { word: 'quả lê', label: 'quả lê', imageUrl: '/assets/themes/farm/apple.svg', category: 'l' },
  ],
  n: [
    { word: 'ngôi sao', label: 'ngôi sao', imageUrl: '/assets/objects/star.svg', category: 'n' },
    { word: 'quả na', label: 'quả na', imageUrl: '/assets/themes/farm/orange.svg', category: 'n' },
    { word: 'nơ hồng', label: 'nơ hồng', imageUrl: '/assets/objects/heart.svg', category: 'n' },
  ],
  s: [
    { word: 'sao biển', label: 'sao biển', imageUrl: '/assets/themes/ocean/starfish.svg', category: 's' },
    { word: 'sư tử', label: 'sư tử', imageUrl: '/assets/themes/jungle/tiger.svg', category: 's' },
  ],
  x: [
    { word: 'xe ô tô', label: 'xe ô tô', imageUrl: '/assets/objects/car.svg', category: 'x' },
    { word: 'xúc xích', label: 'xúc xích', imageUrl: '/assets/objects/candy.svg', category: 'x' },
  ],
  ch: [
    { word: 'con chim', label: 'con chim', imageUrl: '/assets/animals/bird.svg', category: 'ch' },
    { word: 'chú chó', label: 'chú chó', imageUrl: '/assets/animals/dog.svg', category: 'ch' },
    { word: 'quả chuối', label: 'quả chuối', imageUrl: '/assets/fruits/banana.svg', category: 'ch' },
  ],
  tr: [
    { word: 'con trâu', label: 'con trâu', imageUrl: '/assets/themes/farm/cow.svg', category: 'tr' },
    { word: 'mặt trời', label: 'mặt trời', imageUrl: '/assets/objects/star.svg', category: 'tr' },
    { word: 'trái táo', label: 'trái táo', imageUrl: '/assets/themes/farm/apple.svg', category: 'tr' },
  ],
  d: [
    { word: 'dưa hấu', label: 'dưa hấu', imageUrl: '/assets/themes/farm/watermelon.svg', category: 'd' },
    { word: 'con dê', label: 'con dê', imageUrl: '/assets/themes/farm/sheep.svg', category: 'd' },
  ],
  đ: [
    { word: 'đàn vịt', label: 'đàn vịt', imageUrl: '/assets/themes/farm/duck.svg', category: 'đ' },
    { word: 'đại dương', label: 'đại dương', imageUrl: '/assets/themes/ocean/dolphin.svg', category: 'đ' },
  ],
  c: [
    { word: 'con cá', label: 'con cá', imageUrl: '/assets/themes/ocean/clownfish.svg', category: 'c' },
    { word: 'củ cà rốt', label: 'củ cà rốt', imageUrl: '/assets/themes/farm/carrot.svg', category: 'c' },
    { word: 'quả cam', label: 'quả cam', imageUrl: '/assets/themes/farm/orange.svg', category: 'c' },
  ],
  m: [
    { word: 'con mèo', label: 'con mèo', imageUrl: '/assets/animals/cat.svg', category: 'm' },
    { word: 'chú khỉ', label: 'chú khỉ', imageUrl: '/assets/themes/jungle/monkey.svg', category: 'm' },
  ],
  b: [
    { word: 'con bò', label: 'con bò', imageUrl: '/assets/themes/farm/cow.svg', category: 'b' },
    { word: 'quả bóng', label: 'quả bóng', imageUrl: '/assets/objects/ball.svg', category: 'b' },
  ],

  // Dấu thanh
  hỏi: [
    { word: 'con khỉ', label: 'con khỉ', imageUrl: '/assets/themes/jungle/monkey.svg', category: 'hỏi' },
    { word: 'con hổ', label: 'con hổ', imageUrl: '/assets/themes/jungle/tiger.svg', category: 'hỏi' },
    { word: 'con thỏ', label: 'con thỏ', imageUrl: '/assets/animals/rabbit.svg', category: 'hỏi' },
  ],
  ngã: [
    { word: 'con muỗi', label: 'con muỗi', imageUrl: '/assets/animals/bird.svg', category: 'ngã' },
    { word: 'ngôi sao', label: 'ngôi sao', imageUrl: '/assets/objects/star.svg', category: 'ngã' },
    { word: 'bão biển', label: 'bão biển', imageUrl: '/assets/themes/ocean/coral.svg', category: 'ngã' },
  ],

  // Vần
  an: [
    { word: 'hoa lan', label: 'hoa lan (vần an)', imageUrl: '/assets/objects/flower.svg', category: 'an' },
    { word: 'cái bàn', label: 'cái bàn (vần an)', imageUrl: '/assets/objects/candy.svg', category: 'an' },
  ],
  at: [
    { word: 'hạt dưa', label: 'hạt dưa (vần at)', imageUrl: '/assets/themes/farm/watermelon.svg', category: 'at' },
    { word: 'con cát', label: 'bãi cát (vần at)', imageUrl: '/assets/themes/ocean/starfish.svg', category: 'at' },
  ],
}

/**
 * Sinh danh sách các cặp ghép nối Tiếng Việt động
 */
export function generateLanguagePairs(
  constraints: PedagogicalConstraints,
  count: number = 4
): GeneratedLanguagePair[] {
  const concept = constraints.languageConcept
  const pairs: GeneratedLanguagePair[] = []

  // Trường hợp phân biệt âm đầu hoặc dấu thanh hoặc vần
  if (concept && concept.targets && concept.targets.length >= 2) {
    const targetA = concept.targets[0]
    const targetB = concept.targets[1]

    const itemsA = VOCAB_DATABASE[targetA] || VOCAB_DATABASE.l || []
    const itemsB = VOCAB_DATABASE[targetB] || VOCAB_DATABASE.n || []

    const half = Math.ceil(count / 2)
    const selectedA = itemsA.slice(0, half)
    const selectedB = itemsB.slice(0, count - selectedA.length)
    const combined = [...selectedA, ...selectedB]

    combined.slice(0, count).forEach((item, idx) => {
      pairs.push({
        pairId: `p${idx + 1}`,
        left: {
          text: item.category.length <= 2 ? `Âm ${item.category}` : `Dấu ${item.category}`,
        },
        right: {
          text: item.word,
          imageUrl: item.imageUrl,
        },
      })
    })

    if (pairs.length >= 2) {
      return pairs
    }
  }

  // Fallback: Mặc định ghép chữ cái - hình ảnh minh họa cho mầm non & lớp 1
  const defaultBank: { letter: string; word: string; image: string }[] = [
    { letter: 'a', word: 'quả táo', image: '/assets/themes/farm/apple.svg' },
    { letter: 'b', word: 'con bò', image: '/assets/themes/farm/cow.svg' },
    { letter: 'c', word: 'con cá', image: '/assets/themes/ocean/clownfish.svg' },
    { letter: 'd', word: 'dưa hấu', image: '/assets/themes/farm/watermelon.svg' },
    { letter: 'g', word: 'con gà', image: '/assets/themes/farm/chicken.svg' },
    { letter: 'v', word: 'con vịt', image: '/assets/themes/farm/duck.svg' },
  ]

  const slice = defaultBank.slice(0, Math.min(count, defaultBank.length))
  return slice.map((item, idx) => ({
    pairId: `p${idx + 1}`,
    left: { text: item.letter },
    right: { text: item.word, imageUrl: item.image },
  }))
}
