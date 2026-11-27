import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClassroom, deleteClassroom, fetchClassrooms, updateClassroom } from '../api/classroomsApi'
import type { ClassroomInput } from '../types/classroom.types'
import { useTeacherIdentity } from './useTeacherIdentity'

// Khóa có danh tính giáo viên, cùng lý do với danh sách game: máy dùng chung không lộ lớp của người trước.
const classroomsKey = (owner: string) => ['classrooms', owner] as const

export function useClassrooms() {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({
    queryKey: classroomsKey(cacheOwner ?? ''),
    queryFn: fetchClassrooms,
    enabled: cacheOwner !== null,
    retry: 1,
  })
}

export function useClassroomActions() {
  const { cacheOwner } = useTeacherIdentity()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: classroomsKey(cacheOwner ?? '') })

  return {
    create: useMutation({ mutationFn: (input: ClassroomInput) => createClassroom(input), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ classroomId, input }: { classroomId: string; input: ClassroomInput }) => updateClassroom(classroomId, input),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (classroomId: string) => deleteClassroom(classroomId), onSuccess: refresh }),
  }
}
