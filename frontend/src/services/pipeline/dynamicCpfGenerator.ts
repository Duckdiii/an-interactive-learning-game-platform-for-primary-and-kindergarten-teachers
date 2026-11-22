/**
 * dynamicCpfGenerator.ts
 * Composable Primitives Framework (CPF) Dynamic Scene Graph Generator.
 * 100% Dynamic - ZERO hardcoded mock data.
 * Synthesizes interactive physics games (SLING, CATCHER, DIRECT_TAP) directly
 * from natural pedagogical prompts and mathematical constraints.
 */

import { parsePedagogicalConstraints } from './constraintParser'
import { toMatchText } from '../../utils/phraseMatch'
import { CANDY_PALETTE, UI_SPECS } from './assetPalette'
import { resolveGameTheme } from './themeResolver'
import type {
  CpfSceneGraph,
  CpfSceneNode,
  CpfActionRule,
  CpfMechanicType,
  CpfShapeKind,
} from './cpfTypes'

/**
 * Generate distinct numbers adhering to pedagogical constraints (even/odd parity).
 */
function generateDistinctNumbers(
  ruleType: 'is_even' | 'is_odd',
  rangeMax: number
): { numbers: number[]; targetCount: number } {
  const safeRangeMax = Math.max(10, rangeMax)
  const evens = new Set<number>()
  const odds = new Set<number>()

  // 1. Generate target candidates
  let attempts = 0
  const maxAttempts = 300

  while (attempts++ < maxAttempts && (evens.size < 3 || odds.size < 3)) {
    const r = Math.floor(Math.random() * (safeRangeMax - 1)) + 2
    if (r % 2 === 0) {
      if (evens.size < 3) evens.add(r)
    } else {
      if (odds.size < 3) odds.add(r)
    }
  }

  // Fallback safety generation if random draw was sparse
  let fallbackEven = 2
  while (evens.size < 3) {
    if (!evens.has(fallbackEven)) evens.add(fallbackEven)
    fallbackEven += 2
  }
  let fallbackOdd = 1
  while (odds.size < 3) {
    if (!odds.has(fallbackOdd)) odds.add(fallbackOdd)
    fallbackOdd += 2
  }

  const evenArr = Array.from(evens).slice(0, 3)
  const oddArr = Array.from(odds).slice(0, 3)

  let combined: number[]
  if (ruleType === 'is_even') {
    // 3 even targets + 2 odd distractors
    combined = [evenArr[0], evenArr[1], evenArr[2], oddArr[0], oddArr[1]]
  } else {
    // 3 odd targets + 2 even distractors
    combined = [oddArr[0], oddArr[1], oddArr[2], evenArr[0], evenArr[1]]
  }

  // Shuffle combined array
  const shuffled = combined.sort(() => Math.random() - 0.5)
  return { numbers: shuffled, targetCount: 3 }
}

/**
 * Generate fully dynamic CPF Scene Graph from natural teacher prompt.
 */
export function generateDynamicCpfSceneGraph(
  prompt: string,
  gradeLevel?: number | string,
  subject?: string
): CpfSceneGraph {
  // -------------------------------------------------------------------------
  // STEP 1: SEMANTIC & CONSTRAINT PARSING
  // -------------------------------------------------------------------------
  const constraints = parsePedagogicalConstraints(prompt)

  let resolvedGradeNum: number | undefined
  if (typeof gradeLevel === 'number') {
    resolvedGradeNum = gradeLevel
  } else if (typeof gradeLevel === 'string') {
    const match = gradeLevel.match(/\d+/)
    if (match) resolvedGradeNum = parseInt(match[0], 10)
    else if (gradeLevel.toUpperCase().includes('KINDER')) resolvedGradeNum = 1
  }

  const grade = (
    resolvedGradeNum ??
    (constraints.gradeLevel ? Number(constraints.gradeLevel) : 2)
  ) as 1 | 2 | 3 | 4 | 5

  const pedagogicalSubject = (
    subject === 'Vietnamese' || constraints.subject === 'VIETNAMESE'
      ? 'Vietnamese'
      : subject === 'Science' || constraints.subject === 'SCIENCE'
      ? 'Science'
      : 'Math'
  ) as 'Math' | 'Vietnamese' | 'Science'

  const rangeMax = Math.max(10, constraints.rangeMax || (grade === 1 ? 20 : 100))
  const resolvedTheme = resolveGameTheme(prompt, pedagogicalSubject)
  const themeKey = resolvedTheme.key
  const normalized = toMatchText(prompt)

  // Determine parity logic (even or odd)
  const isOdd =
    /(so le|chữ số lẻ|chu so le|tìm số lẻ|tim so le|số lẻ|\blẻ\b|odd)/i.test(prompt) ||
    /(\bso le\b|\ble\b|\bodd\b)/i.test(normalized)
  const ruleType: 'is_even' | 'is_odd' = isOdd ? 'is_odd' : 'is_even'
  const ruleLabel = isOdd ? 'số lẻ' : 'số chẵn'

  // -------------------------------------------------------------------------
  // STEP 2: MECHANIC SELECTION
  // -------------------------------------------------------------------------
  let mechanicType: CpfMechanicType
  if (
    /(hứng|bắt|nhặt|rơi|giỏ|rổ)/i.test(prompt) ||
    /(hung|bat|nhat|roi|gio|ro)/i.test(normalized)
  ) {
    mechanicType = 'FALLING_CATCHER'
  } else if (
    /(bắn|ná|cung|kéo|tên|phóng)/i.test(prompt) ||
    /(ban|na|cung|keo|ten|phong)/i.test(normalized)
  ) {
    mechanicType = 'PHYSICS_SLING_ARCHERY'
  } else {
    // Default or tap/pop keywords
    mechanicType = 'POP_TAPPER'
  }

  // -------------------------------------------------------------------------
  // STEP 3: DYNAMIC NUMBER & ASSET SYNTHESIS
  // -------------------------------------------------------------------------
  const { numbers } = generateDistinctNumbers(ruleType, rangeMax)
  const colors = CANDY_PALETTE.balloonColors

  // Theme styling
  const themeStyles = {
    FARM: {
      bg: '#FFF8E1',
      catcherFill: '#8D6E63',
      targetShape: 'apple' as CpfShapeKind,
      worldName: 'Nông Trại',
      itemName: 'quả táo',
    },
    OCEAN: {
      bg: '#E0F7FA',
      catcherFill: '#0288D1',
      targetShape: 'bubble' as CpfShapeKind,
      worldName: 'Đại Dương',
      itemName: 'viên ngọc',
    },
    SPACE: {
      bg: '#0F172A',
      catcherFill: '#6366F1',
      targetShape: 'star' as CpfShapeKind,
      worldName: 'Vũ Trụ',
      itemName: 'ngôi sao',
    },
    JUNGLE: {
      bg: '#E8F5E9',
      catcherFill: '#5D4037',
      targetShape: 'fruit' as CpfShapeKind,
      worldName: 'Rừng Xanh',
      itemName: 'hạt dẻ',
    },
    FOREST: {
      bg: '#E8F5E9',
      catcherFill: '#5D4037',
      targetShape: 'fruit' as CpfShapeKind,
      worldName: 'Rừng Xanh',
      itemName: 'hạt dẻ',
    },
    CANDY: {
      bg: '#FFF1F2',
      catcherFill: '#F43F5E',
      targetShape: 'fruit' as CpfShapeKind,
      worldName: 'Vương Quốc Kẹo',
      itemName: 'viên kẹo',
    },
  }[themeKey] || {
    bg: '#FFF8E1',
    catcherFill: '#8D6E63',
    targetShape: 'apple' as CpfShapeKind,
    worldName: 'Nông Trại',
    itemName: 'quả táo',
  }

  // Dynamic titles and pedagogical instructions
  let title = ''
  let description = ''

  if (mechanicType === 'FALLING_CATCHER') {
    title = `Hứng ${ruleLabel} ${themeStyles.worldName}`
    description = `Di chuyển giỏ để hứng các ${themeStyles.itemName} mang ${ruleLabel} đang rơi xuống!`
  } else if (mechanicType === 'PHYSICS_SLING_ARCHERY') {
    title = `Bắn Cung ${ruleLabel} ${themeStyles.worldName}`
    description = `Kéo ná và nhắm bắn vào các mục tiêu mang ${ruleLabel}!`
  } else {
    title = `Chạm Nổ ${ruleLabel} ${themeStyles.worldName}`
    description = `Chạm thật nhanh vào các bong bóng mang ${ruleLabel} để ghi điểm!`
  }

  // -------------------------------------------------------------------------
  // STEP 4: ASSEMBLE SCENE GRAPH NODES & ACTION RULES
  // -------------------------------------------------------------------------
  const nodes: CpfSceneNode[] = []
  const rules: CpfActionRule[] = []

  if (mechanicType === 'FALLING_CATCHER') {
    // 1. Catcher Basket Node
    nodes.push({
      id: 'catcher_basket',
      role: 'catcher',
      x: 960,
      y: 880,
      visual: {
        type: 'SPRITE',
        shapeKind: themeKey === 'SPACE' ? 'rect' : 'basket',
        width: 180,
        height: 90,
        fill: themeStyles.catcherFill,
        stroke: CANDY_PALETTE.inkBorder,
        strokeWidth: UI_SPECS.borderWidth,
      },
      interaction: {
        type: 'CATCHER',
        width: 180,
        height: 90,
        speed: 12,
      },
      collider: {
        type: 'aabb',
        width: 180,
        height: 90,
        tag: 'catcher',
      },
    })

    // 2. Falling Target Nodes
    const colX = [280, 620, 960, 1300, 1640]
    numbers.forEach((num, idx) => {
      const color = colors[idx % colors.length]
      const isTarget = ruleType === 'is_even' ? num % 2 === 0 : num % 2 !== 0

      nodes.push({
        id: `falling_item_${idx + 1}`,
        role: 'target',
        x: colX[idx],
        y: 110 + (idx % 3) * 55,
        visual: {
          type: 'SPRITE',
          shapeKind: themeStyles.targetShape,
          width: 88,
          height: 88,
          fill: color.fill,
          stroke: CANDY_PALETTE.inkBorder,
          strokeWidth: UI_SPECS.borderWidth,
          highlightFill: color.highlight,
        },
        motion: {
          type: 'ITEM_FALL',
          speed: 2.8 + idx * 0.35,
          gravity: 0.15,
          resetY: 100,
        },
        collider: {
          type: 'circle',
          radius: 44,
          tag: 'falling_item',
        },
        metadata: {
          numberValue: num,
          isEven: num % 2 === 0,
          isTarget,
        },
      })
    })

    // 3. Collision Action Rule
    rules.push({
      id: 'rule_catch_item',
      trigger: 'ON_COLLIDE',
      sourceTag: 'falling_item',
      targetTag: 'catcher',
      logicCheck: {
        type: 'CHECK_ANSWER',
        rule: ruleType,
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
    })
  } else if (mechanicType === 'PHYSICS_SLING_ARCHERY') {
    // 1. Bow Base
    nodes.push({
      id: 'bow_base',
      role: 'bow',
      x: 250,
      y: 540,
      visual: {
        type: 'SPRITE',
        shapeKind: 'bow',
        width: 60,
        height: 180,
        fill: themeStyles.catcherFill,
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
    })

    // 2. Bowstring
    nodes.push({
      id: 'bow_string',
      role: 'bowstring',
      x: 250,
      y: 540,
      visual: {
        type: 'LINE',
        points: [250, 440, 250, 540, 250, 640],
        stroke: CANDY_PALETTE.inkBorder,
        strokeWidth: 4,
        lineCap: 'round',
      },
    })

    // 3. Floating Target Balloons
    const balloonPositions = [
      { x: 1150, y: 340, speed: 1.8, amp: 35 },
      { x: 1380, y: 260, speed: 2.1, amp: 45 },
      { x: 1620, y: 420, speed: 1.6, amp: 30 },
      { x: 1260, y: 700, speed: 2.0, amp: 40 },
      { x: 1500, y: 780, speed: 1.7, amp: 48 },
    ]

    numbers.forEach((num, idx) => {
      const pos = balloonPositions[idx]
      const color = colors[idx % colors.length]
      const isTarget = ruleType === 'is_even' ? num % 2 === 0 : num % 2 !== 0

      nodes.push({
        id: `balloon_${idx + 1}`,
        role: 'target',
        x: pos.x,
        y: pos.y,
        visual: {
          type: 'SPRITE',
          shapeKind: themeKey === 'SPACE' ? 'star' : 'balloon',
          width: 100,
          height: 130,
          fill: color.fill,
          stroke: CANDY_PALETTE.inkBorder,
          strokeWidth: UI_SPECS.borderWidth,
          highlightFill: color.highlight,
        },
        motion: {
          type: 'FLOAT',
          amplitude: pos.amp,
          frequency: pos.speed,
        },
        collider: {
          type: 'circle',
          radius: 50,
          tag: 'balloon',
        },
        metadata: {
          numberValue: num,
          isEven: num % 2 === 0,
          isTarget,
        },
      })
    })

    // 4. Collision Rule (Arrow -> Balloon)
    rules.push({
      id: 'rule_arrow_balloon_collide',
      trigger: 'ON_COLLIDE',
      sourceTag: 'arrow',
      targetTag: 'balloon',
      logicCheck: {
        type: 'CHECK_ANSWER',
        rule: ruleType,
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
        sound: 'SFX_POP',
      },
      onFailure: {
        scoreDelta: 0,
        shake: {
          type: 'SHAKE',
          intensity: 14,
          durationMs: 250,
        },
        sound: 'SFX_WRONG',
      },
    })
  } else {
    // POP_TAPPER
    const bubblePositions = [
      { x: 380, y: 340, speed: 1.6, amp: 35 },
      { x: 720, y: 550, speed: 2.0, amp: 40 },
      { x: 1060, y: 320, speed: 1.8, amp: 30 },
      { x: 1400, y: 580, speed: 2.2, amp: 45 },
      { x: 1680, y: 360, speed: 1.7, amp: 35 },
    ]

    numbers.forEach((num, idx) => {
      const pos = bubblePositions[idx]
      const color = colors[idx % colors.length]
      const isTarget = ruleType === 'is_even' ? num % 2 === 0 : num % 2 !== 0

      nodes.push({
        id: `bubble_${idx + 1}`,
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
          amplitude: pos.amp,
          frequency: pos.speed,
        },
        interaction: {
          type: 'DIRECT_TAP',
          actionId: `tap_bubble_${idx + 1}`,
        },
        collider: {
          type: 'circle',
          radius: 55,
          tag: 'bubble',
        },
        metadata: {
          numberValue: num,
          isEven: num % 2 === 0,
          isTarget,
        },
      })
    })

    rules.push({
      id: 'rule_tap_bubble',
      trigger: 'ON_TAP',
      sourceTag: 'bubble',
      logicCheck: {
        type: 'CHECK_ANSWER',
        rule: ruleType,
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
    })
  }

  return {
    schemaVersion: 'cpf.v1.0.0',
    mechanicType,
    title,
    pedagogicalSubject,
    gradeLevel: grade,
    description,
    stage: {
      width: UI_SPECS.stageWidth,
      height: UI_SPECS.stageHeight,
      backgroundColor: themeStyles.bg,
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
    metadata: {
      theme: themeKey,
      themeName: resolvedTheme.name,
      mascot: resolvedTheme.mascot,
      ruleType,
      ruleLabel,
    },
  }
}
