import type { NumberLineQuestion } from './numberLineTypes'

/** Dữ liệu mẫu cục bộ của NUMBER_LINE (không gọi mạng). Mọi mẫu đều hợp lệ theo `validateNumberLine`. */
export const mockNumberLine10: NumberLineQuestion = {
  id: 'nl-10',
  questionText: 'Đặt chú ong vào số 7',
  min: 0,
  max: 10,
  step: 1,
  target: 7,
  tolerance: 0,
}

export const mockNumberLine20: NumberLineQuestion = {
  id: 'nl-20',
  questionText: 'Đặt chú ong vào số 13',
  min: 0,
  max: 20,
  step: 1,
  target: 13,
  tolerance: 0,
  startValue: 10,
}

/** Đếm cách 2: các vạch 0, 2, 4, ..., 20. */
export const mockNumberLineStep2: NumberLineQuestion = {
  id: 'nl-step2',
  questionText: 'Đếm cách 2 nhé: đặt chú ong vào số 12',
  min: 0,
  max: 20,
  step: 2,
  target: 12,
  tolerance: 0,
}

/** Ước lượng: chấp nhận lệch một vạch. */
export const mockNumberLineEstimate: NumberLineQuestion = {
  id: 'nl-estimate',
  questionText: 'Khoảng bao nhiêu? Đặt chú ong gần số 70',
  min: 0,
  max: 100,
  step: 10,
  target: 70,
  tolerance: 10,
}

export const mockNumberLineWithAudio: NumberLineQuestion = {
  ...mockNumberLine10,
  id: 'nl-audio',
  audioText: 'Đặt chú ong vào số bảy',
  audioUrl: '/mock/q1.wav',
}

export const NUMBER_LINE_FIXTURES = {
  '0 đến 10': mockNumberLine10,
  '0 đến 20': mockNumberLine20,
  'Cách 2': mockNumberLineStep2,
  'Ước lượng': mockNumberLineEstimate,
  'Có nút nghe lại': mockNumberLineWithAudio,
} as const
