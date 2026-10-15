import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createEditorState, editorReducer, isDirty } from '../components/editor/editorReducer'
import { viText } from '../constants/viText'
import { getGame, updateGame } from '../services/gameService'
import { publishGame } from '../services/publishService'
import type { GameDsl, QuestionDsl } from '../types/game-dsl.types'
import type { GameResponse } from '../types/game-response.types'
import type { PublishResult } from '../types/publish.types'
import { parseApiError } from '../utils/apiError'
import { describePublishError } from '../utils/publishErrors'
import { getStoredAccessToken } from '../utils/authStorage'
import { clearDraft, loadDraft, saveDraft } from '../utils/draftStorage'
import type { StoredDraft } from '../utils/draftStorage'
import { deepEqual, stripTransientMedia, toContent, trimContent } from '../utils/gameContent'
import { summarizeIssues, validateGame } from '../utils/gameValidation'
import type { ValidationIssue } from '../utils/gameValidation'
import { gameQueryKey } from './useGame'
import { gamesQueryKey } from './useGames'
import { useTeacherIdentity } from './useTeacherIdentity'

const BACKUP_DELAY_MS = 500

// Đã đăng xuất (ở tab này hoặc tab khác) thì tuyệt đối không ghi sao lưu: dọn dẹp khi rời trang vẫn chạy sau khi đăng xuất đã xóa
// sạch, và nếu ghi lại thì nội dung của giáo viên vừa đăng xuất nằm lại trên máy dùng chung.
const sessionActive = () => getStoredAccessToken() !== null

// Bản sao lưu chỉ đáng hỏi lại khi khác bản đang mở; trùng hoặc không dùng được (đổi loại game) thì bỏ luôn.
function readRestorable(owner: string | null, gameId: string, baseline: GameDsl): StoredDraft | null {
  const stored = loadDraft(owner, gameId)

  if (!stored) return null

  if (stored.content.gameType !== baseline.gameType || deepEqual(stored.content, baseline)) {
    clearDraft(owner, gameId)

    return null
  }

  return stored
}

export type ApplyRegeneratedResult = { ok: true } | { ok: false; reason: 'stale' | 'invalid' }

// Toàn bộ logic của một phiên soạn thảo (trạng thái bản nháp, kiểm tra trước khi lưu, lưu, sao lưu và khôi phục) để trang chỉ
// còn lo bố cục. Lưu thất bại KHÔNG bao giờ động tới bản đang soạn.
export function useGameEditor(game: GameResponse) {
  // `owner` là MÃ giáo viên dùng cho sao lưu (chưa có mã thì không sao lưu); `queryOwner` chỉ để đặt khóa bộ nhớ đệm.
  const { teacherId: owner, cacheOwner } = useTeacherIdentity()
  const queryOwner = cacheOwner ?? ''
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(editorReducer, game, (loaded) => createEditorState(toContent(loaded)))
  const [attempted, setAttempted] = useState(false)
  const [lastSaveOk, setLastSaveOk] = useState(false)
  // Tính một lần lúc mở: bản sao lưu từ lần soạn trước chưa kịp lưu.
  const [pendingRestore, setPendingRestore] = useState(() => readRestorable(owner, game.gameId, state.baseline))
  // Mốc `updatedAt` của máy chủ lúc bắt đầu soạn (đổi khi CHÍNH phiên này lưu thành công, không đổi theo lần tải lại nền):
  // dùng để biết bản sao lưu có cũ hơn bản trên máy chủ hay không.
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(game.updatedAt)
  // Tăng mỗi lần khôi phục bản sao lưu: các ô nhập giữ chữ đang gõ dở thì dựng lại theo số này để hiện đúng nội dung vừa khôi phục.
  const [revision, setRevision] = useState(0)
  const dirty = isDirty(state)

  const mutation = useMutation({
    mutationFn: (snapshot: GameDsl) => updateGame(game.gameId, snapshot),
    onSuccess: (response, snapshot) => {
      dispatch({ type: 'saved', snapshot })
      setBaseUpdatedAt(response.updatedAt)
      clearDraft(owner, game.gameId)
      setLastSaveOk(true)
      setAttempted(false)
      queryClient.setQueryData(gameQueryKey(queryOwner, game.gameId), response)
      // Danh sách "Trò chơi của tôi" có ngày cập nhật và tên: làm mới để khớp bản vừa lưu.
      void queryClient.invalidateQueries({ queryKey: gamesQueryKey(queryOwner) })
    },
  })

  // Xuất bản (UC-07): gửi kèm nội dung mới nhất để Backend lưu rồi xuất bản. Thành công thì chỉ phần ĐÃ GỬI được coi là đã lưu (như Lưu): sửa thêm
  // trong lúc chờ vẫn là "chưa lưu". Lỗi không đụng tới bản đang soạn. Xử lý ở mức mutation nên rời trang giữa chừng vẫn cập nhật bộ nhớ đệm.
  const [publishAttempted, setPublishAttempted] = useState(false)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)
  const publishMutation = useMutation({
    mutationFn: (snapshot: GameDsl) => publishGame(game.gameId, snapshot),
    onSuccess: async (result, snapshot) => {
      const key = gameQueryKey(queryOwner, game.gameId)

      dispatch({ type: 'saved', snapshot })
      clearDraft(owner, game.gameId)
      setLastSaveOk(false)
      setPublishAttempted(false)
      setPublishResult(result)
      // Chưa biết mốc thật của máy chủ: tạm dùng giờ máy để bản sao lưu sau đó không bị coi là cũ hơn bản vừa xuất bản; lấy lại được thì thay bằng mốc thật.
      setBaseUpdatedAt(new Date().toISOString())
      // Kết quả xuất bản không có `updatedAt`: đặt trạng thái ngay để tiêu đề đổi tức thì, rồi lấy bản thật để mốc thời gian khớp máy chủ.
      queryClient.setQueryData<GameResponse>(key, (old) => (old ? { ...old, ...snapshot, status: result.status } : old))
      void queryClient.invalidateQueries({ queryKey: gamesQueryKey(queryOwner) })

      try {
        const fresh = await queryClient.fetchQuery({ queryKey: key, queryFn: () => getGame(game.gameId), staleTime: 0 })

        setBaseUpdatedAt(fresh.updatedAt)
      } catch {
        // Không lấy lại được bản mới thì giữ bản vừa vá; xuất bản đã thành công.
      }
    },
  })

  // Giá trị mới nhất cho các nơi cần ghi sao lưu ngay (rời trang, đóng tab) mà không bị dính giá trị cũ của lần vẽ trước.
  const latest = useRef({ dirty, pendingRestore, draft: state.draft, baseline: state.baseline, baseUpdatedAt })

  useEffect(() => {
    latest.current = { dirty, pendingRestore, draft: state.draft, baseline: state.baseline, baseUpdatedAt }
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

    const timer = setTimeout(() => {
      if (sessionActive()) saveDraft(owner, game.gameId, stripTransientMedia(state.draft, state.baseline), baseUpdatedAt)
    }, BACKUP_DELAY_MS)

    return () => clearTimeout(timer)
  }, [dirty, pendingRestore, owner, game.gameId, baseUpdatedAt, state.draft, state.baseline])

  // Rời trang hoặc đóng tab trong lúc chờ 0,5 giây: ghi ngay phần vừa gõ.
  useEffect(() => {
    const flush = () => {
      const current = latest.current

      if (current.dirty && !current.pendingRestore && sessionActive()) {
        saveDraft(owner, game.gameId, stripTransientMedia(current.draft, current.baseline), current.baseUpdatedAt)
      }
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

  // Lỗi của từng câu tính TRỰC TIẾP trên bản đang soạn (không đợi bấm Lưu) để form hiện lỗi ngay dưới ô đang sửa.
  const liveIssues = useMemo(() => validateGame(state.draft, 'save', { baseline: state.baseline }), [state.draft, state.baseline])

  const savedQuestionIds = useMemo(() => new Set(state.baseline.questions.map((question) => question.id)), [state.baseline])

  // Sau lần bấm Xuất bản đầu tiên, lỗi dữ liệu tính lại theo từng lần sửa (kiểm tra theo chế độ XUẤT BẢN, chặt hơn Lưu).
  const publishIssues = useMemo(
    () => (publishAttempted ? validateGame(state.draft, 'publish', { baseline: state.baseline }) : []),
    [publishAttempted, state.draft, state.baseline],
  )

  const edit = (action: Parameters<typeof dispatch>[0]) => {
    setLastSaveOk(false)
    // Sửa tiếp thì lỗi lưu lần trước không còn đúng nữa (đang lưu dở thì để nguyên, tránh mở khóa nút Lưu giữa chừng).
    if (!mutation.isPending) mutation.reset()
    if (!publishMutation.isPending) publishMutation.reset()
    dispatch(action)
  }

  /** Trả về các lỗi tìm thấy (rỗng nghĩa là đã gửi đi), để trang đưa tiêu điểm tới ô lỗi đầu tiên. */
  const save = (): ValidationIssue[] => {
    // Đang xuất bản (đã gồm lưu) thì không gửi thêm bản lưu chồng lên.
    if (publishMutation.isPending) return []

    setLastSaveOk(false)
    setAttempted(true)
    mutation.reset()
    publishMutation.reset()

    // UC-04 luồng 5a: còn câu thiếu đáp án hoặc nội dung chưa hợp lệ thì báo và KHÔNG gửi lên máy chủ.
    const found = validateGame(state.draft, 'save', { baseline: state.baseline })

    if (found.length > 0) return found

    // Gửi bản đã cắt khoảng trắng hai đầu; bản đang soạn cũng được cắt để không còn "chưa lưu" chỉ vì dấu cách thừa.
    dispatch({ type: 'normalize' })
    mutation.mutate(trimContent(state.draft))

    return []
  }

  /**
   * Xuất bản bản đang soạn. Trả về các lỗi tìm thấy (rỗng nghĩa là đã gửi đi hoặc đang có lần lưu/xuất bản chạy). Dữ liệu chưa đủ thì KHÔNG gọi mạng (2c).
   * Đang lưu hoặc đang xuất bản thì bỏ qua (chống bấm đúp, và không gửi hai bản chồng nhau).
   */
  const publish = (): ValidationIssue[] => {
    if (mutation.isPending || publishMutation.isPending) return []

    setPublishAttempted(true)
    setPublishResult(null)

    const found = validateGame(state.draft, 'publish', { baseline: state.baseline })

    if (found.length > 0) return found

    dispatch({ type: 'normalize' })
    publishMutation.mutate(trimContent(state.draft))

    return []
  }

  /** Kiểm tra bản đang soạn như lúc lưu (dùng cho chơi thử: thiếu dữ liệu thì không mở màn chơi). */
  const validate = () => validateGame(state.draft, 'save', { baseline: state.baseline })

  const saveError = mutation.isError ? parseApiError(mutation.error, viText.editor.save.saveErrorTitle) : null

  return {
    draft: state.draft,
    dirty,
    saving: mutation.isPending,
    savedNotice: lastSaveOk && !dirty,
    issues,
    liveIssues,
    revision,
    issueSummary: summarizeIssues(issues, 'save'),
    saveError,
    pendingRestore,
    setTitle: (title: string) => edit({ type: 'setTitle', title }),
    setTopic: (topic: string) => edit({ type: 'setTopic', topic }),
    updateQuestion: (index: number, questionId: string, update: (question: QuestionDsl) => QuestionDsl) =>
      edit({ type: 'updateQuestion', index, questionId, update }),
    /** Mã các thẻ câu vừa được AI làm lại và còn hoàn tác được. */
    regeneratedIds: Object.keys(state.undo),
    /** Mã các câu đã có trên máy chủ (theo bản đã lưu gần nhất): chỉ những câu này AI làm lại được. */
    savedQuestionIds,
    /**
     * Đưa câu AI làm lại vào đúng thẻ, áp lên bản đang soạn HIỆN HÀNH (các thẻ khác và sửa tay chưa lưu giữ nguyên). Câu mới phải qua bộ kiểm tra
     * như lúc lưu (kèm bản đã lưu làm mốc); không hợp lệ thì KHÔNG áp, câu cũ giữ nguyên. `stale`: thẻ đã đổi chỗ hoặc không còn.
     */
    applyRegenerated: (index: number, questionId: string, question: QuestionDsl): ApplyRegeneratedResult => {
      const { draft, baseline } = latest.current
      const target = draft.questions[index]

      if (!target || target.id !== questionId || question.id !== questionId) return { ok: false, reason: 'stale' }

      const candidate = { ...draft, questions: draft.questions.map((item, position) => (position === index ? question : item)) } as GameDsl
      const invalid = validateGame(candidate, 'save', { baseline }).some((issue) => issue.questionIndex === index)

      if (invalid) return { ok: false, reason: 'invalid' }

      edit({ type: 'applyRegenerated', index, questionId, question })
      // Các ô nhập giữ chữ gõ dở thì dựng lại để hiện đúng nội dung mới.
      setRevision((value) => value + 1)

      return { ok: true }
    },
    undoRegenerated: (index: number, questionId: string) => {
      edit({ type: 'undoRegenerated', index, questionId })
      setRevision((value) => value + 1)
    },
    save,
    publish,
    publishing: publishMutation.isPending,
    publishIssues,
    publishIssueSummary: summarizeIssues(publishIssues, 'publish'),
    publishFailure: publishMutation.isError ? describePublishError(publishMutation.error) : null,
    /** Kết quả lần xuất bản thành công gần nhất (mã chia sẻ, địa chỉ); null khi chưa xuất bản trong phiên này hoặc đã đóng. */
    publishResult,
    dismissPublishResult: () => setPublishResult(null),
    validate,
    restore: () => {
      if (!pendingRestore) return

      edit({ type: 'restore', content: pendingRestore.content })
      setRevision((value) => value + 1)
      setPendingRestore(null)
    },
    discardRestore: () => {
      clearDraft(owner, game.gameId)
      setPendingRestore(null)
    },
  }
}
