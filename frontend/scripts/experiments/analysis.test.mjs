import { describe, expect, it } from 'vitest'
import {
  diffSizes,
  formatBytes,
  hasHorizontalOverflow,
  markdownTable,
  percentile,
  significantConsole,
  smallestTarget,
  stableAssetName,
  summarizeAxe,
  summarizeFrames,
  TOUCH_THRESHOLDS,
  touchTargetFailures,
} from './analysis.mjs'

describe('hasHorizontalOverflow', () => {
  it.each([
    [{ scrollWidth: 390, clientWidth: 390 }, false],
    [{ scrollWidth: 391, clientWidth: 390 }, false], // lệch 1px do làm tròn
    [{ scrollWidth: 392, clientWidth: 390 }, true],
    [{ scrollWidth: 1000, clientWidth: 390 }, true],
    [{ scrollWidth: 300, clientWidth: 390 }, false],
    [{ scrollWidth: Number.NaN, clientWidth: 390 }, false],
  ])('%j → %s', (input, expected) => {
    expect(hasHorizontalOverflow(input)).toBe(expected)
  })

  it('dung sai tuỳ chỉnh', () => {
    expect(hasHorizontalOverflow({ scrollWidth: 395, clientWidth: 390 }, 5)).toBe(false)
    expect(hasHorizontalOverflow({ scrollWidth: 396, clientWidth: 390 }, 5)).toBe(true)
  })
})

describe('touchTargetFailures', () => {
  it('ngưỡng khớp hồ sơ độ tuổi 64 / 56 / 48', () => {
    expect(TOUCH_THRESHOLDS).toEqual({ PRESCHOOL: 64, GRADE_1_2: 56, GRADE_3_5: 48 })
  })

  it('lấy cạnh ngắn của hộp và lọc theo từng nhóm tuổi; đúng bằng ngưỡng thì đạt', () => {
    const targets = [
      { label: 'to', width: 300, height: 120 },
      { label: 'biên 64', width: 64, height: 200 },
      { label: 'biên 56', width: 56, height: 56 },
      { label: 'biên 48', width: 400, height: 48 },
      { label: 'nhỏ', width: 30, height: 90 },
    ]
    const out = touchTargetFailures(targets)
    expect(out.PRESCHOOL.map((t) => t.label)).toEqual(['biên 56', 'biên 48', 'nhỏ'])
    expect(out.GRADE_1_2.map((t) => t.label)).toEqual(['biên 48', 'nhỏ'])
    expect(out.GRADE_3_5.map((t) => t.label)).toEqual(['nhỏ'])
    expect(out.GRADE_3_5[0].size).toBe(30)
  })

  it('kích thước NaN bị coi là trượt (không im lặng cho qua)', () => {
    const out = touchTargetFailures([{ label: 'hỏng', width: Number.NaN, height: 100 }])
    for (const band of Object.keys(TOUCH_THRESHOLDS)) expect(out[band]).toEqual([{ label: 'hỏng', size: null }])
  })

  it('không có vùng chạm thì không có lỗi; làm tròn một chữ số thập phân', () => {
    expect(touchTargetFailures([])).toEqual({ PRESCHOOL: [], GRADE_1_2: [], GRADE_3_5: [] })
    expect(touchTargetFailures([{ label: 'a', width: 48.74, height: 90 }]).GRADE_1_2[0].size).toBe(48.7)
  })
})

describe('smallestTarget', () => {
  it('cạnh ngắn nhỏ nhất, bỏ qua NaN; rỗng thì null', () => {
    expect(smallestTarget([{ width: 100, height: 50 }, { width: 30.04, height: 90 }, { width: Number.NaN, height: 5 }])).toBe(30)
    expect(smallestTarget([])).toBeNull()
  })
})

describe('percentile', () => {
  it('phân vị theo thứ hạng gần nhất', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(percentile(values, 50)).toBe(50)
    expect(percentile(values, 95)).toBe(100)
    expect(percentile(values, 10)).toBe(10)
    expect(percentile(values, 0)).toBe(10)
    expect(percentile(values, 100)).toBe(100)
  })

  it('không phụ thuộc thứ tự đầu vào, bỏ NaN, không sửa mảng gốc', () => {
    const input = [5, Number.NaN, 1, 3]
    expect(percentile(input, 50)).toBe(3)
    expect(input).toEqual([5, Number.NaN, 1, 3])
  })

  it('rỗng thì null', () => {
    expect(percentile([], 50)).toBeNull()
    expect(percentile([Number.NaN], 50)).toBeNull()
  })
})

describe('summarizeFrames', () => {
  it('60 fps đều: 16,7ms mỗi khung', () => {
    const times = Array.from({ length: 61 }, (_, i) => i * (1000 / 60))
    const s = summarizeFrames(times)
    expect(s.fps).toBe(60)
    expect(s.dropped).toBe(0)
    expect(s.worstMs).toBeCloseTo(16.7, 1)
    expect(s.frames).toBe(61)
  })

  it('khung rớt: khoảng dài hơn 33,4ms được đếm; tính fps từ tổng thời gian', () => {
    const s = summarizeFrames([0, 16, 32, 100, 116]) // một khoảng 68ms
    expect(s.dropped).toBe(1)
    expect(s.worstMs).toBe(68)
    expect(s.fps).toBe(34.5) // 4 khoảng / 116ms
  })

  it('khoảng đúng 33,4ms không bị tính rớt (biên)', () => {
    expect(summarizeFrames([0, 33.4, 66.8]).dropped).toBe(0)
    expect(summarizeFrames([0, 33.5]).dropped).toBe(1)
  })

  it('ít hơn hai mốc thì không có số liệu, không ném lỗi', () => {
    expect(summarizeFrames([])).toEqual({ frames: 0, fps: null, p95Ms: null, worstMs: null, dropped: 0 })
    expect(summarizeFrames([5]).fps).toBeNull()
  })

  it('bỏ mốc NaN', () => {
    expect(summarizeFrames([0, Number.NaN, 16]).frames).toBe(2)
  })
})

describe('summarizeAxe', () => {
  it('sắp theo mức độ nặng trước, rồi số node giảm dần, rồi tên', () => {
    const out = summarizeAxe([
      { id: 'b-minor', impact: 'minor', nodes: [1, 2, 3] },
      { id: 'a-serious', impact: 'serious', nodes: [1] },
      { id: 'c-serious', impact: 'serious', nodes: [1, 2] },
      { id: 'd-critical', impact: 'critical', nodes: [] },
      { id: 'e-null', impact: null, nodes: [1] },
    ])
    expect(out.map((v) => v.id)).toEqual(['d-critical', 'c-serious', 'a-serious', 'b-minor', 'e-null'])
    expect(out[0]).toMatchObject({ impact: 'critical', nodes: 0 })
    expect(out[4].impact).toBe('unknown')
  })

  it('không có vi phạm thì rỗng', () => {
    expect(summarizeAxe([])).toEqual([])
  })
})

describe('significantConsole', () => {
  const messages = [
    { type: 'log', text: 'bình thường' },
    { type: 'error', text: 'Failed to load resource' },
    { type: 'warning', text: 'cảnh báo thật' },
    { type: 'error', text: 'favicon.ico 404' },
  ]
  it('giữ error và warning, bỏ log', () => {
    expect(significantConsole(messages).map((m) => m.text)).toEqual(['Failed to load resource', 'cảnh báo thật', 'favicon.ico 404'])
  })
  it('bỏ thông điệp khớp danh sách bỏ qua', () => {
    expect(significantConsole(messages, [/favicon/]).map((m) => m.text)).toEqual(['Failed to load resource', 'cảnh báo thật'])
  })
})

describe('diffSizes / stableAssetName / formatBytes', () => {
  it('so hai bảng: thêm, bớt, đổi, tổng', () => {
    const out = diffSizes({ 'a.js': 100, 'b.js': 50 }, { 'a.js': 130, 'c.js': 20 })
    expect(out.rows).toEqual([
      { name: 'a.js', before: 100, after: 130, delta: 30 },
      { name: 'b.js', before: 50, after: null, delta: -50 },
      { name: 'c.js', before: null, after: 20, delta: 20 },
    ])
    expect(out).toMatchObject({ totalA: 150, totalB: 150, delta: 0 })
  })

  it('khóa ổn định bỏ đúng đoạn băm 8 ký tự', () => {
    expect(stableAssetName('index-DvXk39_a.js')).toBe('index.js')
    expect(stableAssetName('KonvaStage-B-cd12Ef.css')).toBe('KonvaStage.css')
    expect(stableAssetName('index.js')).toBe('index.js')
    expect(stableAssetName('react-dom-client.js')).toBe('react-dom-client.js') // không phải băm 8 ký tự
    // Tên thường có đoạn cuối đúng 8 ký tự chữ thường: không phải băm, không được cắt (sẽ gộp nhầm hai chunk).
    expect(stableAssetName('index-security.js')).toBe('index-security.js') // 8 chữ thường, không phải băm
    expect(stableAssetName('my-features.css')).toBe('my-features.css')
    expect(stableAssetName('index-security-Ab3dE9_x.js')).toBe('index-security.js')
    expect(stableAssetName('index-12345678.js')).toBe('index.js')
  })

  it('định dạng dung lượng, kể cả âm và thiếu', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(-1536)).toBe('−1.5 KB')
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })
})

describe('markdownTable', () => {
  it('có tiêu đề, dòng phân cách và các dòng; thoát dấu |, thiếu giá trị thành —', () => {
    const table = markdownTable(['A', 'B'], [['x|y', undefined], [1, 2]])
    expect(table.split('\n')).toEqual(['| A | B |', '| --- | --- |', '| x\\|y | — |', '| 1 | 2 |'])
  })
})
