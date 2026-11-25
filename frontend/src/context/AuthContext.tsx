import type { ReactNode } from 'react'
import { useState } from 'react'
import { logoutTeacher } from '../api/authApi'
import { AuthContextObject } from './authContextObject'
import type { AuthSession, AuthUser } from '../types/auth'
import { clearAllDrafts, clearDraftsExcept } from '../utils/draftStorage'
import { clearNewGames } from '../utils/newGames'
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from '../utils/authStorage'

function createInitialSession(): AuthSession {
  const storedSession = readStoredSession()

  return {
    user: storedSession.user,
    token: storedSession.accessToken,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(createInitialSession)

  const login = (user: AuthUser, token: string) => {
    setSession({ user, token })
    storeSession(user, token)
    // Phiên của người trước có thể hết hạn (401) mà chưa đăng xuất nên còn bản sao lưu: người mới đăng nhập thì dọn, chỉ giữ của chính mình.
    clearDraftsExcept(user.teacherId)
    // Dấu "Mới" của người trước cũng không được để lại cho người sau.
    clearNewGames()
  }

  const logout = async () => {
    // Thu hồi refresh token ở server trước khi xóa access token (API cần nó). Lỗi mạng/401 vẫn xóa phiên ở máy:
    // refresh token còn sót thì tự hết hạn, còn để giáo viên kẹt ở trạng thái đăng nhập trên máy dùng chung thì tệ hơn.
    try {
      await logoutTeacher()
    } catch {
      // Bỏ qua có chủ đích, xem chú thích trên.
    }
    setSession({ user: null, token: null })
    clearStoredSession()
    // Máy dùng chung ở trường: không để lại bản sao lưu nội dung của giáo viên vừa đăng xuất.
    clearAllDrafts()
    // Máy dùng chung: dấu "Mới" (game vừa tạo) của giáo viên vừa đăng xuất không được còn lại.
    clearNewGames()
  }

  return (
    <AuthContextObject.Provider
      value={{
        user: session.user,
        token: session.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContextObject.Provider>
  )
}
