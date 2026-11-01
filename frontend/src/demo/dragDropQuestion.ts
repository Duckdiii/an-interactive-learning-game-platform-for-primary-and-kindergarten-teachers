import type { DragDropQuestion } from '../types/dragDrop'

export const dragDropQuestion: DragDropQuestion = {
  questionId: 'demo-habitats',
  prompt: 'Đưa các con vật về đúng nơi sống',
  dropZones: [
    { zoneId: 'water', label: 'Sống dưới nước', color: 'water' },
    { zoneId: 'land', label: 'Sống trên cạn', color: 'land' },
  ],
  draggableItems: [
    { itemId: 'fish', label: 'Cá', imageUrl: '/images/drag-drop/fish.svg', correctZoneId: 'water' },
    { itemId: 'rabbit', label: 'Thỏ', imageUrl: '/images/drag-drop/rabbit.svg', correctZoneId: 'land' },
    { itemId: 'crab', label: 'Cua', imageUrl: '/images/drag-drop/crab.svg', correctZoneId: 'water' },
    { itemId: 'cat', label: 'Mèo', imageUrl: '/images/drag-drop/cat.svg', correctZoneId: 'land' },
  ],
}
