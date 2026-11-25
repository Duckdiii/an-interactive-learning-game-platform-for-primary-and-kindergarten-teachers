import type { ApiSuccessResponse } from '../types/api'
import type { Classroom, ClassroomInput } from '../types/classroom.types'
import axiosInstance from './axiosInstance'

/** GET /classrooms: lớp học của giáo viên đang đăng nhập (sắp theo tên lớp). */
export async function fetchClassrooms() {
  const response = await axiosInstance.get<ApiSuccessResponse<Classroom[]>>('/classrooms')

  return response.data.data
}

/** POST /classrooms: thêm lớp. */
export async function createClassroom(input: ClassroomInput) {
  const response = await axiosInstance.post<ApiSuccessResponse<Classroom>>('/classrooms', input)

  return response.data.data
}

export async function updateClassroom(classroomId: string, input: ClassroomInput) {
  const response = await axiosInstance.put<ApiSuccessResponse<Classroom>>('/classrooms/' + encodeURIComponent(classroomId), input)

  return response.data.data
}

/** DELETE /classrooms/{classroomId}: xóa lớp; trò chơi và phiên đã có không bị ảnh hưởng. */
export async function deleteClassroom(classroomId: string) {
  await axiosInstance.delete(`/classrooms/${encodeURIComponent(classroomId)}`)
}
