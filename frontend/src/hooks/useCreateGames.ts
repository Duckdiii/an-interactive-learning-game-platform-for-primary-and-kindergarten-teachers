import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createGames } from '../services/gamesService'
import type { GameResponse } from '../types/game-response.types'
import { describeGenerateError } from '../utils/generateErrors'
import type { GenerateFailure } from '../utils/generateErrors'
import type { GenerateGameRequest } from '../utils/generateRequest'
import { markNewGames } from '../utils/newGames'
import { gamesQueryKey } from './useGames'
import { useTeacherIdentity } from './useTeacherIdentity'

// Kết quả của một lần bấm "Tạo": done (đủ mọi loại), partial (còn loại lỗi), canceled (giáo viên hủy), busy (đang có lần tạo khác).
export type CreateOutcome = { status: 'done'; games: GameResponse[] } | { status: 'partial' } | { status: 'canceled' } | { status: 'busy' }

/**
 * Tạo game bằng AI cho nhiều loại một lúc (UC-02) và NHỚ kết quả từng loại: loại đã tạo xong không bao giờ bị tạo lại khi giáo viên bấm "Thử lại" cho phần còn thiếu
 * (không tạo trùng). Game tạo xong được đánh dấu "Mới" ngay và danh sách game được làm mới. Hủy hoặc rời trang thì hủy mọi yêu cầu đang chờ. Không tự thử lại.
 */
export function useCreateGames() {
  const queryClient = useQueryClient()
  const { cacheOwner } = useTeacherIdentity()
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<Readonly<Record<string, GameResponse>>>({})
  const [failures, setFailures] = useState<Readonly<Record<string, GenerateFailure>>>({})
  const [canceled, setCanceled] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const createdRef = useRef<Record<string, GameResponse>>({})
  // Loại đã lỗi mà thử lại y nguyên vô ích (không an toàn, thiếu khối lớp/môn): không gửi lại cho tới khi giáo viên đổi dữ liệu (reset).
  const hopelessRef = useRef<Set<string>>(new Set())
  const failuresRef = useRef<Record<string, GenerateFailure>>({})
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true

    return () => {
      aliveRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  const create = useCallback(
    async (requests: ReadonlyArray<GenerateGameRequest>): Promise<CreateOutcome> => {
      // Đang tạo thì bỏ qua lần bấm thứ hai (bấm đúp không được tạo trùng).
      if (controllerRef.current) return { status: 'busy' }

      const controller = new AbortController()
      // Chỉ tạo các loại CHƯA có game: thử lại phần còn thiếu không tạo trùng phần đã xong.
      const missing = requests.filter((request) => !createdRef.current[request.gameType ?? ''] && !hopelessRef.current.has(request.gameType ?? ''))

      // Chỉ còn loại không thể thử lại y nguyên: không gọi gì (đỡ tốn hạn mức 10 yêu cầu mỗi phút), giữ nguyên lỗi đang hiện.
      if (missing.length === 0 && !requests.every((request) => createdRef.current[request.gameType ?? ''])) return { status: 'partial' }

      controllerRef.current = controller
      setCreating(true)
      setCanceled(false)

      // Lỗi của loại không thể thử lại vẫn phải hiện (loại đó không được gửi lại nên sẽ không có kết quả mới thay thế).
      const kept: Record<string, GenerateFailure> = {}

      for (const type of hopelessRef.current) if (failuresRef.current[type]) kept[type] = failuresRef.current[type]

      setFailures(kept)

      try {
        const outcomes = await createGames(missing, controller.signal)
        const nextFailures: Record<string, GenerateFailure> = { ...kept }
        const newIds: string[] = []

        for (const outcome of outcomes) {
          if (outcome.ok) {
            createdRef.current[outcome.gameType] = outcome.game
            newIds.push(outcome.game.gameId)
          } else {
            const failure = describeGenerateError(outcome.error)

            if (failure.kind !== 'canceled') nextFailures[outcome.gameType] = failure
            if (failure.kind === 'unsafe' || failure.kind === 'needLesson') hopelessRef.current.add(outcome.gameType)
          }
        }

        // Game đã tạo thì có thật trên máy chủ dù sau đó giáo viên rời trang: vẫn đánh dấu và làm mới danh sách.
        markNewGames(newIds)
        if (newIds.length > 0) void queryClient.invalidateQueries({ queryKey: gamesQueryKey(cacheOwner ?? '') })

        const all = requests.map((request) => createdRef.current[request.gameType ?? ''])
        // Đã rời trang (hoặc hủy) thì không báo "xong" để trang không điều hướng nữa; game đã tạo vẫn có thật và đã được đánh dấu.
        const done = all.every(Boolean) && aliveRef.current && !controller.signal.aborted

        failuresRef.current = nextFailures

        if (aliveRef.current) {
          setCreated({ ...createdRef.current })
          setFailures(nextFailures)
          setCanceled(controller.signal.aborted && !done)
        }

        if (done) return { status: 'done', games: all }

        return controller.signal.aborted ? { status: 'canceled' } : { status: 'partial' }
      } finally {
        controllerRef.current = null
        if (aliveRef.current) setCreating(false)
      }
    },
    [cacheOwner, queryClient],
  )

  const cancel = useCallback(() => controllerRef.current?.abort(), [])

  /** Xóa kết quả đã nhớ (giáo viên đổi ý tưởng hoặc lựa chọn): game đã tạo vẫn còn trong danh sách của họ, chỉ không còn được dùng lại cho lần tạo mới. */
  const reset = useCallback(() => {
    if (controllerRef.current) return

    createdRef.current = {}
    hopelessRef.current = new Set()
    failuresRef.current = {}
    setCreated({})
    setFailures({})
    setCanceled(false)
  }, [])

  return { creating, created, failures, canceled, create, cancel, reset }
}
