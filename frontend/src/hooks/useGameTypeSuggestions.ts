import { useMutation } from '@tanstack/react-query'
import { suggestGameTypes } from '../services/gameTypeSuggestionService'
import type { SuggestGameTypesInput } from '../types/game-suggestion.types'

// Lấy đề xuất loại game khi giáo viên bấm Tạo (có sự kiện người dùng nên dùng mutation: có sẵn trạng thái chờ, lỗi,
// và gọi lại bằng cùng đầu vào). Hiện dịch vụ là mock; khi có API AI thật chỉ đổi `suggestGameTypes`.
export function useGameTypeSuggestions() {
  return useMutation({
    mutationFn: (input: SuggestGameTypesInput) => suggestGameTypes(input),
  })
}
