import { describe, it, expect } from 'vitest'
import { generateDynamicCpfSceneGraph } from './dynamicCpfGenerator'

describe('generateDynamicCpfSceneGraph', () => {
  it('generates FALLING_CATCHER game with farm theme and even numbers', () => {
    const prompt = 'Bé hứng các quả táo mang số chẵn rơi từ trên cây ở nông trại'
    const graph = generateDynamicCpfSceneGraph(prompt, 2, 'Math')

    expect(graph.schemaVersion).toBe('cpf.v1.0.0')
    expect(graph.mechanicType).toBe('FALLING_CATCHER')
    expect(graph.pedagogicalSubject).toBe('Math')
    expect(graph.gradeLevel).toBe(2)
    expect(graph.stage.backgroundColor).toBe('#FFF8E1') // Farm yellow
    expect(graph.metadata?.theme).toBe('FARM')
    expect(graph.metadata?.mascot).toBeDefined()

    // Check catcher node
    const catcher = graph.nodes.find((n) => n.role === 'catcher')
    expect(catcher).toBeDefined()
    expect(catcher?.interaction?.type).toBe('CATCHER')

    // Check target nodes
    const targets = graph.nodes.filter((n) => n.role === 'target')
    expect(targets).toHaveLength(5)
    expect(targets[0].motion?.type).toBe('ITEM_FALL')
    expect(targets[0].visual.type).toBe('SPRITE')

    // Check collision rule
    const rule = graph.rules[0]
    expect(rule.trigger).toBe('ON_COLLIDE')
    expect(rule.logicCheck?.rule).toBe('is_even')

    // Verify numbers: 3 even, 2 odd
    const numbers = targets.map((t) => Number(t.metadata?.numberValue))
    const evens = numbers.filter((n) => n % 2 === 0)
    const odds = numbers.filter((n) => n % 2 !== 0)
    expect(evens).toHaveLength(3)
    expect(odds).toHaveLength(2)

    // Check distinct numbers
    const unique = new Set(numbers)
    expect(unique.size).toBe(5)
  })

  it('generates PHYSICS_SLING_ARCHERY with space theme and odd numbers', () => {
    const prompt = 'Lái phi thuyền bắn vỡ bong bóng năng lượng mang số lẻ ngoài vũ trụ'
    const graph = generateDynamicCpfSceneGraph(prompt, 3, 'Math')

    expect(graph.mechanicType).toBe('PHYSICS_SLING_ARCHERY')
    expect(graph.stage.backgroundColor).toBe('#0F172A') // Space dark

    // Bow & Bowstring present
    expect(graph.nodes.some((n) => n.role === 'bow')).toBe(true)
    expect(graph.nodes.some((n) => n.role === 'bowstring')).toBe(true)

    // Check rule is_odd
    const rule = graph.rules[0]
    expect(rule.logicCheck?.rule).toBe('is_odd')

    // Verify numbers: 3 odd, 2 even
    const targets = graph.nodes.filter((n) => n.role === 'target')
    const numbers = targets.map((t) => Number(t.metadata?.numberValue))
    const evens = numbers.filter((n) => n % 2 === 0)
    const odds = numbers.filter((n) => n % 2 !== 0)
    expect(odds).toHaveLength(3)
    expect(evens).toHaveLength(2)
  })

  it('generates POP_TAPPER with ocean theme and tap interaction', () => {
    const prompt = 'Chạm nổ bong bóng số chẵn dưới đại dương xanh'
    const graph = generateDynamicCpfSceneGraph(prompt, 1, 'Math')

    expect(graph.mechanicType).toBe('POP_TAPPER')
    expect(graph.stage.backgroundColor).toBe('#E0F7FA') // Ocean cyan

    const targets = graph.nodes.filter((n) => n.role === 'target')
    expect(targets).toHaveLength(5)
    expect(targets[0].interaction?.type).toBe('DIRECT_TAP')

    const rule = graph.rules[0]
    expect(rule.trigger).toBe('ON_TAP')
    expect(rule.logicCheck?.rule).toBe('is_even')
  })

  it('generates completely dynamic and varied numbers (ZERO hardcoded lists)', () => {
    const prompt = 'Hứng số chẵn trong phạm vi 100 nông trại'
    const setA = new Set<string>()

    for (let i = 0; i < 5; i++) {
      const g = generateDynamicCpfSceneGraph(prompt, 2, 'Math')
      const nums = g.nodes
        .filter((n) => n.role === 'target')
        .map((n) => String(n.metadata?.numberValue))
        .join(',')
      setA.add(nums)
    }

    // Should produce varied configurations, not fixed hardcoded arrays
    expect(setA.size).toBeGreaterThan(1)
  })
})
