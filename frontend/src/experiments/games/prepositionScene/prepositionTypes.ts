import type { Landmark, Point, Preposition } from './prepositionGeometry'

/**
 * PREPOSITION_SCENE (Tiếng Anh): kéo một vật tới đúng chỗ theo lệnh «Put the cat under the table». Loại game THỬ
 * NGHIỆM: không thuộc DSL 1.0.0 (đang đóng băng); chỉ sống trong `experiments/` với dữ liệu mẫu cục bộ.
 * Hình vẽ (bàn, hộp, vật) do code vẽ bằng hình khối, không dùng tệp ảnh.
 */
export interface SceneItem {
  /** Tên vật bằng tiếng Anh, hiện trên vật (ví dụ "cat"). */
  label: string
  width: number
  height: number
  /** Tâm vật lúc bắt đầu (toạ độ cảnh). */
  startX: number
  startY: number
}

export interface PrepositionSceneQuestion {
  id: string
  /** Lệnh, ví dụ "Put the cat under the table." 1 đến 120 ký tự; phải chứa đúng từ chỉ vị trí của `preposition`. */
  instruction: string
  audioText?: string
  audioUrl?: string
  /** Quy tắc đúng. Dạng học sinh KHÔNG có trường này (Backend chấm). */
  preposition: Preposition
  landmark: Landmark
  item: SceneItem
}

/** Dạng gửi học sinh: bỏ `preposition` (quy tắc chấm) và `audioText` (nguồn sinh âm thanh). Lệnh vẫn hiện cho trẻ. */
export type PrepositionSceneStudentQuestion = Omit<PrepositionSceneQuestion, 'preposition' | 'audioText'>

/** Kết quả chấm của chế độ `play`: có `correctCenter` thì renderer chỉ chỗ đúng bằng khung nét đứt. */
export interface PlacementAnswerResult {
  isCorrect: boolean
  correctCenter?: Point
}
