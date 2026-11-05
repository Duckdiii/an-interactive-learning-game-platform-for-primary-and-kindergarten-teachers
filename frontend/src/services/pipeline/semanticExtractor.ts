/**
 * Semantic NLU/NER Extractor for Educational Games (Chặng 1)
 *
 * Phân tích ngữ cảnh ngữ nghĩa tự nhiên, phân biệt Chủ thể không gian (Spatial Anchor)
 * và Vật thể phụ, giải quyết mâu thuẫn ngữ cảnh (Context Disambiguation).
 *
 * Tuyệt đối KHÔNG dùng if-else gán cứng chuỗi đơn lẻ.
 */

import { ASSET_CATALOG, normalizeKeyword, resolveAssetUrl } from '../../utils/assetResolver'

export type GameWorldTheme = 'OCEAN' | 'FARM' | 'SPACE' | 'JUNGLE' | 'CLASSROOM'

export interface VisualEntity {
  name: string
  rawText: string
  entityType: 'spatial_anchor' | 'animal' | 'plant' | 'object' | 'tool' | 'character'
  themeAffinity: GameWorldTheme
  weight: number
  mappedAssetUrl?: string
}

export interface SemanticExtractionResult {
  theme: 'OCEAN' | 'FARM' | 'SPACE' | 'JUNGLE'
  themeKey: 'ocean' | 'farm' | 'space' | 'jungle'
  backgroundUrl: string
  mascotUrl: string
  mascotName: string
  visualEntities: VisualEntity[]
  primarySpatialAnchor?: VisualEntity
  reasoning: string
  scores: Record<GameWorldTheme, number>
}

interface LexiconEntry {
  phrase: string
  normPhrase: string
  theme: GameWorldTheme
  entityType: VisualEntity['entityType']
  weight: number
  assetId?: string
}

// Từ điển ngữ nghĩa tri thức bối cảnh (Knowledge Base)
const LEXICON: LexiconEntry[] = [
  // --- FARM SPATIAL ANCHORS (Trọng số không gian 3.5) ---
  { phrase: 'nông dân', normPhrase: 'nong dan', theme: 'FARM', entityType: 'spatial_anchor', weight: 3.5 },
  { phrase: 'bác nông dân', normPhrase: 'bac nong dan', theme: 'FARM', entityType: 'spatial_anchor', weight: 4.0 },
  { phrase: 'nông trại', normPhrase: 'nong trai', theme: 'FARM', entityType: 'spatial_anchor', weight: 3.5, assetId: 'farm-barn' },
  { phrase: 'trang trại', normPhrase: 'trang trai', theme: 'FARM', entityType: 'spatial_anchor', weight: 3.5, assetId: 'farm-barn' },
  { phrase: 'chuồng trại', normPhrase: 'chuong trai', theme: 'FARM', entityType: 'spatial_anchor', weight: 3.2, assetId: 'farm-barn' },
  { phrase: 'bờ ao', normPhrase: 'bo ao', theme: 'FARM', entityType: 'spatial_anchor', weight: 2.5 },
  { phrase: 'ao làng', normPhrase: 'ao lang', theme: 'FARM', entityType: 'spatial_anchor', weight: 2.5 },
  { phrase: 'ao cá', normPhrase: 'ao ca', theme: 'FARM', entityType: 'spatial_anchor', weight: 2.5 },
  { phrase: 'đồng cỏ', normPhrase: 'dong co', theme: 'FARM', entityType: 'spatial_anchor', weight: 2.8 },
  { phrase: 'nhà nông', normPhrase: 'nha nong', theme: 'FARM', entityType: 'spatial_anchor', weight: 3.0 },

  // --- FARM ENTITIES ---
  { phrase: 'con vịt', normPhrase: 'con vit', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'anim-duck' },
  { phrase: 'đàn vịt', normPhrase: 'dan vit', theme: 'FARM', entityType: 'animal', weight: 1.8, assetId: 'anim-duck' },
  { phrase: 'vịt', normPhrase: 'vit', theme: 'FARM', entityType: 'animal', weight: 1.2, assetId: 'anim-duck' },
  { phrase: 'con gà', normPhrase: 'con ga', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-chicken' },
  { phrase: 'gà con', normPhrase: 'ga con', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-chicken' },
  { phrase: 'gà', normPhrase: 'ga', theme: 'FARM', entityType: 'animal', weight: 1.2, assetId: 'farm-chicken' },
  { phrase: 'con bò', normPhrase: 'con bo', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-cow' },
  { phrase: 'bò sữa', normPhrase: 'bo sua', theme: 'FARM', entityType: 'animal', weight: 1.6, assetId: 'farm-cow' },
  { phrase: 'con cừu', normPhrase: 'con cuu', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-sheep' },
  { phrase: 'chú cừu', normPhrase: 'chu cuu', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-sheep' },
  { phrase: 'con lợn', normPhrase: 'con lon', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-pig' },
  { phrase: 'con heo', normPhrase: 'con heo', theme: 'FARM', entityType: 'animal', weight: 1.5, assetId: 'farm-pig' },
  { phrase: 'cà rốt', normPhrase: 'ca rot', theme: 'FARM', entityType: 'plant', weight: 1.4, assetId: 'farm-carrot' },
  { phrase: 'quả táo', normPhrase: 'qua tao', theme: 'FARM', entityType: 'plant', weight: 1.4, assetId: 'fruit-apple' },
  { phrase: 'táo đỏ', normPhrase: 'tao do', theme: 'FARM', entityType: 'plant', weight: 1.4, assetId: 'fruit-apple' },
  { phrase: 'quả cam', normPhrase: 'qua cam', theme: 'FARM', entityType: 'plant', weight: 1.4, assetId: 'fruit-orange' },
  { phrase: 'quả chuối', normPhrase: 'qua chuoi', theme: 'FARM', entityType: 'plant', weight: 1.4, assetId: 'fruit-banana' },
  { phrase: 'dưa hấu', normPhrase: 'dua hau', theme: 'FARM', entityType: 'plant', weight: 1.4, assetId: 'fruit-watermelon' },

  // --- OCEAN SPATIAL ANCHORS (Trọng số không gian 3.5) ---
  { phrase: 'đại dương', normPhrase: 'dai duong', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 4.0 },
  { phrase: 'biển cả', normPhrase: 'bien ca', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.8 },
  { phrase: 'rãnh mariana', normPhrase: 'ranh mariana', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 4.5 },
  { phrase: 'đáy biển', normPhrase: 'day bien', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.8 },
  { phrase: 'vực thẳm', normPhrase: 'vuc tham', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.0 },
  { phrase: 'tàu thám hiểm lặn', normPhrase: 'tau tham hiem lan', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.5 },
  { phrase: 'lặn sâu', normPhrase: 'lan sau', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.0 },
  { phrase: 'tàu ngầm', normPhrase: 'tau ngam', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.2 },
  { phrase: 'thủy cung', normPhrase: 'thuy cung', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.5 },
  { phrase: 'rạn san hô', normPhrase: 'ran san ho', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.2, assetId: 'ocean-coral' },
  { phrase: 'sinh vật biển', normPhrase: 'sinh vat bien', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.6 },
  { phrase: 'dưới biển', normPhrase: 'duoi bien', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 3.2 },
  { phrase: 'bờ biển', normPhrase: 'bo bien', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 2.8 },
  { phrase: 'biển', normPhrase: 'bien', theme: 'OCEAN', entityType: 'spatial_anchor', weight: 2.5 },

  // --- OCEAN ENTITIES ---
  { phrase: 'cá hề', normPhrase: 'ca he', theme: 'OCEAN', entityType: 'animal', weight: 1.8, assetId: 'ocean-clownfish' },
  { phrase: 'rùa biển', normPhrase: 'rua bien', theme: 'OCEAN', entityType: 'animal', weight: 1.8, assetId: 'ocean-turtle' },
  { phrase: 'sao biển', normPhrase: 'sao bien', theme: 'OCEAN', entityType: 'animal', weight: 1.8, assetId: 'ocean-starfish' },
  { phrase: 'bạch tuộc', normPhrase: 'bach tuoc', theme: 'OCEAN', entityType: 'animal', weight: 1.6, assetId: 'ocean-octopus' },
  { phrase: 'cá heo', normPhrase: 'ca heo', theme: 'OCEAN', entityType: 'animal', weight: 1.6, assetId: 'ocean-dolphin' },
  { phrase: 'san hô', normPhrase: 'san ho', theme: 'OCEAN', entityType: 'plant', weight: 1.5, assetId: 'ocean-coral' },
  { phrase: 'cá', normPhrase: 'ca', theme: 'OCEAN', entityType: 'animal', weight: 1.0, assetId: 'anim-fish' },

  // --- SPACE SPATIAL ANCHORS (Trọng số không gian 3.5) ---
  { phrase: 'vũ trụ', normPhrase: 'vu tru', theme: 'SPACE', entityType: 'spatial_anchor', weight: 4.0 },
  { phrase: 'dải ngân hà', normPhrase: 'dai ngan ha', theme: 'SPACE', entityType: 'spatial_anchor', weight: 4.0 },
  { phrase: 'thiên hà', normPhrase: 'thien ha', theme: 'SPACE', entityType: 'spatial_anchor', weight: 3.8 },
  { phrase: 'ngoài không gian', normPhrase: 'ngoai khong gian', theme: 'SPACE', entityType: 'spatial_anchor', weight: 3.8 },
  { phrase: 'hệ mặt trời', normPhrase: 'he mat troi', theme: 'SPACE', entityType: 'spatial_anchor', weight: 3.8 },
  { phrase: 'trạm vũ trụ', normPhrase: 'tram vu tru', theme: 'SPACE', entityType: 'spatial_anchor', weight: 3.5 },
  { phrase: 'hành tinh', normPhrase: 'hanh tinh', theme: 'SPACE', entityType: 'spatial_anchor', weight: 3.2, assetId: 'space-planet' },

  // --- SPACE ENTITIES ---
  { phrase: 'tên lửa', normPhrase: 'ten lua', theme: 'SPACE', entityType: 'object', weight: 2.0, assetId: 'space-rocket' },
  { phrase: 'phi thuyền', normPhrase: 'phi thuyen', theme: 'SPACE', entityType: 'object', weight: 2.0, assetId: 'space-rocket' },
  { phrase: 'tàu vũ trụ', normPhrase: 'tau vu tru', theme: 'SPACE', entityType: 'object', weight: 2.0, assetId: 'space-rocket' },
  { phrase: 'đĩa bay', normPhrase: 'dia bay', theme: 'SPACE', entityType: 'object', weight: 1.8, assetId: 'space-ufo' },
  { phrase: 'ufo', normPhrase: 'ufo', theme: 'SPACE', entityType: 'object', weight: 1.8, assetId: 'space-ufo' },
  { phrase: 'người ngoài hành tinh', normPhrase: 'nguoi ngoai hanh tinh', theme: 'SPACE', entityType: 'character', weight: 1.8, assetId: 'space-alien' },
  { phrase: 'alien', normPhrase: 'alien', theme: 'SPACE', entityType: 'character', weight: 1.8, assetId: 'space-alien' },
  { phrase: 'sao băng', normPhrase: 'sao bang', theme: 'SPACE', entityType: 'object', weight: 1.5, assetId: 'space-meteor' },
  { phrase: 'mặt trăng', normPhrase: 'mat trang', theme: 'SPACE', entityType: 'object', weight: 1.5, assetId: 'space-planet' },

  // --- CLASSROOM SPATIAL ANCHORS & TOOLS ---
  { phrase: 'lớp học', normPhrase: 'lop hoc', theme: 'CLASSROOM', entityType: 'spatial_anchor', weight: 3.5 },
  { phrase: 'trường học', normPhrase: 'truong hoc', theme: 'CLASSROOM', entityType: 'spatial_anchor', weight: 3.5 },
  { phrase: 'hộp bút', normPhrase: 'hop but', theme: 'CLASSROOM', entityType: 'tool', weight: 2.2 },
  { phrase: 'thước kẻ', normPhrase: 'thuoc ke', theme: 'CLASSROOM', entityType: 'tool', weight: 2.2 },
  { phrase: 'compa', normPhrase: 'compa', theme: 'CLASSROOM', entityType: 'tool', weight: 2.2 },
  { phrase: 'bút chì', normPhrase: 'but chi', theme: 'CLASSROOM', entityType: 'tool', weight: 1.5 },
  { phrase: 'cục tẩy', normPhrase: 'cuc tay', theme: 'CLASSROOM', entityType: 'tool', weight: 1.5 },
  { phrase: 'sách vở', normPhrase: 'sach vo', theme: 'CLASSROOM', entityType: 'tool', weight: 1.5 },

  // --- JUNGLE SPATIAL ANCHORS & ENTITIES ---
  { phrase: 'rừng xanh', normPhrase: 'rung xanh', theme: 'JUNGLE', entityType: 'spatial_anchor', weight: 3.8, assetId: 'jungle-tree' },
  { phrase: 'rừng rậm', normPhrase: 'rung ram', theme: 'JUNGLE', entityType: 'spatial_anchor', weight: 3.8, assetId: 'jungle-tree' },
  { phrase: 'rừng nhiệt đới', normPhrase: 'rung nhiet doi', theme: 'JUNGLE', entityType: 'spatial_anchor', weight: 3.8, assetId: 'jungle-tree' },
  { phrase: 'rừng', normPhrase: 'rung', theme: 'JUNGLE', entityType: 'spatial_anchor', weight: 2.5, assetId: 'jungle-tree' },
  { phrase: 'con khỉ', normPhrase: 'con khi', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-monkey' },
  { phrase: 'chú khỉ', normPhrase: 'chu khi', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-monkey' },
  { phrase: 'con hổ', normPhrase: 'con ho', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-tiger' },
  { phrase: 'chú hổ', normPhrase: 'chu ho', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-tiger' },
  { phrase: 'con voi', normPhrase: 'con voi', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-elephant' },
  { phrase: 'chú voi', normPhrase: 'chu voi', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-elephant' },
  { phrase: 'hươu cao cổ', normPhrase: 'huou cao co', theme: 'JUNGLE', entityType: 'animal', weight: 1.8, assetId: 'jungle-giraffe' },
  { phrase: 'cây cổ thụ', normPhrase: 'cay co thu', theme: 'JUNGLE', entityType: 'plant', weight: 1.5, assetId: 'jungle-tree' },
]

// Sắp xếp các cụm từ theo độ dài giảm dần để ưu tiên cụm từ dài (vd: "rãnh mariana" trước "mariana", "bác nông dân" trước "nông dân")
LEXICON.sort((a, b) => b.normPhrase.length - a.normPhrase.length)

const THEME_METADATA = {
  OCEAN: {
    key: 'ocean' as const,
    bg: '/assets/themes/ocean/bg-ocean.svg',
    mascot: '/assets/mascots/sam.svg',
    mascotName: 'Rùa Biển Sam',
  },
  FARM: {
    key: 'farm' as const,
    bg: '/assets/themes/farm/bg-farm.svg',
    mascot: '/assets/mascots/pippy.svg',
    mascotName: 'Gà Con Pippy',
  },
  SPACE: {
    key: 'space' as const,
    bg: '/assets/themes/space/bg-space.svg',
    mascot: '/assets/mascots/leo.svg',
    mascotName: 'Bé Phi Hành Gia Leo',
  },
  JUNGLE: {
    key: 'jungle' as const,
    bg: '/assets/themes/jungle/bg-jungle.svg',
    mascot: '/assets/mascots/mimi.svg',
    mascotName: 'Mèo Cam Mimi',
  },
}

/**
 * Phân tích thực thể và ngữ cảnh ngữ nghĩa tự nhiên từ văn bản đề bài
 */
export function extractSemantics(rawInput: string): SemanticExtractionResult {
  const normInput = normalizeKeyword(rawInput)
  const scores: Record<GameWorldTheme, number> = {
    OCEAN: 0,
    FARM: 0,
    SPACE: 0,
    JUNGLE: 0,
    CLASSROOM: 0,
  }

  const detectedEntities: VisualEntity[] = []
  const matchedPhrases = new Set<string>()

  // Quét từ điển thực thể ngữ nghĩa
  for (const entry of LEXICON) {
    const regex = new RegExp(`(^|\\s)${entry.normPhrase}(\\s|$)`, 'i')
    if (regex.test(normInput)) {
      // Tránh đếm trùng từ con nếu từ cha đã khớp (ví dụ: "bác nông dân" đã khớp thì không đếm lặp "nông dân")
      const isSubPhrase = [...matchedPhrases].some((p) => p.includes(entry.normPhrase) && p !== entry.normPhrase)
      if (isSubPhrase) continue

      matchedPhrases.add(entry.normPhrase)

      // Tìm URL asset tương ứng
      let assetUrl = entry.assetId
        ? ASSET_CATALOG.find((a) => a.id === entry.assetId)?.url
        : resolveAssetUrl(entry.phrase)

      if (!assetUrl) {
        assetUrl = resolveAssetUrl(entry.phrase) ?? undefined
      }

      const entity: VisualEntity = {
        name: entry.phrase,
        rawText: entry.phrase,
        entityType: entry.entityType,
        themeAffinity: entry.theme,
        weight: entry.weight,
        mappedAssetUrl: assetUrl ?? undefined,
      }

      detectedEntities.push(entity)
      scores[entry.theme] += entry.weight
    }
  }

  // Phân tích Spatial Anchor (Chủ thể không gian)
  const spatialAnchors = detectedEntities.filter((e) => e.entityType === 'spatial_anchor')
  const primarySpatialAnchor = spatialAnchors.sort((a, b) => b.weight - a.weight)[0]

  // Context Disambiguation (Giải quyết mâu thuẫn ngữ cảnh):
  // 1. Nếu có Spatial Anchor rõ rệt (trọng số >= 2.5), nó sẽ đóng vai trò quyết định không gian
  let winningTheme: 'OCEAN' | 'FARM' | 'SPACE' | 'JUNGLE' = 'JUNGLE'
  let reasoning = ''

  // Nếu bối cảnh là CLASSROOM (hộp bút, thước kẻ, đồ dùng học tập), fallback sang JUNGLE
  if (scores.CLASSROOM > 0 && scores.CLASSROOM >= Math.max(scores.OCEAN, scores.FARM, scores.SPACE, scores.JUNGLE)) {
    winningTheme = 'JUNGLE'
    const tools = detectedEntities.filter((e) => e.themeAffinity === 'CLASSROOM').map((e) => `'${e.name}'`).join(', ')
    reasoning = `Các thực thể học tập (${tools}) thuộc bối cảnh Lớp học, hiển thị giao diện sinh động với thế giới Rừng Xanh (JUNGLE).`
  } else if (primarySpatialAnchor && scores[primarySpatialAnchor.themeAffinity] > 0) {
    const anchorTheme = primarySpatialAnchor.themeAffinity === 'CLASSROOM' ? 'JUNGLE' : primarySpatialAnchor.themeAffinity
    winningTheme = anchorTheme

    // Kiểm tra xem có mâu thuẫn ngữ cảnh thú vị nào không
    if (primarySpatialAnchor.themeAffinity === 'FARM' && (normInput.includes('vit') || normInput.includes('ao') || normInput.includes('ca'))) {
      reasoning = `Chủ thể không gian '${primarySpatialAnchor.name}' xác định bối cảnh Nông trại (FARM), dù có chi tiết ao nước/thủy sinh.`
    } else if (primarySpatialAnchor.name.includes('mariana') || primarySpatialAnchor.name.includes('lan')) {
      reasoning = `Chủ thể không gian '${primarySpatialAnchor.name}' xác định bối cảnh thám hiểm Đại dương sâu (OCEAN).`
    } else {
      reasoning = `Chủ thể không gian '${primarySpatialAnchor.name}' (trọng số ${primarySpatialAnchor.weight}) xác định bối cảnh chính là ${winningTheme}.`
    }
  } else {
    // Nếu không có Spatial Anchor mạnh, chọn theme có tổng điểm thực thể cao nhất
    const eligibleThemes: Array<'OCEAN' | 'FARM' | 'SPACE' | 'JUNGLE'> = ['OCEAN', 'FARM', 'SPACE', 'JUNGLE']
    eligibleThemes.sort((a, b) => scores[b] - scores[a])

    if (scores[eligibleThemes[0]] > 0) {
      winningTheme = eligibleThemes[0]
      const topEntities = detectedEntities.filter((e) => e.themeAffinity === winningTheme).map((e) => `'${e.name}'`).join(', ')
      reasoning = `Tổng hợp các thực thể trực quan (${topEntities}) xác định thế giới ${winningTheme}.`
    } else {
      winningTheme = 'JUNGLE'
      reasoning = 'Không phát hiện từ khóa không gian đặc thù, áp dụng chủ đề Rừng Xanh thân thiện mặc định.'
    }
  }

  const meta = THEME_METADATA[winningTheme]

  return {
    theme: winningTheme,
    themeKey: meta.key,
    backgroundUrl: meta.bg,
    mascotUrl: meta.mascot,
    mascotName: meta.mascotName,
    visualEntities: detectedEntities,
    primarySpatialAnchor,
    reasoning,
    scores,
  }
}
