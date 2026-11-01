export interface Point {
  x: number
  y: number
}

export interface Bounds extends Point {
  width: number
  height: number
}

export interface DraggableItem {
  itemId: string
  label: string
  imageUrl: string
  correctZoneId: string
}

export interface DropZone {
  zoneId: string
  label: string
  color: 'water' | 'land'
}

// Frontend input for the renderer; this is not yet a backend DTO.
export interface DragDropQuestion {
  questionId: string
  prompt: string
  promptAudioUrl?: string
  draggableItems: DraggableItem[]
  dropZones: DropZone[]
}

export type PlacedState = Record<string, { zoneId: string; correct: true }>

export interface PlacementAnswer {
  participantId: string
  questionId: string
  placements: { itemId: string; zoneId: string }[]
  timeSpentMs: number
}
