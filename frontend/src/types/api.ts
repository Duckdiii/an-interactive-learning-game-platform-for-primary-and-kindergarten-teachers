export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorDetails {
  [field: string]: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    field?: string
    details?: ApiErrorDetails
  }
}
