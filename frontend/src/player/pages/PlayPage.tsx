import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import PlayerLoading from '../components/PlayerLoading'
import { viText } from '../../constants/viText'
import { usePageTitle } from '../../hooks/usePageTitle'
import { publishInfoQuery } from '../api/publishInfoQuery'
import { ERROR_SCREENS } from '../errors'
import { errorCodeOf } from '../errors/errorCode'
import { publishErrorKind } from '../join/joinCode'
import { PROFILES } from '../profile/profiles'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import PlayController from '../play/PlayController'
import { getPlayGameApi, type PlayGameDtoResponse } from '../../api/gamesApi'
import { CpfUniversalCanvas } from '../../services/pipeline/renderers/CpfUniversalCanvas'
import type { CpfSceneGraph } from '../../services/pipeline/cpfTypes'
import { FarmQuizCanvas } from '../../services/pipeline/renderers/FarmQuizCanvas'
import { generatePresetGame, type PresetQuizData } from '../../services/pipeline/pipelineOrchestrator'

// Tải thông tin xuất bản, chọn khung theo profile, rồi giao lượt chơi cho PlayController.
export default function PlayPage() {
  const { shareCode = '' } = useParams()
  const info = useQuery(publishInfoQuery(shareCode))

  const [pipelineGame, setPipelineGame] = useState<PlayGameDtoResponse | null>(null)
  const [checkedFallback, setCheckedFallback] = useState(false)

  // Kiểm tra dự phòng qua Pipeline API nếu query phiên của Backend chuẩn chưa thấy
  useEffect(() => {
    if (info.isError && shareCode) {
      getPlayGameApi(shareCode)
        .then((res) => {
          if (res) {
            setPipelineGame(res)
          }
        })
        .catch(() => {})
        .finally(() => setCheckedFallback(true))
    }
  }, [info.isError, shareCode])

  usePageTitle(info.data?.gameTitle ?? pipelineGame?.title ?? viText.player.pageTitle)

  // Chưa biết khung (đang tải hoặc lỗi) thì dùng token của khung Bé: chữ lớn, nút to, phù hợp nhất cho trẻ nhỏ.
  const profile = info.data ? resolveUiProfile({ uiOverride: info.data.uiOverride, gradeLevel: info.data.metadata.gradeLevel }) : PROFILES.be
  usePlayerRootStyle(profile)

  if (info.isPending && !pipelineGame) return <PlayerLoading />

  // Render Dual-Track Games từ Pipeline (CPF Archery hoặc Farm Quiz)
  if (pipelineGame) {
    const isCpf = pipelineGame.gameType === 'PHYSICS_SLING_ARCHERY' || pipelineGame.gameType === 'FALLING_CATCHER' || pipelineGame.gameType === 'POP_TAPPER' || (pipelineGame as unknown as { track?: string }).track === 'CPF' || shareCode.toUpperCase().includes('CPF') || shareCode.toUpperCase().includes('ARCHERY')

    const defaultQuizData: PresetQuizData = (pipelineGame.dsl && typeof pipelineGame.dsl === 'object' && 'options' in (pipelineGame.dsl as object))
      ? (pipelineGame.dsl as PresetQuizData)
      : generatePresetGame({
          rawPrompt: 'Phép cộng có nhớ phạm vi 100 nông trại',
          subject: 'Math',
          gradeLevel: 2,
          topic: 'Nông trại toán học',
          theme: 'farm',
          track: 'PRESET',
          mechanic: 'PRESET_QUIZ',
        })

    return (
      <main className="min-h-screen bg-slate-900 text-white flex flex-col p-4 sm:p-6 items-center">
        <header className="w-full max-w-5xl flex items-center justify-between mb-4">
          <Link
            to="/join"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 flex items-center gap-2"
          >
            <span>⬅️</span> Đổi mã phòng khác
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Phòng chơi: {shareCode.toUpperCase()}
            </span>
          </div>
        </header>

        <section className="w-full max-w-5xl flex-1 flex flex-col justify-center">
          {isCpf ? (
            <CpfUniversalCanvas sceneGraph={pipelineGame.dsl as CpfSceneGraph} />
          ) : (
            <FarmQuizCanvas data={(pipelineGame.dsl as PresetQuizData) ?? defaultQuizData} />
          )}
        </section>
      </main>
    )
  }

  if (info.isError) {
    if (!checkedFallback) return <PlayerLoading />

    const ErrorScreen = ERROR_SCREENS[profile.band]
    const kind = publishErrorKind(info.error)

    // Chỉ lỗi mạng mới đáng thử lại; mã sai, hết hạn, tạm đóng thì thử lại không giúp được gì.
    return <ErrorScreen kind={kind} code={errorCodeOf(info.error)} onRetry={kind === 'network' ? () => void info.refetch() : undefined} busy={info.isFetching} />
  }

  if (!info.data) return <PlayerLoading />

  const theme = resolveTheme({ themeId: info.data.themeId, gameType: info.data.gameType, subject: info.data.metadata.subject, topic: info.data.metadata.topic })

  return (
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={theme}>
        {/* key: đổi mã trên cùng route thì dựng lại, không giữ biệt danh/tiến độ của game trước. */}
        <PlayController key={shareCode} shareCode={shareCode} info={info.data} />
      </ThemeProvider>
    </UiProfileProvider>
  )
}
