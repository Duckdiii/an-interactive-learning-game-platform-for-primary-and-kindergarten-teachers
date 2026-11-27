import type { ApiSuccessResponse } from '../types/api'
import axiosInstance from './axiosInstance'

export interface TeacherProfile {
  school: string | null
  textbook: string | null
  voice: string | null
  subject: string | null
  gradeLevel: string | null
}

export interface SavedSuggestion {
  id: string
  topic: string
}

export async function fetchTeacherProfile() {
  const response = await axiosInstance.get<ApiSuccessResponse<TeacherProfile>>('/teacher/profile')
  return response.data.data
}

export async function saveTeacherProfile(input: TeacherProfile) {
  const response = await axiosInstance.post<ApiSuccessResponse<TeacherProfile>>('/teacher/profile', input)
  return response.data.data
}

export async function resetTeacherProfile() {
  await axiosInstance.delete('/teacher/profile')
}

export async function fetchSavedSuggestions() {
  const response = await axiosInstance.get<ApiSuccessResponse<SavedSuggestion[]>>('/teacher/suggestions')
  return response.data.data
}

export async function rememberSuggestion(topic: string) {
  await axiosInstance.post('/teacher/suggestions', { topic })
}

export async function forgetSuggestion(id: string | null) {
  await axiosInstance.delete(id === null ? '/teacher/suggestions' : '/teacher/suggestions/' + encodeURIComponent(id))
}
