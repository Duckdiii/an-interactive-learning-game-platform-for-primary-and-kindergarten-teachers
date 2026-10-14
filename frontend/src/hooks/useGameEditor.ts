import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createEditorState, editorReducer, isDirty, trimMetadata } from '../components/editor/editorReducer'
import { viText } from '../constants/viText'
import { updateGame } from '../services/gameService'
import type { GameDsl } from '../types/game-dsl.types'
import type { GameResponse } from '../types/game-response.types'
import { parseApiError } from '../utils/apiError'
import { clearDraft, loadDraft, saveDraft } from '../utils/draftStorage'
import type { StoredDraft } from '../utils/draftStorage'
import { deepEqual, toContent } from '../utils/gameContent'
import { summarizeIssues, validateGame } from '../utils/gameValidation'
import type { ValidationIssue } from '../utils/gameValidation'
import { gameQueryKey } from './useGame'
import { gamesQueryKey } from './useGames'
import { useAuth } from './useAuth'

const BACKUP_DELAY_MS = 500

// Bản sao lưu chỉ đáng hỏi lại khi khác bản đang mở; trùng hoặc không dùng được (đổi loại game) thì bỏ luôn.
function readRestorable(owner: string, gameId: string, baseline: GameDsl): StoredDraft | null {
  const stored = loadDraft(owner, gameId)

  if (!stored) return null

  if (stored.content.gameType !== baseline.gameType || deepEqual(stored.content, baseline)) {
    clearDraft(owner, gameId)

    return null
  }

  return stored
}

// Toàn bộ logic của một phiên soạn thảo (trạng thái bản nháp, kiểm tra trước khi lưu, lưu, sao lưu và khôi phục) để trang chỉ
// còn lo bố cục. Lưu thất bại KHÔNG bao giờ động tới bản đang soạn.
export function useGameEditor(game: GameResponse) {
  const { user } = useAuth()
  const owner = user?.teacherId ?? user?.email ?? 'anonymous'
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(editorReducer, game, (loaded) => createEditorState(toContent(loaded)))
  const [attempted, setAttempted] = useState(false)
  const [lastSaveOk, setLastSaveOk] = useState(false)
  // Tính một lần lúc mở: bản sao lưu từ lần soạn trước chưa kịp lưu.
  const [pendingRestore, setPendingRestore] = useState(() => readRestorable(owner, game.gameId, state.baseline))
  // Mốc `updatedAt` của máy chủ lúc bắt đầu soạn (đổi khi CHÍNH phiên này lưu thành công, không đổi theo lần tải lại nền):
  // dùng để biết bản sao lưu có cũ hơn bản trên máy chủ hay không.
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(game.updatedAt)
  const dirty = isDirty(state)

  const mutation = useMutation({
    mutationFn: (snapshot: GameDsl) => updateGame(game.gameId, snapshot),
    onSuccess: (response, snapshot) => {
      dispatch({ type: 'saved', snapshot })
      setBaseUpdatedAt(response.updatedAt)
      clearDraft(owner, game.gameId)
      setLastSaveOk(true)
      setAttempted(false)
      queryClient.setQueryData(gameQueryKey(owner, game.gameId), response)
      // Danh sách "Trò chơi của tôi" có ngày cập nhật và tên: làm mới để khớp bản vừa lưu.
      void queryClient.invalidateQueries({ queryKey: gamesQueryKey(owner) })
    },
  })

  // Giá trị mới nhất cho các nơi cần ghi sao lưu ngay (rời trang, đóng tab) mà không bị dính giá trị cũ của lần vẽ trước.
  const latest = useRef({ dirty, pendingRestore, draft: state.draft, baseUpdatedAt })

  useEffect(() => {
    latest.current = { dirty, pendingRestore, draft: state.draft, baseUpdatedAt }
  })

  // Sao lưu sau mỗi lần sửa (đợi ngừng gõ một chút). Tạm dừng khi còn đang hỏi khôi phục để không ghi đè bản sao lưu cũ.
  // Sửa rồi hoàn tác về đúng bản đã lưu thì bỏ sao lưu, để lần mở sau không hỏi khôi phục một thay đổi đã chủ động hủy.
  // `state.baseline` nằm trong danh sách phụ thuộc để sau khi lưu mà còn phần gõ thêm thì sao lưu được ghi lại ngay.
  useEffect(() => {
    if (pendingRestore) return

    if (!dirty) {
      clearDraft(owner, game.gameId)

      return
    }

    const timer = setTimeout(() => saveDraft(owner, game.gameId, state.draft, baseUpdatedAt), BACKUP_DELAY_MS)

    return () => clearTimeout(timer)
  }, [dirty, pendingRestore, owner, game.gameId, baseUpdatedAt, state.draft, state.baseline])

  // Rời trang hoặc đóng tab trong lúc chờ 0,5 giây: ghi ngay phần vừa gõ.
  useEffect(() => {
    const flush = () => {
      const current = latest.current

      if (current.dirty && !current.pendingRestore) saveDraft(owner, game.gameId, current.draft, current.baseUpdatedAt)
    }

    window.addEventListener('beforeunload', flush)

    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [owner, game.gameId])

  // Sau lần bấm Lưu đầu tiên, lỗi được tính lại theo từng lần sửa để lỗi nào đã sửa xong thì biến mất ngay.
  const issues = useMemo(
    () => (attempted ? validateGame(state.draft, 'save', { baseline: state.baseline }) : []),
    [attempted, state.draft, state.baseline],
  )

  const edit = (action: Parameters<typeof dispatch>[0]) => {
    setLastSaveOk(false)
    // Sửa tiếp thì lỗi lưu lần trước không còn đúng nữa (đang lưu dở thì để nguyên, tránh mở khóa nút Lưu giữa chừng).
    if (!mutation.isPending) mutation.reset()
    dispatch(action)
  }

  /** Trả về các lỗi tìm thấy (rỗng nghĩa là đã gửi đi), để trang đưa tiêu điểm tới ô lỗi đầu tiên. */
  const save = (): ValidationIssue[] => {
    setLastSaveOk(false)
    setAttempted(true)
    mutation.reset()

    // UC-04 luồng 5a: còn câu thiếu đáp án hoặc nội dung chưa hợp lệ thì báo và KHÔNG gửi lên máy chủ.
    const found = validateGame(state.draft, 'save', { baseline: state.baseline })

    if (found.length > 0) return found

    // Gửi bản đã cắt khoảng trắng hai đầu; bản đang soạn cũng được cắt để không còn "chưa lưu" chỉ vì dấu cách thừa.
    dispatch({ type: 'normalize' })
    mutation.mutate(trimMetadata(state.draft))

    return []
  }

  const saveError = mutation.isError ? parseApiError(mutation.error, viText.editor.save.saveErrorTitle) : null

  return {
    draft: state.draft,
    dirty,
    saving: mutation.isPending,
    savedNotice: lastSaveOk && !dirty,
    issues,
    issueSummary: summarizeIssues(issues, 'save'),
    saveError,
    pendingRestore,
    setTitle: (title: string) => edit({ type: 'setTitle', title }),
    setTopic: (topic: string) => edit({ type: 'setTopic', topic }),
    save,
    restore: () => {
      if (!pendingRestore) return

      edit({ type: 'restore', content: pendingRestore.content })
      setPendingRestore(null)
    },
    discardRestore: () => {
      clearDraft(owner, game.gameId)
      setPendingRestore(null)
    },
  }
}
