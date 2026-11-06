/**
 * ArcheryCpfCanvas: Konva Hardware Driver for CPF Out-of-Distribution Engine.
 * Delegates to CpfUniversalCanvas supporting all 3 CPF mechanics:
 * SLING (Archery), CATCHER (Falling Items), and DIRECT_TAP (Pop Tapper).
 */

import { type FC } from 'react'
import { CpfUniversalCanvas, type CpfUniversalCanvasProps } from './CpfUniversalCanvas'

export type ArcheryCpfCanvasProps = CpfUniversalCanvasProps

export const ArcheryCpfCanvas: FC<ArcheryCpfCanvasProps> = (props) => {
  return <CpfUniversalCanvas {...props} />
}

export { CpfUniversalCanvas }
