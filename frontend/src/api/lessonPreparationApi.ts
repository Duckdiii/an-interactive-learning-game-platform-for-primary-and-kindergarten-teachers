import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'

export const LESSON_PREPARATION_TIMEOUT_MS = 60_000

export interface PreparedLesson {
  idea: string
}

export interface PrepareLessonInput {
  subject: string
  gradeLevel: string
  idea?: string
  file: File
}

/** Extracts one PDF/DOCX and asks Gemini for a teacher-reviewable idea; it does not save a game. */
export async function postPrepareLesson(input: PrepareLessonInput, signal?: AbortSignal): Promise<PreparedLesson> {
  const body = new FormData()
  body.append('subject', input.subject)
  body.append('gradeLevel', input.gradeLevel)
  if (input.idea?.trim()) body.append('idea', input.idea.trim())
  body.append('file', input.file)

  const response = await axiosInstance.post<ApiSuccessResponse<PreparedLesson>>('/games/prepare', body, {
    timeout: LESSON_PREPARATION_TIMEOUT_MS,
    signal,
  })

  return response.data.data
}
