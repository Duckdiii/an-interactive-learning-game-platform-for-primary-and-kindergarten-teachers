// matter-js 0.20.0 không đi kèm kiểu; khai báo tối thiểu cho phần API mà matterDrop.ts dùng (tránh thêm gói @types).
declare module 'matter-js' {
  interface Vector {
    x: number
    y: number
  }
  interface Body {
    position: Vector
    velocity: Vector
  }
  interface World {
    readonly __world: unique symbol
  }
  interface Engine {
    world: World
  }
  interface BodyOptions {
    isStatic?: boolean
    friction?: number
    frictionStatic?: number
    frictionAir?: number
    restitution?: number
    inertia?: number
  }
  const Matter: {
    Engine: {
      create(options?: { gravity?: { x?: number; y?: number; scale?: number } }): Engine
      update(engine: Engine, delta?: number): Engine
    }
    Bodies: {
      rectangle(x: number, y: number, width: number, height: number, options?: BodyOptions): Body
    }
    Composite: {
      add(composite: World, body: Body | Body[]): World
    }
  }
  export default Matter
}
