import { useState } from 'react'
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
import { CpfUniversalCanvas } from '../../services/pipeline/renderers/CpfUniversalCanvas'
import { generateDynamicCpfSceneGraph } from '../../services/pipeline/dynamicCpfGenerator'
import { ConfettiEffect } from '../../games/common/ConfettiEffect'

// Tải thông tin xuất bản, chọn khung theo profile, rồi giao lượt chơi cho PlayController.
export default function PlayPage() {
  const { shareCode = '' } = useParams()
  const info = useQuery(publishInfoQuery(shareCode))

  const [cpfScore, setCpfScore] = useState(0)
  const [cpfCompleted, setCpfCompleted] = useState(false)

  usePageTitle(info.data?.gameTitle ?? viText.player.pageTitle)

  // Chưa biết khung (đang tải hoặc lỗi) thì dùng token của khung Bé: chữ lớn, nút to, phù hợp nhất cho trẻ nhỏ.
  const profile = info.data ? resolveUiProfile({ uiOverride: info.data.uiOverride, gradeLevel: info.data.metadata.gradeLevel }) : PROFILES.be
  usePlayerRootStyle(profile)

  if (info.isPending) return <PlayerLoading />

  if (info.isError) {
    const ErrorScreen = ERROR_SCREENS[profile.band]
    const kind = publishErrorKind(info.error)

    // Chỉ lỗi mạng mới đáng thử lại; mã sai, hết hạn, tạm đóng thì thử lại không giúp được gì.
    return <ErrorScreen kind={kind} code={errorCodeOf(info.error)} onRetry={kind === 'network' ? () => void info.refetch() : undefined} busy={info.isFetching} />
  }

  if (!info.data) return <PlayerLoading />

  const isPublishedCpf =
    info.data?.gameType === ('PHYSICS_SLING_ARCHERY' as any) ||
    info.data?.gameType === ('FALLING_CATCHER' as any) ||
    info.data?.gameType === ('POP_TAPPER' as any) ||
    (info.data?.metadata as any)?.track === 'CPF' ||
    (info.data?.metadata as any)?.isCpf === true ||
    (info.data as any)?.sceneGraph !== undefined

  if (info.data && isPublishedCpf) {
    const sceneGraph =
      (info.data as any)?.sceneGraph ||
      generateDynamicCpfSceneGraph(
        info.data.metadata.topic || info.data.gameTitle,
        info.data.metadata.gradeLevel,
        info.data.metadata.subject
      )

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
          {cpfCompleted ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-800/95 rounded-3xl border-4 border-amber-400 shadow-2xl text-center max-w-xl mx-auto space-y-6">
              <ConfettiEffect active={true} />
              <div className="text-6xl animate-bounce">🏆</div>
              <h2 className="text-3xl sm:text-4xl font-black text-amber-300">
                Chúc Mừng Bé Đã Hoàn Thành!
              </h2>
              <p className="text-xl text-slate-200">
                Tổng điểm đạt được: <strong className="text-amber-400 text-3xl">{cpfScore}</strong> điểm
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setCpfCompleted(false); setCpfScore(0); }}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-lg shadow-lg transition-transform active:scale-95"
                >
                  🔄 Chơi lại
                </button>
                <Link
                  to="/join"
                  className="px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg shadow-lg"
                >
                  🚪 Về trang chủ
                </Link>
              </div>
            </div>
          ) : (
            <CpfUniversalCanvas
              sceneGraph={sceneGraph}
              onScoreUpdate={setCpfScore}
              onComplete={(score) => {
                setCpfScore(score)
                setCpfCompleted(true)
              }}
            />
          )}
        </section>
      </main>
    )
  }

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
