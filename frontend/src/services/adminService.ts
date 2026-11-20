import axiosInstance from '../api/axiosInstance'
import type { ApiSuccessResponse } from '../types/api'

export interface AdminTeacher {
  teacherId: string
  fullName: string
  email: string
  school: string | null
  status: 'ACTIVE' | 'LOCKED'
  createdAt: string
}

export interface CreateTeacherPayload {
  fullName: string
  email: string
  school?: string
  initialPassword: string
}

export interface UpdateTeacherPayload {
  fullName?: string
  school?: string
}

export interface TeacherStatusResult {
  teacherId: string
  status: 'ACTIVE' | 'LOCKED'
}

export interface AuditLogEntry {
  logId: string
  timestamp: string
  actorId: string
  actorRole: string
  ip: string | null
  action: string
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED'
  moderationResult: string | null
}

export interface PageResult<T> {
  page: number
  size: number
  totalItems: number
  totalPages: number
  items: T[]
}

export async function getTeachers(params?: {
  search?: string
  status?: string
  page?: number
  size?: number
}) {
  const response = await axiosInstance.get<ApiSuccessResponse<PageResult<AdminTeacher>>>(
    '/admin/teachers',
    { params },
  )
  return response.data.data
}

export async function getTeacher(teacherId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<AdminTeacher>>(
    `/admin/teachers/${encodeURIComponent(teacherId)}`,
  )
  return response.data.data
}

export async function createTeacher(payload: CreateTeacherPayload) {
  const response = await axiosInstance.post<ApiSuccessResponse<AdminTeacher>>(
    '/admin/teachers',
    payload,
  )
  return response.data.data
}

export async function updateTeacher(teacherId: string, payload: UpdateTeacherPayload) {
  const response = await axiosInstance.put<ApiSuccessResponse<AdminTeacher>>(
    `/admin/teachers/${encodeURIComponent(teacherId)}`,
    payload,
  )
  return response.data.data
}

export async function lockTeacher(teacherId: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<TeacherStatusResult>>(
    `/admin/teachers/${encodeURIComponent(teacherId)}/lock`,
  )
  return response.data.data
}

export async function unlockTeacher(teacherId: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<TeacherStatusResult>>(
    `/admin/teachers/${encodeURIComponent(teacherId)}/unlock`,
  )
  return response.data.data
}

export async function getAuditLogs(params?: {
  actorId?: string
  action?: string
  result?: string
  from?: string
  to?: string
  page?: number
  size?: number
}) {
  const response = await axiosInstance.get<ApiSuccessResponse<PageResult<AuditLogEntry>>>(
    '/admin/audit-logs',
    { params },
  )
  return response.data.data
}

export interface AiConfigVersion {
  versionId: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  moderationThreshold: number
  label: string | null
  frozen: boolean
  active: boolean
  sha256: string
  createdAt: string
  createdBy: string
}

export interface AiConfigResponse {
  active: AiConfigVersion
  versions: AiConfigVersion[]
}

export interface AiConfigInput {
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  moderationThreshold?: number
}

export interface BlockedWords {
  words: string[]
}

export async function getAiConfig() {
  const response = await axiosInstance.get<ApiSuccessResponse<AiConfigResponse>>('/admin/ai-config')
  return response.data.data
}

export async function createAiConfigVersion(input: AiConfigInput) {
  const response = await axiosInstance.post<ApiSuccessResponse<AiConfigVersion>>(
    '/admin/ai-config/versions',
    input,
  )
  return response.data.data
}

export async function freezeAiConfigVersion(versionId: string, label?: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<AiConfigVersion>>(
    `/admin/ai-config/versions/${encodeURIComponent(versionId)}/freeze`,
    { label },
  )
  return response.data.data
}

export async function activateAiConfigVersion(versionId: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<AiConfigVersion>>(
    `/admin/ai-config/versions/${encodeURIComponent(versionId)}/activate`,
  )
  return response.data.data
}

export async function getBlockedWords() {
  const response = await axiosInstance.get<ApiSuccessResponse<BlockedWords>>('/admin/safety/blocked-words')
  return response.data.data
}

export async function replaceBlockedWords(words: string[]) {
  const response = await axiosInstance.put<ApiSuccessResponse<BlockedWords>>(
    '/admin/safety/blocked-words',
    { words },
  )
  return response.data.data
}

export interface ServiceUsageItem {
  service: 'GENERATIVE_AI' | 'IMAGE_API' | 'TTS' | 'MODERATION'
  requests: number
  successCount: number
  failureCount: number
  tokensUsed: number | null
  avgLatencyMs: number | null
  cost: number | null
  costUnit: string | null
  costSource: 'BILLING' | 'ESTIMATED' | 'UNAVAILABLE'
  status: 'OPERATIONAL' | 'UNREACHABLE' | 'UNKNOWN'
}

export interface UsageRange {
  from: string
  to: string
}

export interface TimeseriesPoint {
  date: string
  requests: number
}

export interface UsageReport {
  range: UsageRange
  services: ServiceUsageItem[]
  timeseries: TimeseriesPoint[]
}

export interface SystemStatus {
  server: {
    cpu: number
    memory: number
    activeThreads: number
  }
  database: {
    connectionPoolUsage: number
  }
  liveArena: {
    activeSessions: number
    connectedClients: number
  }
}

export interface BudgetConfig {
  monthlyBudget: number
  yellowPct: number
  redPct: number
  costCapExceeded: boolean
  currentMonthCost?: number
  usedPercent?: number
}

export interface UpdateBudgetPayload {
  monthlyBudget: number
  yellowPct?: number
  redPct?: number
}

export async function getUsageReport(params?: {
  range?: string
  from?: string
  to?: string
  service?: string
}) {
  const response = await axiosInstance.get<ApiSuccessResponse<UsageReport>>('/admin/usage', {
    params,
  })
  return response.data.data
}

export async function getSystemStatus() {
  const response = await axiosInstance.get<ApiSuccessResponse<SystemStatus>>('/admin/system-status')
  return response.data.data
}

export async function getBudgetConfig() {
  const response = await axiosInstance.get<ApiSuccessResponse<BudgetConfig>>('/admin/budget-config')
  return response.data.data
}

export async function updateBudgetConfig(payload: UpdateBudgetPayload) {
  const response = await axiosInstance.post<ApiSuccessResponse<BudgetConfig>>(
    '/admin/budget-config',
    payload,
  )
  return response.data.data
}

