import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Graphics, Text } from './fakePixi'
import { PixiSceneView } from './pixiSceneView'
import type { Shape } from './sceneShapes'

vi.mock('pixi.js', () => import('./fakePixi'))

const rect = (key: string, extra: Partial<Shape> = {}): Shape => ({ kind: 'rect', key, x: 1, y: 2, width: 30, height: 40, radius: 5, fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 3, ...extra }) as Shape
const circle = (key: string, extra: Partial<Shape> = {}): Shape => ({ kind: 'circle', key, x: 50, y: 60, radius: 36, fill: '#FFFFFF', stroke: '#000000', strokeWidth: 6, ...extra }) as Shape
const text = (key: string, value: string, extra: Partial<Shape> = {}): Shape => ({ kind: 'text', key, text: value, x: 10, y: 20, width: 100, height: 50, fontSize: 32, fill: '#000000', ...extra }) as Shape

let view: PixiSceneView
beforeEach(() => {
  view = new PixiSceneView()
})

const children = () => view.root.children as unknown as Array<Graphics | Text>

describe('PixiSceneView: dựng và thứ tự', () => {
  it('tạo một đối tượng cho mỗi hình, đúng loại, đúng thứ tự vẽ', () => {
    view.update([rect('a'), text('b', 'xin chào'), circle('c')])
    expect(view.nodeCount).toBe(3)
    expect(children().map((c) => c.constructor.name)).toEqual(['Graphics', 'Text', 'Graphics'])
    expect((children()[1] as Text).text).toBe('xin chào')
  })

  it('đổi thứ tự trong danh sách thì đổi thứ tự vẽ, không tạo lại đối tượng', () => {
    view.update([rect('a'), rect('b'), rect('c')])
    const [a, b, c] = children()
    view.update([rect('c'), rect('a'), rect('b')])
    expect(children()).toEqual([c, a, b])
    expect(view.nodeCount).toBe(3)
  })

  it('hình mới chèn giữa danh sách vào đúng vị trí', () => {
    view.update([rect('a', { x: 11 } as Partial<Shape>), rect('c', { x: 33 } as Partial<Shape>)])
    view.update([rect('a', { x: 11 } as Partial<Shape>), rect('b', { x: 22 } as Partial<Shape>), rect('c', { x: 33 } as Partial<Shape>)])
    expect(children().map((c) => (c as Graphics).ops[0][1])).toEqual([11, 22, 33])
  })

  it('hình không còn trong danh sách thì bị gỡ và hủy', () => {
    view.update([rect('a'), circle('b'), text('c', 'x')])
    const removed = children()[1]
    view.update([rect('a'), text('c', 'x')])
    expect(view.nodeCount).toBe(2)
    expect(children()).toHaveLength(2)
    expect(removed.destroyed).toBe(true)
  })

  it('cập nhật rỗng thì dọn sạch', () => {
    view.update([rect('a'), text('b', 'x')])
    view.update([])
    expect(view.nodeCount).toBe(0)
    expect(children()).toHaveLength(0)
  })

  it('khóa đổi loại hình (rect → text) thì thay đối tượng, không giữ Graphics cũ', () => {
    view.update([rect('a')])
    const old = children()[0]
    view.update([text('a', 'đổi')])
    expect(children()).toHaveLength(1)
    expect(children()[0]).not.toBe(old)
    expect(old.destroyed).toBe(true)
    expect(children()[0]).toBeInstanceOf(Text)
  })

  it('destroy hủy cả cây', () => {
    view.update([rect('a'), text('b', 'x')])
    const kids = children()
    view.destroy()
    expect(view.root.destroyed).toBe(true)
    expect(kids.every((k) => k.destroyed)).toBe(true)
    expect(view.nodeCount).toBe(0)
  })
})

describe('PixiSceneView: hình học', () => {
  it('hình chữ nhật bo góc: tô rồi viền, màu đổi sang số', () => {
    view.update([rect('a')])
    expect((children()[0] as Graphics).ops).toEqual([['roundRect', 1, 2, 30, 40, 5], ['fill', 0x2563eb], ['stroke', 3, 0x1e40af]])
  })

  it('không có fill hoặc stroke thì không gọi', () => {
    view.update([rect('a', { fill: undefined, stroke: undefined } as Partial<Shape>)])
    expect((children()[0] as Graphics).ops).toEqual([['roundRect', 1, 2, 30, 40, 5]])
  })

  it('hình tròn có tô và viền', () => {
    view.update([circle('c')])
    expect((children()[0] as Graphics).ops).toEqual([['circle', 50, 60, 36], ['fill', 0xffffff], ['stroke', 6, 0]])
  })

  it('vòng nét đứt: nhiều cung rời nhau, không tô, chỉ viền một lần; không dùng circle()', () => {
    view.update([circle('c', { dashed: true, fill: undefined, stroke: '#43A047', strokeWidth: 6, radius: 46 } as Partial<Shape>)])
    const ops = (children()[0] as Graphics).ops
    const arcs = ops.filter((o) => o[0] === 'arc')
    expect(arcs.length).toBeGreaterThan(10)
    expect(ops.filter((o) => o[0] === 'moveTo')).toHaveLength(arcs.length)
    expect(ops.some((o) => o[0] === 'circle' || o[0] === 'fill')).toBe(false)
    expect(ops.filter((o) => o[0] === 'stroke')).toEqual([['stroke', 6, 0x43a047]])
    // Mỗi cung bắt đầu đúng ở điểm moveTo ngay trước đó (không có nét nối giữa các nét).
    ops.forEach((op, i) => {
      if (op[0] !== 'arc') return
      const [, cx, cy, r, start] = op as [string, number, number, number, number]
      const move = ops[i - 1] as [string, number, number]
      expect(move[1]).toBeCloseTo(cx + Math.cos(start) * r, 6)
      expect(move[2]).toBeCloseTo(cy + Math.sin(start) * r, 6)
    })
  })

  it('màu hỏng thành màu báo lỗi thay vì ném lỗi', () => {
    expect(() => view.update([rect('a', { fill: 'đỏ' } as Partial<Shape>)])).not.toThrow()
    expect((children()[0] as Graphics).ops[1]).toEqual(['fill', 0xff00ff])
  })
})

describe('PixiSceneView: chữ', () => {
  it('neo giữa và đặt vào tâm hộp; kiểu chữ theo hình', () => {
    view.update([text('t', 'Đặt chú ong vào số 7', { x: 40, y: 100, width: 720, height: 80, fontSize: 32, fill: '#112233', bold: true } as Partial<Shape>)])
    const node = children()[0] as Text
    expect(node.text).toBe('Đặt chú ong vào số 7')
    expect(node.anchor).toMatchObject({ x: 0.5, y: 0.5 })
    expect(node.position).toMatchObject({ x: 40 + 360, y: 100 + 40 })
    expect(node.style?.options).toMatchObject({ fontFamily: 'Arial', fontSize: 32, fontWeight: 'bold', fill: 0x112233, align: 'center', wordWrap: true, wordWrapWidth: 720 })
  })

  it('chữ thường không đậm', () => {
    view.update([text('t', 'x')])
    expect((children()[0] as Text).style?.options.fontWeight).toBe('normal')
  })

  it('giữ nguyên dấu tiếng Việt (không chuẩn hóa hay cắt)', () => {
    const sample = 'Hòa Đặt chú ong vào số 7 ươ ồ ữ'
    view.update([text('t', sample)])
    expect((children()[0] as Text).text).toBe(sample)
  })
})

describe('PixiSceneView: giữ lại, không làm lại việc thừa', () => {
  it('cùng hình thì không vẽ lại và không dựng lại kiểu chữ', () => {
    view.update([rect('a'), text('b', 'x')])
    const g = children()[0] as Graphics
    const t = children()[1] as Text
    const ops = g.ops
    const style = t.style
    view.update([rect('a'), text('b', 'x')])
    expect(g.ops).toBe(ops) // cùng mảng: không clear() rồi vẽ lại
    expect(t.style).toBe(style) // không new TextStyle
  })

  it('hình đổi thì được vẽ lại tại chỗ (cùng đối tượng)', () => {
    view.update([circle('m', { x: 10 } as Partial<Shape>)])
    const node = children()[0] as Graphics
    view.update([circle('m', { x: 99 } as Partial<Shape>)])
    expect(children()[0]).toBe(node)
    expect(node.ops[0]).toEqual(['circle', 99, 60, 36])
  })

  it('chỉ chữ đổi thì chỉ chữ đó được cập nhật', () => {
    view.update([text('a', '1'), text('b', '2')])
    const [a, b] = children() as Text[]
    const styleB = b.style
    view.update([text('a', '9'), text('b', '2')])
    expect(a.text).toBe('9')
    expect(b.style).toBe(styleB)
  })

  it('hình bị gỡ rồi thêm lại cùng khóa được dựng mới (không dùng chữ ký cũ)', () => {
    view.update([rect('a')])
    view.update([])
    view.update([rect('a')])
    expect((children()[0] as Graphics).ops).toHaveLength(3)
  })
})
