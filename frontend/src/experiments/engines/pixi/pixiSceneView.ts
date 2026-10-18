import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { dashedArcs, hexToNumber } from './pixiColors'
import type { CircleShape, RectShape, Shape, TextShape } from './sceneShapes'

/** Họ phông giống Konva mặc định (renderer Konva không đặt `fontFamily`). */
const FONT_FAMILY = 'Arial'

type Node = Graphics | Text

/**
 * «Người vẽ» danh sách hình của `sceneShapes` bằng PixiJS. Giữ lại đối tượng theo `key` giữa các lần cập nhật (chế độ
 * retained): hình cũ được vẽ lại tại chỗ, hình mới tạo, hình không còn thì gỡ và hủy; thứ tự vẽ theo thứ tự danh sách.
 */
export class PixiSceneView {
  readonly root = new Container()
  private readonly nodes = new Map<string, Node>()
  /** Chữ ký (JSON) của hình đã áp lần trước theo khóa: hình không đổi thì bỏ qua, không vẽ lại và không dựng lại chữ. */
  private readonly signatures = new Map<string, string>()

  /** Số đối tượng hiển thị hiện có (để so với số hình khi test và đo). */
  get nodeCount(): number {
    return this.nodes.size
  }

  update(shapes: readonly Shape[]): void {
    const seen = new Set<string>()
    shapes.forEach((shape, index) => {
      seen.add(shape.key)
      let node = this.nodes.get(shape.key)
      const wantText = shape.kind === 'text'
      // Khóa đổi loại hình (hiếm): bỏ đối tượng cũ.
      if (node && (node instanceof Text) !== wantText) {
        this.root.removeChild(node)
        node.destroy()
        this.nodes.delete(shape.key)
        this.signatures.delete(shape.key)
        node = undefined
      }
      if (!node) {
        node = wantText ? new Text({ text: '' }) : new Graphics()
        this.nodes.set(shape.key, node)
      }
      const signature = JSON.stringify(shape)
      if (this.signatures.get(shape.key) !== signature) {
        this.signatures.set(shape.key, signature)
        if (node instanceof Text) this.applyText(node, shape as TextShape)
        else this.applyGraphics(node, shape as RectShape | CircleShape)
      }
      // Đặt đúng thứ tự vẽ; `addChildAt` cũng gắn đối tượng mới vào gốc.
      if (this.root.children[index] !== node) this.root.addChildAt(node, Math.min(index, this.root.children.length))
    })
    for (const [key, node] of [...this.nodes]) {
      if (seen.has(key)) continue
      this.root.removeChild(node)
      node.destroy()
      this.nodes.delete(key)
      this.signatures.delete(key)
    }
  }

  destroy(): void {
    this.root.destroy({ children: true })
    this.nodes.clear()
    this.signatures.clear()
  }

  private applyGraphics(graphics: Graphics, shape: RectShape | CircleShape): void {
    graphics.clear()
    if (shape.kind === 'rect') {
      graphics.roundRect(shape.x, shape.y, shape.width, shape.height, shape.radius)
      if (shape.fill) graphics.fill(hexToNumber(shape.fill))
      if (shape.stroke) graphics.stroke({ width: shape.strokeWidth ?? 1, color: hexToNumber(shape.stroke) })
      return
    }
    if (shape.dashed) {
      for (const [start, end] of dashedArcs(shape.radius)) {
        graphics.moveTo(shape.x + Math.cos(start) * shape.radius, shape.y + Math.sin(start) * shape.radius)
        graphics.arc(shape.x, shape.y, shape.radius, start, end)
      }
      if (shape.stroke) graphics.stroke({ width: shape.strokeWidth ?? 1, color: hexToNumber(shape.stroke) })
      return
    }
    graphics.circle(shape.x, shape.y, shape.radius)
    if (shape.fill) graphics.fill(hexToNumber(shape.fill))
    if (shape.stroke) graphics.stroke({ width: shape.strokeWidth ?? 1, color: hexToNumber(shape.stroke) })
  }

  private applyText(text: Text, shape: TextShape): void {
    text.text = shape.text
    text.style = new TextStyle({
      fontFamily: FONT_FAMILY,
      fontSize: shape.fontSize,
      fontWeight: shape.bold ? 'bold' : 'normal',
      fill: hexToNumber(shape.fill),
      align: 'center',
      wordWrap: true,
      wordWrapWidth: shape.width,
    })
    // Căn giữa cả ngang lẫn dọc trong hộp: neo ở giữa chữ, đặt vào tâm hộp.
    text.anchor.set(0.5)
    text.position.set(shape.x + shape.width / 2, shape.y + shape.height / 2)
  }
}
