import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import PlayButton from '../components/PlayButton'
import LoadingSpinner from '../../components/LoadingSpinner'
import { viText } from '../../constants/viText'
import { usePageTitle } from '../../hooks/usePageTitle'
import { getPlayerApi } from '../api'
import { PROFILES } from '../profile/profiles'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import PlayController from '../play/PlayController'

// Tải thông tin xuất bản, chọn khung theo profile, rồi giao lượt chơi cho PlayController.
export default function PlayPage() {
  const { shareCode = '' } = useParams()
  const info = useQuery({
    queryKey: ['player', 'publishInfo', shareCode],
    queryFn: async () => (await getPlayerApi()).getPublishInfo(shareCode),
    retry: false,
  })

  usePageTitle(info.data?.gameTitle ?? viText.player.pageTitle)

  // Chưa biết khung (đang tải hoặc lỗi) thì dùng token của khung Bé: chữ lớn, nút to, phù hợp nhất cho trẻ nhỏ.
  const profile = info.data ? resolveUiProfile({ uiOverride: info.data.uiOverride, gradeLevel: info.data.metadata.gradeLevel }) : PROFILES.be
  usePlayerRootStyle(profile)

  if (info.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-play-page">
        <LoadingSpinner />
      </main>
    )
  }

  if (info.isError) {
    // 404 mã sai, 403 tắt mã, 410 hết hạn: thử lại không giúp được gì.
    const notFound = axios.isAxiosError(info.error) && [403, 404, 410].includes(info.error.response?.status ?? 0)

    return (
      <main className="grid min-h-screen place-items-center bg-play-page px-4 text-center text-play-ink">
        <section role="alert" className="max-w-md">
          <h1 className="text-3xl font-bold">{notFound ? viText.player.notFoundTitle : viText.player.loadErrorTitle}</h1>
          <p className="mt-3 text-lg text-play-ink-soft">{notFound ? viText.player.notFoundDescription : viText.player.loadErrorDescription}</p>
          {notFound ? null : (
            <PlayButton className="mt-6" onClick={() => void info.refetch()}>
              {viText.player.retry}
            </PlayButton>
          )}
        </section>
      </main>
    )
  }

  const theme = resolveTheme({ themeId: info.data.themeId, gameType: info.data.gameType, subject: info.data.metadata.subject })

  return (
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={theme}>
        <PlayController shareCode={shareCode} title={info.data.gameTitle} gameType={info.data.gameType} />
      </ThemeProvider>
    </UiProfileProvider>
  )
}
