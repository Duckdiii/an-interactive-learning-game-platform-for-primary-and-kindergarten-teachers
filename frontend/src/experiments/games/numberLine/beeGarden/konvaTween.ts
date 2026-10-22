import Konva from 'konva'
import type { Ease, TweenFactory } from './beeFlight'

const EASINGS: Readonly<Record<Ease, (t: number, b: number, c: number, d: number) => number>> = {
  inOut: Konva.Easings.EaseInOut,
  out: Konva.Easings.EaseOut,
  in: Konva.Easings.EaseIn,
  bounce: Konva.Easings.BounceEaseOut,
  back: Konva.Easings.BackEaseOut,
}

/** `TweenFactory` thật: dùng `Konva.Tween` trên node, không qua React. Tách riêng để các test thay bằng tween giả. */
export const konvaTweenFactory: TweenFactory = (node, attrs, seconds, ease, onFinish) =>
  new Konva.Tween({ node: node as Konva.Node, duration: seconds, easing: EASINGS[ease], ...attrs, onFinish })
