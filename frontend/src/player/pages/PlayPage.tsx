import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
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
import { PresentationProvider } from '../theme/PresentationContext'
import { resolvePresentation } from '../../utils/presentation'
import { usePlayerRootStyle } from '../theme/usePlayerRootStyle'
import PlayController from '../play/PlayController'

// Tải thông tin xuất bản, chọn khung theo profile, rồi giao lượt chơi cho PlayController.
export default function PlayPage() {
  const { shareCode = '' } = useParams()
  const info = useQuery(publishInfoQuery(shareCode))

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

  const theme = resolveTheme({ themeId: info.data.themeId, gameType: info.data.gameType, subject: info.data.metadata.subject, topic: info.data.metadata.topic })

  return (
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={theme}>
        {/* key: đổi mã trên cùng route thì dựng lại, không giữ biệt danh/tiến độ của game trước. */}
        {/* Thông tin công khai chưa có presentation (REST): chọn cố định theo tên game, giống mọi màn khác. */}
        <PresentationProvider presentation={resolvePresentation(undefined, theme.id, info.data.gameTitle)}>
          <PlayController key={shareCode} shareCode={shareCode} info={info.data} />
        </PresentationProvider>
      </ThemeProvider>
    </UiProfileProvider>
  )
}
