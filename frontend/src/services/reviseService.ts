import { postReviseGame, saveGame, type ReviseGameBody } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { AnyGameResponse, CpfGameEnvelopeBody, CpfGameResponse } from '../types/game-response.types'
import { getMockGame } from './mock/mockGames'
import { runMock } from './mock/mockRuntime'

/** `POST /games/{gameId}/revise` (AI sửa game theo chat, không lưu). Nhóm `ai` đang mô phỏng thì trả game mẫu, tên game có thêm "(đã sửa)". */
export async function reviseGame(gameId: string, body: ReviseGameBody, options: { signal?: AbortSignal } = {}): Promise<AnyGameResponse> {
  if (!isMock('ai')) return postReviseGame(gameId, body, options)

  return runMock(() => {
    const game = getMockGame(gameId)
    return { ...game, metadata: { ...game.metadata, title: `${game.metadata.title} (đã sửa)`.slice(0, 100) } }
  })
}

/** `PUT /games/{gameId}` cho game CUSTOM: lưu nguyên game CPF (sau khi giáo viên giữ bản AI sửa). */
export async function saveCpfGame(gameId: string, cpf: CpfGameEnvelopeBody): Promise<CpfGameResponse> {
  // Thân PUT của game CUSTOM là nguyên game CPF (openapi CpfGameEnvelope); saveGame chỉ khai báo kiểu DSL.
  return (await saveGame(gameId, cpf as never)) as unknown as CpfGameResponse
}
