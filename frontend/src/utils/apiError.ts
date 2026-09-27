import axios from 'axios'
import type { ApiErrorResponse } from '../types/api'

export interface ParsedApiError {
  message: string
  fieldErrors: Record<string, string>
}

export function parseApiError(
  error: unknown,
  fallbackMessage: string,
): ParsedApiError {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return { message: fallbackMessage, fieldErrors: {} }
  }

  const apiError = error.response?.data.error

  if (!apiError) {
    return { message: fallbackMessage, fieldErrors: {} }
  }

  const fieldErrors = { ...apiError.details }

  if (apiError.field) {
    fieldErrors[apiError.field] = apiError.message
  }

  return {
    message: apiError.message || fallbackMessage,
    fieldErrors,
  }
}
