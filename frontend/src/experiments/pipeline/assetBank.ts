/**
 * Visual Asset Bank & Narration Engine (Chiến lược Lai 80/20).
 * Cung cấp kho Vector Sprites chuẩn K-5, tự động gắn ảnh vào câu hỏi (không bao giờ để null),
 * và hỗ trợ tổng hợp giọng đọc đề bài tiếng Việt (TTS).
 */

import type { PresetQuizData } from './pipelineOrchestrator'
import type { GameWorldTheme } from './themeResolver'

export interface AssetSprite {
  id: string
  name: string
  category: 'fruits' | 'animals' | 'objects' | 'numbers'
  url: string
  keywords: string[]
}

export const K5_ASSET_SPRITES: readonly AssetSprite[] = [
  // Hoa quả
  { id: 'apple', name: 'Quả Táo Đỏ', category: 'fruits', url: '/assets/fruits/apple.svg', keywords: ['tao', 'apple', 'qua tao'] },
  { id: 'banana', name: 'Quả Chuối Vàng', category: 'fruits', url: '/assets/fruits/banana.svg', keywords: ['chuoi', 'banana', 'qua chuoi'] },
  { id: 'orange', name: 'Quả Cam Mọng', category: 'fruits', url: '/assets/fruits/orange.svg', keywords: ['cam', 'orange', 'qua cam'] },
  { id: 'strawberry', name: 'Quả Dâu Tây', category: 'fruits', url: '/assets/fruits/strawberry.svg', keywords: ['dau tay', 'strawberry', 'dau'] },
  { id: 'watermelon', name: 'Miếng Dưa Hấu', category: 'fruits', url: '/assets/fruits/watermelon.svg', keywords: ['dua hau', 'watermelon'] },

  // Động vật
  { id: 'cat', name: 'Chú Mèo Con', category: 'animals', url: '/assets/animals/cat.svg', keywords: ['meo', 'cat', 'chu meo', 'con meo'] },
  { id: 'dog', name: 'Chú Cún Con', category: 'animals', url: '/assets/animals/dog.svg', keywords: ['cho', 'dog', 'chu cho', 'cun'] },
  { id: 'chicken', name: 'Chú Gà Con', category: 'animals', url: '/assets/animals/bird.svg', keywords: ['ga', 'chu ga', 'con ga', 'chicken', 'gà'] },
  { id: 'duck', name: 'Chú Vịt Vàng', category: 'animals', url: '/assets/animals/duck.svg', keywords: ['vit', 'duck', 'chu vit', 'con vit'] },
  { id: 'fish', name: 'Chú Cá Biển', category: 'animals', url: '/assets/animals/fish.svg', keywords: ['ca', 'fish', 'chu ca', 'con ca'] },
  { id: 'rabbit', name: 'Chú Thỏ Trắng', category: 'animals', url: '/assets/animals/rabbit.svg', keywords: ['tho', 'rabbit', 'chu tho', 'con tho', 'ca rot'] },
  { id: 'bird', name: 'Chú Chim Sẻ', category: 'animals', url: '/assets/animals/bird.svg', keywords: ['chim', 'bird', 'chu chim'] },

  // Khối học tập & Đồ vật
  { id: 'star', name: 'Ngôi Sao Vàng', category: 'objects', url: '/assets/objects/star.svg', keywords: ['sao', 'star', 'ngoi sao', 'ong sao'] },
  { id: 'flower', name: 'Bông Hoa', category: 'objects', url: '/assets/objects/flower.svg', keywords: ['hoa', 'flower', 'bong hoa', 'canh hoa'] },
  { id: 'ball', name: 'Quả Bóng', category: 'objects', url: '/assets/objects/ball.svg', keywords: ['bong', 'ball', 'qua bong'] },
  { id: 'candy', name: 'Cây Kẹo Mút', category: 'objects', url: '/assets/objects/candy.svg', keywords: ['keo', 'candy', 'cay keo'] },
  { id: 'heart', name: 'Trái Tim', category: 'objects', url: '/assets/objects/heart.svg', keywords: ['tim', 'heart', 'trai tim'] },
  { id: 'car', name: 'Xe Ô Tô', category: 'objects', url: '/assets/objects/car.svg', keywords: ['xe', 'oto', 'car', 'xe hoi'] },
]

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

/**
 * Tìm kiếm Asset Sprite phù hợp nhất với từ khóa
 */
export function findBestSprite(text: string): AssetSprite | null {
  const norm = normalizeText(text)
  for (const sprite of K5_ASSET_SPRITES) {
    for (const kw of sprite.keywords) {
      const normKw = normalizeText(kw)
      // Bắt buộc khớp ranh giới từ để tránh false-positive (ví dụ: 'ngao' chứa 'ga')
      const regex = new RegExp(`(^|\\s|[.,!?;])${normKw}(\\s|[.,!?;]|$)`, 'i')
      if (regex.test(norm)) {
        return sprite
      }
    }
  }
  return null
}

/**
 * Trả về Sprite mặc định theo Theme khi không tìm thấy từ khóa đặc thù
 */
export function getDefaultThemeSprite(themeKey: GameWorldTheme['key']): AssetSprite {
  switch (themeKey) {
    case 'FARM':
      return K5_ASSET_SPRITES.find((s) => s.id === 'apple') ?? K5_ASSET_SPRITES[0]
    case 'OCEAN':
      return K5_ASSET_SPRITES.find((s) => s.id === 'fish') ?? K5_ASSET_SPRITES[0]
    case 'SPACE':
      return K5_ASSET_SPRITES.find((s) => s.id === 'star') ?? K5_ASSET_SPRITES[0]
    case 'FOREST':
      return K5_ASSET_SPRITES.find((s) => s.id === 'flower') ?? K5_ASSET_SPRITES[0]
    case 'CANDY':
      return K5_ASSET_SPRITES.find((s) => s.id === 'candy') ?? K5_ASSET_SPRITES[0]
  }
}

export interface DressedPresetResult {
  dressedPreset: PresetQuizData
  assetsAttached: string[]
}

/**
 * Gán tài nguyên đồ họa (Sprites, imageUrl, spriteItems) vào câu hỏi Preset
 * Tuyệt đối không để imageUrl = null.
 */
export function bindAssetsToPreset(preset: PresetQuizData, theme: GameWorldTheme): DressedPresetResult {
  const assetsAttached: string[] = []
  const textToScan = `${preset.questionText} ${preset.theme} ${preset.title}`
  const foundSprite = findBestSprite(textToScan)
  const defaultSprite = getDefaultThemeSprite(theme.key)

  const primarySprite = foundSprite ?? defaultSprite
  assetsAttached.push(primarySprite.name)

  // Phát hiện các đối tượng số lượng cụ thể trong bài toán (ví dụ: gà và vịt)
  const spriteItems: { name: string; count: number; url: string }[] = []
  if (preset.numA > 0) {
    const itemASprite = findBestSprite(preset.questionText.slice(0, 40)) ?? primarySprite
    spriteItems.push({
      name: itemASprite.name,
      count: Math.min(preset.numA, 10), // Giới hạn hiển thị canvas tối đa 10 items để tránh quá tải
      url: itemASprite.url,
    })
    if (!assetsAttached.includes(itemASprite.name)) {
      assetsAttached.push(itemASprite.name)
    }
  }

  if (preset.numB > 0) {
    const itemBSprite = findBestSprite(preset.questionText.slice(40)) ?? defaultSprite
    spriteItems.push({
      name: itemBSprite.name,
      count: Math.min(preset.numB, 10),
      url: itemBSprite.url,
    })
    if (!assetsAttached.includes(itemBSprite.name)) {
      assetsAttached.push(itemBSprite.name)
    }
  }

  const dressedPreset: PresetQuizData = {
    ...preset,
    imageUrl: primarySprite.url,
    audioUrl: preset.audioUrl ?? '/mock/q1.wav',
    visualPrompt: preset.visualPrompt ?? `Minh họa ${primarySprite.name} cho bài toán`,
    spriteItems: spriteItems.length > 0 ? spriteItems : [{ name: primarySprite.name, count: 3, url: primarySprite.url }],
    theme: theme.name,
  }

  return {
    dressedPreset,
    assetsAttached,
  }
}

/**
 * Tích hợp giọng đọc Web Speech API phát âm tiếng Việt chuẩn K-5
 */
export function speakVietnamese(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.()
    return
  }

  try {
    window.speechSynthesis.cancel() // Hủy các lời đọc trước đó nếu còn
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'vi-VN'
    utterance.rate = 0.9 // Tốc độ vừa phải, rõ ràng cho trẻ K-5
    utterance.pitch = 1.1 // Âm sắc ấm áp, vui tươi

    // Tìm giọng đọc tiếng Việt nếu trình duyệt có hỗ trợ
    const voices = window.speechSynthesis.getVoices()
    const viVoice = voices.find((v) => v.lang.startsWith('vi') || v.lang.includes('VN'))
    if (viVoice) {
      utterance.voice = viVoice
    }

    utterance.onend = () => onEnd?.()
    utterance.onerror = () => onEnd?.()

    window.speechSynthesis.speak(utterance)
  } catch {
    onEnd?.()
  }
}
