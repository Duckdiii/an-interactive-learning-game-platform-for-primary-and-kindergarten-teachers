/**
 * Deterministic Dynamic Math Generator (Giai đoạn A)
 *
 * Sinh các bài toán số học xác định 100% tuân thủ:
 * - Chuẩn sư phạm bộ GD&ĐT (chương trình GDPT 2018)
 * - 0% Ảo giác (Ground-Truth Guaranteed):
 *   + Toán lớp 1-2 không bao giờ ra số âm hay số 0
 *   + Phép cộng/trừ có nhớ thoả mãn chính xác điều kiện hàng đơn vị
 *   + Phép chia hết, phép nhân chuẩn bảng cửu chương
 * - Sinh phương án nhiễu thông minh (Pedagogical Distractors):
 *   + Lỗi quên nhớ (+-10)
 *   + Lệch 1 đơn vị (+-1)
 *   + Nhầm phép tính
 * - Gắn với thế giới bối cảnh (Farm, Ocean, Jungle, Space) và Asset SVG thật
 */

import type { PedagogicalConstraints } from './constraintParser'

export interface GeneratedMathQuestion {
  questionText: string
  numA: number
  numB: number
  operation: '+' | '-' | '×' | '÷' | '>' | '<' | '='
  correctAnswer: number | string
  distractors: (number | string)[]
  explanation: string
  spriteName?: string
  spriteUrl?: string
  unit: string
}

interface ThematicEntity {
  name: string
  unit: string
  url: string
}

const THEME_ENTITIES: Record<'farm' | 'ocean' | 'jungle' | 'space', ThematicEntity[]> = {
  farm: [
    { name: 'chú gà', unit: 'con', url: '/assets/themes/farm/chicken.svg' },
    { name: 'chú vịt', unit: 'con', url: '/assets/themes/farm/duck.svg' },
    { name: 'chú cừu', unit: 'con', url: '/assets/themes/farm/sheep.svg' },
    { name: 'chú bò', unit: 'con', url: '/assets/themes/farm/cow.svg' },
    { name: 'quả táo', unit: 'quả', url: '/assets/themes/farm/apple.svg' },
    { name: 'củ cà rốt', unit: 'củ', url: '/assets/themes/farm/carrot.svg' },
    { name: 'quả dưa hấu', unit: 'quả', url: '/assets/themes/farm/watermelon.svg' },
  ],
  ocean: [
    { name: 'chú cá heo', unit: 'con', url: '/assets/themes/ocean/dolphin.svg' },
    { name: 'chú cá hề', unit: 'con', url: '/assets/themes/ocean/clownfish.svg' },
    { name: 'chú rùa biển', unit: 'con', url: '/assets/themes/ocean/turtle.svg' },
    { name: 'chú bạch tuộc', unit: 'con', url: '/assets/themes/ocean/octopus.svg' },
    { name: 'sao biển', unit: 'con', url: '/assets/themes/ocean/starfish.svg' },
  ],
  jungle: [
    { name: 'chú khỉ', unit: 'con', url: '/assets/themes/jungle/monkey.svg' },
    { name: 'chú voi', unit: 'con', url: '/assets/themes/jungle/elephant.svg' },
    { name: 'chú hổ', unit: 'con', url: '/assets/themes/jungle/tiger.svg' },
    { name: 'hươu cao cổ', unit: 'con', url: '/assets/themes/jungle/giraffe.svg' },
    { name: 'quả chuối', unit: 'quả', url: '/assets/fruits/banana.svg' },
  ],
  space: [
    { name: 'ngôi sao', unit: 'ngôi sao', url: '/assets/objects/star.svg' },
    { name: 'tên lửa', unit: 'chiếc', url: '/assets/themes/space/rocket.svg' },
    { name: 'hành tinh', unit: 'hành tinh', url: '/assets/themes/space/planet.svg' },
    { name: 'phi thuyền', unit: 'chiếc', url: '/assets/themes/space/ufo.svg' },
    { name: 'thiên thạch', unit: 'viên', url: '/assets/themes/space/meteor.svg' },
  ],
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Sinh bộ 2 số cho phép cộng thoả mãn điều kiện
 */
function generateAdditionOperands(rangeMax: number, hasRegrouping: boolean): [number, number] {
  // Phạm vi tối thiểu cho phép cộng có nhớ là 20
  const effectiveMax = Math.max(hasRegrouping ? 20 : 10, rangeMax)

  for (let attempt = 0; attempt < 500; attempt++) {
    if (hasRegrouping) {
      // Hàng đơn vị của a và b cộng lại >= 10
      const unitA = randInt(2, 9)
      const unitB = randInt(10 - unitA, 9)

      // Chọn hàng chục
      const maxTensTotal = Math.floor((effectiveMax - (unitA + unitB)) / 10)
      if (maxTensTotal < 0) continue

      const tensA = randInt(0, maxTensTotal)
      const tensB = randInt(0, maxTensTotal - tensA)

      const a = tensA * 10 + unitA
      const b = tensB * 10 + unitB

      if (a > 0 && b > 0 && a + b <= effectiveMax) {
        return [a, b]
      }
    } else {
      // Không nhớ: unitA + unitB < 10
      const unitA = randInt(1, 8)
      const unitB = randInt(1, 9 - unitA)

      const maxTensTotal = Math.floor((effectiveMax - (unitA + unitB)) / 10)
      const tensA = maxTensTotal > 0 ? randInt(0, maxTensTotal) : 0
      const tensB = maxTensTotal - tensA > 0 ? randInt(0, maxTensTotal - tensA) : 0

      const a = tensA * 10 + unitA
      const b = tensB * 10 + unitB

      if (a > 0 && b > 0 && a + b <= effectiveMax) {
        return [a, b]
      }
    }
  }

  // Fallback an toàn
  return hasRegrouping ? [28, 15] : [14, 12]
}

/**
 * Sinh bộ 2 số cho phép trừ thoả mãn điều kiện
 */
function generateSubtractionOperands(rangeMax: number, hasRegrouping: boolean): [number, number] {
  const effectiveMax = Math.max(hasRegrouping ? 20 : 10, rangeMax)

  for (let attempt = 0; attempt < 500; attempt++) {
    if (hasRegrouping) {
      // Có nhớ: unitA < unitB, số bị trừ a >= 11
      const unitB = randInt(2, 9)
      const unitA = randInt(0, unitB - 1)

      // a phải có hàng chục lớn hơn b để a > b khi mượn 1 chục
      const maxTensA = Math.floor(effectiveMax / 10)
      if (maxTensA < 1) continue

      const tensA = randInt(1, maxTensA)
      const tensB = randInt(0, tensA - 1)

      const a = tensA * 10 + unitA
      const b = tensB * 10 + unitB

      if (a <= effectiveMax && b < a && b > 0 && a - b > 0) {
        return [a, b]
      }
    } else {
      // Không nhớ: unitA >= unitB, tensA >= tensB
      const unitA = randInt(1, 9)
      const unitB = randInt(0, unitA)

      const maxTensA = Math.floor(effectiveMax / 10)
      const tensA = maxTensA > 0 ? randInt(0, maxTensA) : 0
      const tensB = randInt(0, tensA)

      const a = tensA * 10 + unitA
      const b = tensB * 10 + unitB

      if (a <= effectiveMax && b < a && b > 0 && a - b > 0) {
        return [a, b]
      }
    }
  }

  // Fallback an toàn
  return hasRegrouping ? [42, 17] : [35, 12]
}

/**
 * Sinh phương án nhiễu sư phạm thông minh
 */
function generateDistractors(
  correct: number,
  numA: number,
  numB: number,
  operation: string,
  hasRegrouping: boolean,
  rangeMax: number
): number[] {
  const candidates = new Set<number>()

  // 1. Lỗi quên nhớ hoặc thừa nhớ (+-10)
  if (hasRegrouping) {
    if (operation === '+') {
      candidates.add(correct - 10) // Quên nhớ 1 chục
      candidates.add(correct + 10) // Nhớ nhầm 2 lần
    } else if (operation === '-') {
      candidates.add(correct + 10) // Quên trừ 1 chục đã mượn
      candidates.add(correct - 10)
    }
  }

  // 2. Lỗi nhầm phép tính
  if (operation === '+' && numA - numB > 0) {
    candidates.add(numA - numB)
  } else if (operation === '-' && numA + numB <= rangeMax) {
    candidates.add(numA + numB)
  }

  // 3. Lỗi tính toán lệch 1 đơn vị
  candidates.add(correct + 1)
  candidates.add(correct - 1)
  candidates.add(correct + 2)
  candidates.add(correct - 2)

  // 4. Lỗi hoán vị hàng chục và đơn vị nếu hợp lệ
  if (correct >= 12 && correct <= 99) {
    const tens = Math.floor(correct / 10)
    const units = correct % 10
    const swapped = units * 10 + tens
    if (swapped !== correct) {
      candidates.add(swapped)
    }
  }

  // Lọc chỉ giữ các số > 0, khác đáp án đúng
  const valid = Array.from(candidates).filter((x) => x > 0 && x !== correct)

  // Đảo ngẫu nhiên
  const shuffled = valid.sort(() => Math.random() - 0.5)

  // Lấy 3 distractors
  const result: number[] = []
  for (const num of shuffled) {
    if (result.length >= 3) break
    result.push(num)
  }

  // Nếu chưa đủ 3 distractors, bổ sung thêm xung quanh đáp án đúng
  let offset = 3
  while (result.length < 3) {
    const high = correct + offset
    const low = correct - offset
    if (!result.includes(high) && high > 0 && high !== correct) {
      result.push(high)
    }
    if (result.length < 3 && !result.includes(low) && low > 0 && low !== correct) {
      result.push(low)
    }
    offset++
  }

  return result.slice(0, 3)
}

/**
 * Sinh lời giải thích sư phạm chi tiết
 */
function buildExplanation(
  numA: number,
  numB: number,
  operation: string,
  result: number,
  hasRegrouping: boolean,
  unit: string
): string {
  if (operation === '+') {
    const uA = numA % 10
    const uB = numB % 10
    const uSum = uA + uB
    if (hasRegrouping) {
      return `Phép tính: ${numA} + ${numB} = ${result} ${unit}. (${uA} + ${uB} = ${uSum}, viết ${uSum % 10} nhớ 1 vào hàng chục).`
    }
    return `Phép tính: ${numA} + ${numB} = ${result} ${unit}.`
  }

  if (operation === '-') {
    const uA = numA % 10
    const uB = numB % 10
    if (hasRegrouping) {
      return `Phép tính: ${numA} - ${numB} = ${result} ${unit}. (${uA} không trừ được ${uB}, lấy ${10 + uA} trừ ${uB} bằng ${10 + uA - uB}, nhớ 1 vào số trừ).`
    }
    return `Phép tính: ${numA} - ${numB} = ${result} ${unit}.`
  }

  if (operation === '×') {
    return `Phép tính nhân: ${numA} × ${numB} = ${result} ${unit}.`
  }

  if (operation === '÷') {
    return `Phép tính chia: ${numA} ÷ ${numB} = ${result} ${unit}.`
  }

  return `Kết quả đúng là: ${result}.`
}

/**
 * Hàm chính: Sinh mảng các câu hỏi toán học xác định
 */
export function generateMathQuestions(
  constraints: PedagogicalConstraints,
  count: number = 3
): GeneratedMathQuestion[] {
  const theme = constraints.themeKey || 'farm'
  const entities = THEME_ENTITIES[theme] || THEME_ENTITIES.farm
  const mathType = constraints.mathType || 'ADD'
  const rangeMax = constraints.rangeMax || (constraints.gradeLevel === 1 ? 20 : 100)
  const hasRegrouping = constraints.hasRegrouping

  const questions: GeneratedMathQuestion[] = []

  for (let i = 0; i < count; i++) {
    const entityA = entities[i % entities.length]
    const entityB = entities[(i + 1) % entities.length]

    // 1. Phép cộng
    if (mathType === 'ADD') {
      const [numA, numB] = generateAdditionOperands(rangeMax, hasRegrouping)
      const correct = numA + numB
      const distractors = generateDistractors(correct, numA, numB, '+', hasRegrouping, rangeMax)

      let questionText = `Bác có ${numA} ${entityA.name} và ${numB} ${entityB.name}. Hỏi có tất cả bao nhiêu ${entityA.unit}?`
      if (theme === 'ocean') {
        questionText = `Đàn thứ nhất có ${numA} ${entityA.name}, đàn thứ hai có ${numB} ${entityB.name}. Hỏi cả hai đàn có bao nhiêu ${entityA.unit}?`
      } else if (theme === 'space') {
        questionText = `Tàu vũ trụ gặp ${numA} ${entityA.name} và ${numB} ${entityB.name}. Hỏi có tất cả bao nhiêu?`
      } else if (theme === 'jungle') {
        questionText = `Trong rừng xanh có ${numA} ${entityA.name} và ${numB} ${entityB.name}. Hỏi có tất cả bao nhiêu ${entityA.unit}?`
      }

      questions.push({
        questionText,
        numA,
        numB,
        operation: '+',
        correctAnswer: correct,
        distractors,
        explanation: buildExplanation(numA, numB, '+', correct, hasRegrouping, entityA.unit),
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: entityA.unit,
      })
    }

    // 2. Phép trừ
    else if (mathType === 'SUB') {
      const [numA, numB] = generateSubtractionOperands(rangeMax, hasRegrouping)
      const correct = numA - numB
      const distractors = generateDistractors(correct, numA, numB, '-', hasRegrouping, rangeMax)

      let questionText = `Có ${numA} ${entityA.name}, sau đó bớt đi ${numB} ${entityA.unit}. Hỏi còn lại bao nhiêu ${entityA.unit}?`
      if (theme === 'ocean') {
        questionText = `Đàn gồm ${numA} ${entityA.name}, có ${numB} ${entityA.unit} bơi đi tìm mồi. Hỏi còn lại bao nhiêu ${entityA.unit}?`
      } else if (theme === 'space') {
        questionText = `Phi đội có ${numA} ${entityA.name}, có ${numB} ${entityA.unit} đã hạ cánh. Hỏi còn lại bao nhiêu?`
      }

      questions.push({
        questionText,
        numA,
        numB,
        operation: '-',
        correctAnswer: correct,
        distractors,
        explanation: buildExplanation(numA, numB, '-', correct, hasRegrouping, entityA.unit),
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: entityA.unit,
      })
    }

    // 3. Phép nhân
    else if (mathType === 'MUL') {
      const numA = randInt(2, 5)
      const numB = randInt(2, Math.min(10, Math.floor(rangeMax / numA)))
      const correct = numA * numB
      const distractors = [correct + numA, Math.max(1, correct - numA), correct + 1].filter(
        (x) => x !== correct
      )

      questions.push({
        questionText: `Mỗi hàng có ${numB} ${entityA.name}. Hỏi ${numA} hàng như vậy có bao nhiêu ${entityA.unit}?`,
        numA,
        numB,
        operation: '×',
        correctAnswer: correct,
        distractors: distractors.slice(0, 3),
        explanation: buildExplanation(numA, numB, '×', correct, false, entityA.unit),
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: entityA.unit,
      })
    }

    // 4. Phép chia
    else if (mathType === 'DIV') {
      const numB = randInt(2, 5)
      const quotient = randInt(2, Math.min(10, Math.floor(rangeMax / numB)))
      const numA = numB * quotient
      const correct = quotient
      const distractors = [correct + 1, Math.max(1, correct - 1), correct + 2].filter(
        (x) => x !== correct
      )

      questions.push({
        questionText: `Chia đều ${numA} ${entityA.name} vào ${numB} chuồng. Hỏi mỗi chuồng có bao nhiêu ${entityA.unit}?`,
        numA,
        numB,
        operation: '÷',
        correctAnswer: correct,
        distractors: distractors.slice(0, 3),
        explanation: buildExplanation(numA, numB, '÷', correct, false, entityA.unit),
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: entityA.unit,
      })
    }

    // 5. So sánh số
    else if (mathType === 'COMPARE') {
      const numA = randInt(10, Math.min(100, rangeMax))
      let numB = randInt(10, Math.min(100, rangeMax))
      // Đảm bảo có tỉ lệ bằng nhau ngẫu nhiên
      if (Math.random() < 0.2) numB = numA

      let correctOp: '>' | '<' | '=' = '='
      if (numA > numB) correctOp = '>'
      else if (numA < numB) correctOp = '<'

      const allOps: ('>' | '<' | '=')[] = ['>', '<', '=']
      const distractors = allOps.filter((op) => op !== correctOp)

      questions.push({
        questionText: `Hãy so sánh hai số: ${numA} ... ${numB}`,
        numA,
        numB,
        operation: correctOp,
        correctAnswer: correctOp,
        distractors,
        explanation: `Ta thấy ${numA} ${correctOp} ${numB}.`,
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: 'dấu',
      })
    }

    // 6. Số chẵn / Số lẻ
    else if (mathType === 'PARITY') {
      const numA = randInt(1, Math.min(100, rangeMax))
      const isEven = numA % 2 === 0
      const correct = isEven ? 'Số chẵn' : 'Số lẻ'
      const distractors = isEven ? ['Số lẻ'] : ['Số chẵn']

      questions.push({
        questionText: `Số ${numA} là số chẵn hay số lẻ?`,
        numA,
        numB: 0,
        operation: '=',
        correctAnswer: correct,
        distractors,
        explanation: `Số ${numA} có chữ số tận cùng là ${numA % 10}, nên đây là ${correct.toLowerCase()}.`,
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: 'loại',
      })
    }

    // 7. Đếm số lượng
    else {
      const numA = randInt(1, Math.min(10, rangeMax))
      const correct = numA
      const distractors = [correct + 1, Math.max(1, correct - 1), correct + 2].filter(
        (x) => x !== correct
      )

      questions.push({
        questionText: `Bé hãy đếm xem trong tranh có bao nhiêu ${entityA.name}?`,
        numA,
        numB: 0,
        operation: '+',
        correctAnswer: correct,
        distractors: distractors.slice(0, 3),
        explanation: `Trong hình có đúng ${correct} ${entityA.name}.`,
        spriteName: entityA.name,
        spriteUrl: entityA.url,
        unit: entityA.unit,
      })
    }
  }

  return questions
}
