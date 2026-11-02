import axios from 'axios'

const NETWORK_CODE = 'NET-01'

/** Mã lỗi hiện cho người lớn: `error.code` của Backend nếu có, còn lại (mất mạng, lỗi lạ) là NET-01. */
export function errorCodeOf(error: unknown): string {
  if (!axios.isAxiosError(error)) return NETWORK_CODE

  const code = (error.response?.data as { error?: { code?: unknown } } | undefined)?.error?.code

  return typeof code === 'string' && code !== '' ? code : NETWORK_CODE
}
