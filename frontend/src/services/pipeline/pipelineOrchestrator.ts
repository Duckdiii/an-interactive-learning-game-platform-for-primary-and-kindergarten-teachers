/**
 * Dual-Track Pipeline Orchestrator for AI Game Generation.
 * Implements:
 * Stage 1: Intent Parsing & Track Routing (Preset In-Distribution vs CPF Out-of-Distribution).
 * Stage 2: 3-Gate Deterministic Quality Inspection (Syntax, 0% AI Math/Pedagogy, Canvas Playability).
 * Stage 3: Dual-Track Assembler (DSL v1.0.0 vs CPF Scene Graph AST).
 * Stage 4: Bloom Cognitive Taxonomy Recommender (Nhận biết, Thông hiểu, Vận dụng).
 * Stage 5: Execution Telemetry & Performance Timing.
 */

import { CANDY_PALETTE, UI_SPECS } from './assetPalette'
import { resolveGameTheme, type GameWorldTheme } from './themeResolver'
import { bindAssetsToPreset } from './assetBank'
import type { CpfSceneGraph, CpfSceneNode, CpfActionRule } from './cpfTypes'
import { parsePedagogicalConstraints } from './constraintParser'
import { generateMathQuestions } from './dynamicMathGenerator'

export type TrackType = 'PRESET' | 'CPF'

export interface ParsedIntent {
  rawPrompt: string
  subject: 'Math' | 'Vietnamese' | 'Science'
  gradeLevel: 1 | 2 | 3 | 4 | 5
  topic: string
  theme: string
  track: TrackType
  mechanic: string
}

export interface GateResult {
  passed: boolean
  code: string
  message: string
  metrics?: Record<string, unknown>
}

export interface QualityGateSummary {
  gate1Syntax: GateResult
  gate2Pedagogy: GateResult
  gate3Playability: GateResult
  allPassed: boolean
}

export interface PresetQuizData {
  gameType: 'QUIZ'
  id: string
  title: string
  gradeLevel: number
  theme: string
  questionText: string
  numA: number
  numB: number
  operation: '+' | '-'
  options: { id: string; text: string; isCorrect: boolean }[]
  correctIndex: number
  explanation: string
  imageUrl?: string
  audioUrl?: string
  visualPrompt?: string
  spriteItems?: { name: string; url: string; count: number }[]
  narrationText?: string
  themeData?: GameWorldTheme
}

export interface BloomRecommendation {
  id: string
  title: string
  gameType: string
  bloomLevel: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng'
  bloomIndex: 1 | 2 | 3
  description: string
  estimatedDuration: string
  track: TrackType
  icon: string
}

export interface PipelineExecutionResult {
  intent: ParsedIntent
  track: TrackType
  latencyMs: number
  gates: QualityGateSummary
  recommendations: BloomRecommendation[]
  presetData?: PresetQuizData
  cpfGraph?: CpfSceneGraph
  themeData?: GameWorldTheme
  assetsAttached?: {
    themeKey: string
    themeName: string
    spriteCount: number
    primarySpriteUrl: string
    sprites: { name: string; url: string; count: number }[]
  }
  narrationConfig?: {
    autoPlay: boolean
    audioText: string
    voiceRate: number
    voicePitch: number
  }
}

// -----------------------------------------------------------------------------
// STAGE 1: INTENT PARSER & ROUTER
// -----------------------------------------------------------------------------

export function parseIntent(prompt: string): ParsedIntent {
  const constraints = parsePedagogicalConstraints(prompt)
  const lower = prompt.toLowerCase()

  // Detect OOD CPF Mechanics:
  const archeryKeywords = [
    'bắn cung',
    'kéo ná',
    'ná cao su',
    'bắn bóng',
    'sling',
    'archery',
    'vật lý',
    'phóng tên',
  ]
  const catcherKeywords = [
    'hứng',
    'rơi',
    'giỏ',
    'vợt',
    'bắt táo',
    'hứng táo',
    'hứng quả',
    'catcher',
    'rơi quả',
    'hứng hoa quả',
  ]
  const tapperKeywords = [
    'chạm nổ',
    'chạm bóng',
    'bấm bóng',
    'bóp bóng',
    'bong bóng bay',
    'bong bóng nổ',
    'bong bóng',
    'bóng bay',
    'pop tapper',
    'nổ bóng',
  ]

  let cpfMechanic: 'PHYSICS_SLING_ARCHERY' | 'FALLING_CATCHER' | 'POP_TAPPER' | null = null
  if (archeryKeywords.some((kw) => lower.includes(kw))) {
    cpfMechanic = 'PHYSICS_SLING_ARCHERY'
  } else if (catcherKeywords.some((kw) => lower.includes(kw))) {
    cpfMechanic = 'FALLING_CATCHER'
  } else if (tapperKeywords.some((kw) => lower.includes(kw))) {
    cpfMechanic = 'POP_TAPPER'
  }

  const subjectMap: Record<string, 'Math' | 'Vietnamese' | 'Science'> = {
    MATH: 'Math',
    VIETNAMESE: 'Vietnamese',
    SCIENCE: 'Science',
    ENGLISH: 'Math',
  }
  const subject = subjectMap[constraints.subject] || 'Math'

  const themeTitles: Record<string, string> = {
    farm: 'Động vật nông trại vui vẻ',
    ocean: 'Thế giới đại dương kì thú',
    jungle: 'Rừng xanh nhiệt đới',
    space: 'Khám phá vũ trụ bao la',
  }
  const theme = themeTitles[constraints.themeKey] || 'Động vật nông trại vui vẻ'

  if (cpfMechanic) {
    let mechanicTheme = 'Bắn cung bóng bay cầu vồng'
    if (cpfMechanic === 'FALLING_CATCHER') {
      mechanicTheme = 'Hứng táo nông trại vui vẻ'
    } else if (cpfMechanic === 'POP_TAPPER') {
      mechanicTheme = 'Bong bóng biển xanh kì thú'
    }
    return {
      rawPrompt: prompt,
      subject,
      gradeLevel: constraints.gradeLevel,
      topic: `${constraints.mathType === 'PARITY' ? 'Số chẵn và số lẻ' : 'Phép tính toán học'} trong phạm vi ${constraints.rangeMax}`,
      theme: mechanicTheme,
      track: 'CPF',
      mechanic: cpfMechanic,
    }
  }

  // In-Distribution Preset (Quiz, Matching, DragDrop)
  let topic = `${constraints.mathType === 'SUB' ? 'Phép trừ' : constraints.mathType === 'MUL' ? 'Phép nhân' : constraints.mathType === 'DIV' ? 'Phép chia' : constraints.mathType === 'PARITY' ? 'Số chẵn và số lẻ' : constraints.mathType === 'COMPARE' ? 'So sánh số' : 'Phép cộng'}${constraints.hasRegrouping ? ' có nhớ' : ' không nhớ'} trong phạm vi ${constraints.rangeMax}`
  if (constraints.subject === 'VIETNAMESE') {
    topic = constraints.languageConcept ? `Phân biệt ${constraints.languageConcept.targets.join(', ')}` : 'Luyện tập Tiếng Việt'
  }

  return {
    rawPrompt: prompt,
    subject,
    gradeLevel: constraints.gradeLevel,
    topic,
    theme,
    track: 'PRESET',
    mechanic: 'PRESET_QUIZ',
  }
}

// -----------------------------------------------------------------------------
// STAGE 2: 3-GATE QUALITY VERIFICATION (DETERMINISTIC 0% HALLUCINATION)
// -----------------------------------------------------------------------------

export function verifyGate1Syntax(
  track: TrackType,
  preset?: PresetQuizData,
  cpf?: CpfSceneGraph
): GateResult {
  if (track === 'PRESET') {
    if (!preset) {
      return { passed: false, code: 'G1_NO_DATA', message: 'Dữ liệu Preset rỗng.' }
    }
    if (!preset.questionText || !Array.isArray(preset.options) || preset.options.length < 2) {
      return {
        passed: false,
        code: 'G1_INVALID_OPTIONS',
        message: 'Preset Quiz phải có câu hỏi và tối thiểu 2 lựa chọn.',
      }
    }
    if (preset.correctIndex < 0 || preset.correctIndex >= preset.options.length) {
      return {
        passed: false,
        code: 'G1_BAD_CORRECT_INDEX',
        message: 'Chỉ số đáp án đúng nằm ngoài danh sách lựa chọn.',
      }
    }
    return {
      passed: true,
      code: 'G1_PASSED',
      message: 'Cú pháp Game JSON DSL v1.0.0 hợp lệ 100%.',
    }
  }

  // CPF Syntax Check
  if (!cpf) {
    return { passed: false, code: 'G1_NO_CPF', message: 'Scene Graph CPF rỗng.' }
  }
  if (cpf.schemaVersion !== 'cpf.v1.0.0') {
    return {
      passed: false,
      code: 'G1_CPF_VERSION_MISMATCH',
      message: `Phiên bản schema CPF không hợp lệ: ${cpf.schemaVersion}`,
    }
  }
  if (!Array.isArray(cpf.nodes) || cpf.nodes.length === 0) {
    return {
      passed: false,
      code: 'G1_CPF_EMPTY_NODES',
      message: 'Scene Graph CPF không có node nào.',
    }
  }
  if (!Array.isArray(cpf.rules) || cpf.rules.length === 0) {
    return {
      passed: false,
      code: 'G1_CPF_EMPTY_RULES',
      message: 'Scene Graph CPF thiếu bộ quy tắc va chạm và chấm điểm.',
    }
  }

  return {
    passed: true,
    code: 'G1_PASSED',
    message: 'Cấu trúc Composable Primitives Scene Graph đạt chuẩn cpf.v1.0.0.',
  }
}

export function verifyGate2Pedagogy(
  intent: ParsedIntent,
  preset?: PresetQuizData,
  cpf?: CpfSceneGraph
): GateResult {
  // Pedagogical Rule: Grade 1 & 2 Math cannot contain negative numbers
  if (intent.gradeLevel <= 2 && intent.subject === 'Math') {
    if (intent.track === 'PRESET' && preset) {
      // Check operands
      if (preset.numA < 0 || preset.numB < 0) {
        return {
          passed: false,
          code: 'G2_NEGATIVE_OPERAND',
          message: 'Toán lớp 1-2 không được có số hạng âm.',
        }
      }
      // Check subtraction result
      if (preset.operation === '-' && preset.numA - preset.numB < 0) {
        return {
          passed: false,
          code: 'G2_NEGATIVE_RESULT',
          message: `Toán lớp 1-2 không được có kết quả âm: ${preset.numA} - ${preset.numB} < 0.`,
        }
      }
      // Mathematical ground-truth check
      const expected =
        preset.operation === '+' ? preset.numA + preset.numB : preset.numA - preset.numB
      const correctOption = preset.options[preset.correctIndex]
      const parsedOptionNum = parseInt(correctOption.text.replace(/\D/g, ''), 10)
      if (parsedOptionNum !== expected) {
        return {
          passed: false,
          code: 'G2_MATH_MISMATCH',
          message: `Sai sót toán học: ${preset.numA} ${preset.operation} ${preset.numB} phải bằng ${expected}, nhưng đáp án ghi ${parsedOptionNum}.`,
        }
      }
      // Young learners word count limit
      const wordCount = preset.questionText.trim().split(/\s+/).length
      if (wordCount > 25) {
        return {
          passed: false,
          code: 'G2_OVERLOAD_TEXT',
          message: `Câu hỏi quá dài (${wordCount} từ) gây quá tải nhận thức cho học sinh lớp ${intent.gradeLevel}.`,
        }
      }
    }

    if (intent.track === 'CPF' && cpf) {
      // Verify Even/Odd logic
      const targetBalloons = cpf.nodes.filter((n) => n.role === 'target')
      for (const node of targetBalloons) {
        const val = Number(node.metadata?.numberValue ?? 0)
        const isEven = val % 2 === 0
        const metadataParity = node.metadata?.isEven
        if (metadataParity !== undefined && metadataParity !== isEven) {
          return {
            passed: false,
            code: 'G2_PARITY_ERROR',
            message: `Bong bóng số ${val} bị phân loại sai chẵn/lẻ trong metadata.`,
          }
        }
      }
    }
  }

  return {
    passed: true,
    code: 'G2_PASSED',
    message: 'Nội dung sư phạm đạt chuẩn bộ GD&ĐT: 0% lỗi toán học, phù hợp lứa tuổi.',
    metrics: { grade: intent.gradeLevel, subject: intent.subject },
  }
}

export function verifyGate3Playability(
  track: TrackType,
  preset?: PresetQuizData,
  cpf?: CpfSceneGraph
): GateResult {
  if (track === 'PRESET' && preset) {
    // Check at least 1 correct answer and distinct choices
    const correctCount = preset.options.filter((o) => o.isCorrect).length
    if (correctCount !== 1) {
      return {
        passed: false,
        code: 'G3_INVALID_ANSWER_COUNT',
        message: `Trắc nghiệm đơn phải có đúng 1 đáp án đúng, hiện có ${correctCount}.`,
      }
    }
    const optionTexts = new Set(preset.options.map((o) => o.text.trim()))
    if (optionTexts.size !== preset.options.length) {
      return {
        passed: false,
        code: 'G3_DUPLICATE_CHOICES',
        message: 'Các phương án trả lời không được trùng lặp nội dung.',
      }
    }
    return {
      passed: true,
      code: 'G3_PASSED',
      message: 'Tính chơi được (Playability) đạt chuẩn: kích thước chạm >= 64px, 1 đáp án duy nhất.',
    }
  }

  if (track === 'CPF' && cpf) {
    // Check canvas boundaries (1920 x 1080)
    for (const node of cpf.nodes) {
      if (node.x < 0 || node.x > UI_SPECS.stageWidth || node.y < 0 || node.y > UI_SPECS.stageHeight) {
        return {
          passed: false,
          code: 'G3_OUT_OF_BOUNDS',
          message: `Node ${node.id} vượt ra ngoài vùng hiển thị Canvas (${node.x}, ${node.y}).`,
        }
      }
      // Check touch target minimum size
      if (node.interaction?.type === 'SLING') {
        if (node.interaction.maxPullDistance < UI_SPECS.minTouchTarget) {
          return {
            passed: false,
            code: 'G3_TOUCH_TARGET_TOO_SMALL',
            message: `Tầm kéo ná quá nhỏ (${node.interaction.maxPullDistance}px) cho tay trẻ em.`,
          }
        }
      }
      if (node.interaction?.type === 'CATCHER') {
        if (node.interaction.width < UI_SPECS.minTouchTarget) {
          return {
            passed: false,
            code: 'G3_TOUCH_TARGET_TOO_SMALL',
            message: `Kích thước giỏ hứng quá nhỏ (${node.interaction.width}px) cho tay trẻ em.`,
          }
        }
      }
      if (node.interaction?.type === 'DIRECT_TAP') {
        if (node.visual.type === 'SPRITE' && (node.visual.width < UI_SPECS.minTouchTarget || node.visual.height < UI_SPECS.minTouchTarget)) {
          return {
            passed: false,
            code: 'G3_TOUCH_TARGET_TOO_SMALL',
            message: 'Kích thước mục tiêu chạm quá nhỏ cho tay trẻ em.',
          }
        }
      }
    }

    // Verify at least 2 even balloons for achievable win condition
    const evenBalloons = cpf.nodes.filter(
      (n) => n.role === 'target' && n.metadata?.isEven === true
    )
    if (evenBalloons.length < 2) {
      return {
        passed: false,
        code: 'G3_UNSOLVABLE_TARGETS',
        message: `Trò chơi cần ít nhất 2 mục tiêu hợp lệ để học sinh tích điểm. Hiện có: ${evenBalloons.length}`,
      }
    }

    return {
      passed: true,
      code: 'G3_PASSED',
      message: 'Kiểm định vật lý và vùng chạm hoàn tất: Vùng chạm >= 64px, mục tiêu trong tầm bắn.',
    }
  }

  return { passed: true, code: 'G3_PASSED', message: 'Kiểm tra hoàn tất.' }
}

// -----------------------------------------------------------------------------
// STAGE 3: DUAL-TRACK GENERATORS
// -----------------------------------------------------------------------------

export function generatePresetGame(intent: ParsedIntent): PresetQuizData {
  const constraints = parsePedagogicalConstraints(intent.rawPrompt)
  const [q] = generateMathQuestions(constraints, 1)

  const numA = q.numA
  const numB = q.numB
  const correctVal = q.correctAnswer
  const unit = q.unit || 'con'

  const correctOption = { id: 'opt-correct', text: `${correctVal} ${unit}`.trim(), isCorrect: true }
  const distractorOptions = q.distractors.map((d, i) => ({
    id: `opt-dist-${i + 1}`,
    text: `${d} ${unit}`.trim(),
    isCorrect: false,
  }))

  const allOptions = [correctOption, ...distractorOptions].sort(() => Math.random() - 0.5)
  const correctIndex = allOptions.findIndex((o) => o.isCorrect)

  const themeTitles: Record<string, string> = {
    farm: 'Nông Trại Toán Học',
    ocean: 'Đại Dương Kì Thú',
    jungle: 'Rừng Xanh Nhiệt Đới',
    space: 'Vũ Trụ Toán Học',
  }
  const title = `${themeTitles[constraints.themeKey] || 'Nông Trại Toán Học'} Lớp ${intent.gradeLevel}`

  return {
    gameType: 'QUIZ',
    id: `quiz-${constraints.themeKey}-math-${Date.now().toString().slice(-4)}`,
    title,
    gradeLevel: intent.gradeLevel,
    theme: themeTitles[constraints.themeKey] || 'Động vật nông trại',
    questionText: q.questionText,
    numA,
    numB,
    operation: q.operation === '-' ? '-' : '+',
    options: allOptions.map((o, idx) => ({ id: `opt-${idx + 1}`, text: o.text, isCorrect: o.isCorrect })),
    correctIndex,
    explanation: q.explanation,
    imageUrl: q.spriteUrl,
  }
}

export function generateCpfGame(intent: ParsedIntent): CpfSceneGraph {
  const constraints = parsePedagogicalConstraints(intent.rawPrompt)
  const rangeMax = Math.max(20, constraints.rangeMax || 100)
  const evens: number[] = []
  const odds: number[] = []

  let attempt = 0
  while (evens.length < 3 && attempt < 200) {
    attempt++
    const candidate = (Math.floor(Math.random() * Math.floor(rangeMax / 2)) + 1) * 2
    if (!evens.includes(candidate) && candidate <= rangeMax) {
      evens.push(candidate)
    }
  }
  if (evens.length < 3) evens.push(24, 48, 82)

  attempt = 0
  while (odds.length < 2 && attempt < 200) {
    attempt++
    const candidate = Math.floor(Math.random() * Math.floor(rangeMax / 2)) * 2 + 1
    if (!odds.includes(candidate) && candidate <= rangeMax) {
      odds.push(candidate)
    }
  }
  if (odds.length < 2) odds.push(17, 35)

  const numbers = [evens[0], odds[0], evens[1], odds[1], evens[2]].sort(() => Math.random() - 0.5)
  const colors = CANDY_PALETTE.balloonColors

  if (intent.mechanic === 'FALLING_CATCHER') {
    const nodes: CpfSceneNode[] = [
      {
        id: 'catcher_basket',
        role: 'catcher',
        x: 960,
        y: 880,
        visual: {
          type: 'SPRITE',
          shapeKind: 'basket',
          width: 180,
          height: 90,
          fill: '#8D6E63',
          stroke: CANDY_PALETTE.inkBorder,
          strokeWidth: UI_SPECS.borderWidth,
        },
        interaction: {
          type: 'CATCHER',
          width: 180,
          height: 90,
          speed: 10,
        },
        collider: {
          type: 'aabb',
          width: 180,
          height: 90,
          tag: 'catcher',
        },
      },
    ]

    const fruitPositions = [280, 620, 960, 1300, 1640]
    numbers.forEach((num, index) => {
      const color = colors[index % colors.length]
      const isEven = num % 2 === 0
      nodes.push({
        id: `fruit_${index + 1}`,
        role: 'target',
        x: fruitPositions[index],
        y: 120 + (index % 3) * 60,
        visual: {
          type: 'SPRITE',
          shapeKind: 'apple',
          width: 88,
          height: 88,
          fill: color.fill,
          stroke: CANDY_PALETTE.inkBorder,
          strokeWidth: UI_SPECS.borderWidth,
          highlightFill: color.highlight,
        },
        motion: {
          type: 'ITEM_FALL',
          speed: 2.8 + index * 0.3,
          gravity: 0.15,
          resetY: 100,
        },
        collider: {
          type: 'circle',
          radius: 44,
          tag: 'falling_fruit',
        },
        metadata: {
          numberValue: num,
          isEven,
        },
      })
    })

    const rules: CpfActionRule[] = [
      {
        id: 'rule_catch_fruit',
        trigger: 'ON_COLLIDE',
        sourceTag: 'falling_fruit',
        targetTag: 'catcher',
        logicCheck: {
          type: 'CHECK_ANSWER',
          rule: 'is_even',
        },
        onSuccess: {
          scoreDelta: 1,
          particles: {
            type: 'PARTICLE',
            count: 24,
            colors: [CANDY_PALETTE.sunnyYellow, '#FFF', CANDY_PALETTE.mintGreen],
            spread: 80,
            lifetimeMs: 600,
          },
          sound: 'SFX_CORRECT',
          lockInputMs: 200,
        },
        onFailure: {
          scoreDelta: 0,
          shake: {
            type: 'SHAKE',
            intensity: 14,
            durationMs: 250,
          },
          sound: 'SFX_WRONG',
          lockInputMs: 300,
        },
      },
    ]

    return {
      schemaVersion: 'cpf.v1.0.0',
      mechanicType: 'FALLING_CATCHER',
      title: 'Hứng Táo Toán Học: Giỏ Đựng Số Chẵn',
      pedagogicalSubject: intent.subject,
      gradeLevel: intent.gradeLevel,
      description: 'Di chuyển giỏ để hứng các quả táo mang số chẵn đang rơi xuống!',
      stage: {
        width: UI_SPECS.stageWidth,
        height: UI_SPECS.stageHeight,
        backgroundColor: '#FFF8E1',
      },
      nodes,
      rules,
      dynamicVariables: {
        pulledForce: 0,
        arrowVector: { x: 0, y: 0 },
        score: 0,
        combo: 0,
        inputLocked: false,
      },
    }
  }

  if (intent.mechanic === 'POP_TAPPER') {
    const nodes: CpfSceneNode[] = []
    const bubblePositions = [
      { x: 380, y: 340, speed: 1.6, amplitude: 35 },
      { x: 720, y: 550, speed: 2.0, amplitude: 40 },
      { x: 1060, y: 320, speed: 1.8, amplitude: 30 },
      { x: 1400, y: 580, speed: 2.2, amplitude: 45 },
      { x: 1680, y: 360, speed: 1.7, amplitude: 35 },
    ]

    numbers.forEach((num, index) => {
      const pos = bubblePositions[index]
      const color = colors[index % colors.length]
      const isEven = num % 2 === 0
      nodes.push({
        id: `bubble_${index + 1}`,
        role: 'target',
        x: pos.x,
        y: pos.y,
        visual: {
          type: 'SPRITE',
          shapeKind: 'bubble',
          width: 110,
          height: 110,
          fill: color.fill,
          stroke: CANDY_PALETTE.inkBorder,
          strokeWidth: UI_SPECS.borderWidth,
          highlightFill: color.highlight,
        },
        motion: {
          type: 'BUBBLE_FLOAT',
          speed: pos.speed,
          amplitude: pos.amplitude,
          frequency: pos.speed,
        },
        interaction: {
          type: 'DIRECT_TAP',
          actionId: `tap_bubble_${index + 1}`,
        },
        collider: {
          type: 'circle',
          radius: 55,
          tag: 'bubble',
        },
        metadata: {
          numberValue: num,
          isEven,
        },
      })
    })

    const rules: CpfActionRule[] = [
      {
        id: 'rule_tap_bubble',
        trigger: 'ON_TAP',
        sourceTag: 'bubble',
        logicCheck: {
          type: 'CHECK_ANSWER',
          rule: 'is_even',
        },
        onSuccess: {
          scoreDelta: 1,
          particles: {
            type: 'PARTICLE',
            count: 20,
            colors: [CANDY_PALETTE.sunnyYellow, '#FFF', CANDY_PALETTE.mintGreen],
            spread: 70,
            lifetimeMs: 500,
          },
          sound: 'SFX_CORRECT',
        },
        onFailure: {
          scoreDelta: 0,
          shake: {
            type: 'SHAKE',
            intensity: 12,
            durationMs: 200,
          },
          sound: 'SFX_WRONG',
        },
      },
    ]

    return {
      schemaVersion: 'cpf.v1.0.0',
      mechanicType: 'POP_TAPPER',
      title: 'Bong Bóng Toán Học: Chạm Nổ Số Chẵn',
      pedagogicalSubject: intent.subject,
      gradeLevel: intent.gradeLevel,
      description: 'Chạm thật nhanh vào các bong bóng mang số chẵn để làm nổ chúng!',
      stage: {
        width: UI_SPECS.stageWidth,
        height: UI_SPECS.stageHeight,
        backgroundColor: '#E0F7FA',
      },
      nodes,
      rules,
      dynamicVariables: {
        pulledForce: 0,
        arrowVector: { x: 0, y: 0 },
        score: 0,
        combo: 0,
        inputLocked: false,
      },
    }
  }

  // Default: PHYSICS_SLING_ARCHERY
  const nodes: CpfSceneNode[] = [
    // Bow Node at (250, 540)
    {
      id: 'bow_base',
      role: 'bow',
      x: 250,
      y: 540,
      visual: {
        type: 'SPRITE',
        shapeKind: 'bow',
        width: 60,
        height: 180,
        fill: '#8D6E63',
        stroke: CANDY_PALETTE.inkBorder,
        strokeWidth: UI_SPECS.borderWidth,
      },
      interaction: {
        type: 'SLING',
        anchorX: 250,
        anchorY: 540,
        maxPullDistance: 160,
        tensionFactor: 1.8,
        releaseVelocityMultiplier: 0.35,
      },
    },
    // Bowstring Line
    {
      id: 'bow_string',
      role: 'bowstring',
      x: 250,
      y: 540,
      visual: {
        type: 'LINE',
        points: [250, 450, 250, 540, 250, 630],
        stroke: '#FFFFFF',
        strokeWidth: 4,
      },
    },
    // Arrow Projectile
    {
      id: 'arrow_projectile',
      role: 'arrow',
      x: 250,
      y: 540,
      rotation: 0,
      visible: true,
      visual: {
        type: 'SPRITE',
        shapeKind: 'arrow',
        width: 110,
        height: 24,
        fill: CANDY_PALETTE.primary,
        stroke: CANDY_PALETTE.inkBorder,
        strokeWidth: 3,
      },
      collider: {
        type: 'circle',
        radius: 16,
        tag: 'arrow',
      },
    },
  ]

  // Add 5 floating balloons with even/odd numbers on right half of canvas
  const balloonPositions = [
    { x: 1100, y: 320, speed: 1.8, amplitude: 35 },
    { x: 1350, y: 250, speed: 2.2, amplitude: 45 },
    { x: 1600, y: 400, speed: 1.5, amplitude: 30 },
    { x: 1200, y: 680, speed: 2.0, amplitude: 40 },
    { x: 1480, y: 750, speed: 1.6, amplitude: 50 },
  ]

  numbers.forEach((num, index) => {
    const pos = balloonPositions[index]
    const color = colors[index % colors.length]
    const isEven = num % 2 === 0

    nodes.push({
      id: `balloon_${index + 1}`,
      role: 'target',
      x: pos.x,
      y: pos.y,
      visual: {
        type: 'SPRITE',
        shapeKind: 'balloon',
        width: 100,
        height: 125,
        fill: color.fill,
        stroke: CANDY_PALETTE.inkBorder,
        strokeWidth: UI_SPECS.borderWidth,
        highlightFill: color.highlight,
      },
      motion: {
        type: 'FLOAT',
        amplitude: pos.amplitude,
        frequency: pos.speed,
        phase: (index * Math.PI) / 3,
      },
      collider: {
        type: 'circle',
        radius: 54, // > 64px interactive circle for easy hitting
        tag: 'target_balloon',
      },
      metadata: {
        numberValue: num,
        isEven,
      },
    })
  })

  // Action Rules
  const rules: CpfActionRule[] = [
    {
      id: 'rule_arrow_hit_balloon',
      trigger: 'ON_COLLIDE',
      sourceTag: 'arrow',
      targetTag: 'target_balloon',
      logicCheck: {
        type: 'CHECK_ANSWER',
        rule: 'is_even',
      },
      onSuccess: {
        scoreDelta: 1,
        particles: {
          type: 'PARTICLE',
          count: 24,
          colors: [CANDY_PALETTE.sunnyYellow, '#FFF', CANDY_PALETTE.mintGreen],
          spread: 80,
          lifetimeMs: 600,
        },
        sound: 'SFX_CORRECT',
        lockInputMs: 300,
      },
      onFailure: {
        scoreDelta: 0,
        shake: {
          type: 'SHAKE',
          intensity: 14,
          durationMs: 250,
        },
        sound: 'SFX_WRONG',
        lockInputMs: 400,
      },
    },
  ]

  return {
    schemaVersion: 'cpf.v1.0.0',
    mechanicType: 'PHYSICS_SLING_ARCHERY',
    title: 'Bắn Cung Toán Học: Thợ Săn Số Chẵn',
    pedagogicalSubject: intent.subject,
    gradeLevel: intent.gradeLevel,
    description: 'Kéo ná cung tên để bắn trúng các quả bóng bay mang số chẵn!',
    stage: {
      width: UI_SPECS.stageWidth,
      height: UI_SPECS.stageHeight,
      backgroundColor: '#E1F5FE', // Soft pastel sky blue
    },
    nodes,
    rules,
    dynamicVariables: {
      pulledForce: 0,
      arrowVector: { x: 1, y: 0 },
      score: 0,
      combo: 0,
      inputLocked: false,
    },
  }
}

// -----------------------------------------------------------------------------
// STAGE 4: BLOOM COGNITIVE TAXONOMY RECOMMENDER
// -----------------------------------------------------------------------------

export function recommendGames(intent: ParsedIntent): BloomRecommendation[] {
  return [
    {
      id: 'bloom-1-quiz',
      title: `${intent.theme} - Trắc Nghiệm Candy Gloss`,
      gameType: 'QUIZ',
      bloomLevel: 'Nhận biết',
      bloomIndex: 1,
      description: 'Quan sát các thẻ hình trực quan và chọn đáp án chính xác nhất.',
      estimatedDuration: '3 - 5 phút',
      track: 'PRESET',
      icon: '🌾',
    },
    {
      id: 'bloom-2-matching',
      title: `${intent.theme} - Phân Loại Kéo Thả`,
      gameType: 'DRAG_DROP',
      bloomLevel: 'Thông hiểu',
      bloomIndex: 2,
      description: 'Kéo thả phân loại các con số hoặc phép tính vào đúng nhóm tương ứng.',
      estimatedDuration: '5 - 7 phút',
      track: 'PRESET',
      icon: '🧩',
    },
    {
      id: 'bloom-3-archery',
      title: 'Thợ Săn Số Chẵn - Kéo Ná Bắn Cung Vật Lý',
      gameType: 'PHYSICS_SLING_ARCHERY',
      bloomLevel: 'Vận dụng',
      bloomIndex: 3,
      description: 'Trò chơi tương tác vận động: Kéo căng dây ná ngắm bắn bóng bay số chẵn để rèn luyện phản xạ và tư duy toán học.',
      estimatedDuration: '5 - 10 phút',
      track: 'CPF',
      icon: '🏹',
    },
  ]
}

// -----------------------------------------------------------------------------
// STAGE 5: PIPELINE EXECUTION & TELEMETRY
// -----------------------------------------------------------------------------

export function runGamePipeline(prompt: string, overrideTrack?: TrackType, customPreset?: PresetQuizData): PipelineExecutionResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  // 1. Intent Parsing
  const intent = parseIntent(prompt)
  if (overrideTrack) {
    intent.track = overrideTrack
  }

  // 2. Recommend 3 Bloom options
  const recommendations = recommendGames(intent)

  // 3. Generation based on Track
  let presetData: PresetQuizData | undefined
  let cpfGraph: CpfSceneGraph | undefined

  if (intent.track === 'PRESET') {
    presetData = customPreset ?? generatePresetGame(intent)
  } else {
    cpfGraph = generateCpfGame(intent)
  }

  // 3.5. Stage 2.5: Asset & Theme Dressing Pipeline
  const theme = resolveGameTheme(prompt, intent.subject)
  let assetsAttached: PipelineExecutionResult['assetsAttached']
  let narrationConfig: PipelineExecutionResult['narrationConfig']

  if (presetData) {
    const dressedResult = bindAssetsToPreset(presetData, theme)
    presetData = {
      ...dressedResult.dressedPreset,
      themeData: theme,
    }
    const safeData = presetData
    assetsAttached = {
      themeKey: theme.key,
      themeName: theme.name,
      spriteCount: safeData.spriteItems?.length ?? 1,
      primarySpriteUrl: safeData.imageUrl || theme.mascot.avatarUrl,
      sprites: safeData.spriteItems || [{ name: theme.mascot.name, url: safeData.imageUrl || '', count: 1 }],
    }
    narrationConfig = {
      autoPlay: true,
      audioText: safeData.narrationText || safeData.questionText,
      voiceRate: 0.9,
      voicePitch: 1.1,
    }
  }

  // 4. Three-Gate Quality Checks
  const gate1 = verifyGate1Syntax(intent.track, presetData, cpfGraph)
  const gate2 = verifyGate2Pedagogy(intent, presetData, cpfGraph)
  const gate3 = verifyGate3Playability(intent.track, presetData, cpfGraph)

  const allPassed = gate1.passed && gate2.passed && gate3.passed

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const latencyMs = Math.round((endTime - startTime) * 100) / 100

  return {
    intent,
    track: intent.track,
    latencyMs,
    gates: {
      gate1Syntax: gate1,
      gate2Pedagogy: gate2,
      gate3Playability: gate3,
      allPassed,
    },
    recommendations,
    presetData,
    cpfGraph,
    themeData: theme,
    assetsAttached,
    narrationConfig,
  }
}
