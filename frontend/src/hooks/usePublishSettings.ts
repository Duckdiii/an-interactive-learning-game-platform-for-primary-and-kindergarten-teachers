import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPublishSettingsApi, PublishSettingsNotSupportedError } from '../services/publishSettings'
import type { PublishSettings } from '../services/publishSettings'
import { useTeacherIdentity } from './useTeacherIdentity'

// `supported: false` = Backend chưa có endpoint (hàng cài đặt bị khóa). Đổi lựa chọn là gọi `update` ngay; trong lúc lưu hiện luôn giá trị mới.
export function usePublishSettings(gameId: string) {
  const { cacheOwner } = useTeacherIdentity()
  const queryClient = useQueryClient()
  const key = ['publish-settings', cacheOwner ?? '', gameId]

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<PublishSettings | null> => {
      try {
        return await (await getPublishSettingsApi()).get(gameId)
      } catch (error) {
        if (error instanceof PublishSettingsNotSupportedError) return null
        throw error
      }
    },
    enabled: cacheOwner !== null,
    retry: 1,
  })

  const mutation = useMutation({
    mutationFn: async (next: PublishSettings) => (await getPublishSettingsApi()).update(gameId, next),
    onSuccess: (saved) => queryClient.setQueryData(key, saved),
  })

  const settings = mutation.isPending ? mutation.variables : (query.data ?? null)

  return {
    settings,
    supported: query.data !== null,
    loadFailed: query.isError,
    save: (patch: Partial<PublishSettings>) => {
      if (settings) mutation.mutate({ ...settings, ...patch })
    },
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    saveFailed: mutation.isError,
  }
}
