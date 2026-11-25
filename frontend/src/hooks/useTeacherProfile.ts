import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSavedSuggestions, fetchTeacherProfile, forgetSuggestion, rememberSuggestion, resetTeacherProfile, saveTeacherProfile,
} from '../api/teacherProfileApi'
import type { TeacherProfile } from '../api/teacherProfileApi'
import { useTeacherIdentity } from './useTeacherIdentity'

const profileKey = (owner: string | null) => ['teacherProfile', owner] as const
const suggestionsKey = (owner: string | null) => ['teacherSuggestions', owner] as const

export function useTeacherProfile() {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({ queryKey: profileKey(cacheOwner), queryFn: fetchTeacherProfile, enabled: cacheOwner !== null, retry: false })
}

export function useSavedSuggestions() {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({ queryKey: suggestionsKey(cacheOwner), queryFn: fetchSavedSuggestions, enabled: cacheOwner !== null, retry: false })
}

export function useTeacherProfileActions() {
  const { cacheOwner } = useTeacherIdentity()
  const client = useQueryClient()
  const refreshSuggestions = () => client.invalidateQueries({ queryKey: suggestionsKey(cacheOwner) })

  return {
    save: useMutation({
      mutationFn: (input: TeacherProfile) => saveTeacherProfile(input),
      onSuccess: (profile) => { client.setQueryData(profileKey(cacheOwner), profile) },
    }),
    reset: useMutation({
      mutationFn: () => resetTeacherProfile(),
      onSuccess: async () => {
        client.setQueryData(suggestionsKey(cacheOwner), [])
        await Promise.all([client.invalidateQueries({ queryKey: profileKey(cacheOwner) }), refreshSuggestions()])
      },
    }),
    remember: useMutation({ mutationFn: (topic: string) => rememberSuggestion(topic), onSuccess: refreshSuggestions }),
    forget: useMutation({ mutationFn: (id: string | null) => forgetSuggestion(id), onSuccess: refreshSuggestions }),
  }
}
