import type { ComponentType } from 'react'
import type { GameType } from '../../../types/game-dsl.types'
import type { QuestionFormProps } from './formTypes'
import MatchingForm from './MatchingForm'
import MemoryCardForm from './MemoryCardForm'
import OddOneOutForm from './OddOneOutForm'
import QuizForm from './QuizForm'
import VisualClozeForm from './VisualClozeForm'

// Bảng loại game đến form sửa (không rẽ nhánh bằng if/switch). Loại chưa có form thì khung sửa hiện thông báo rõ và vẫn xem được
// nội dung; thêm form cho loại mới là thêm một dòng ở đây cùng một component nhỏ, không sửa khung.
export const QUESTION_FORMS: Readonly<Partial<Record<GameType, ComponentType<QuestionFormProps>>>> = {
  QUIZ: QuizForm,
  MATCHING: MatchingForm,
  MEMORY_CARD: MemoryCardForm,
  ODD_ONE_OUT: OddOneOutForm,
  VISUAL_CLOZE: VisualClozeForm,
}
