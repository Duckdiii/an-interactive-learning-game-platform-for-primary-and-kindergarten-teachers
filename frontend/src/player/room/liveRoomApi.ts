import axios from 'axios'
import axiosInstance from '../../api/axiosInstance'
import type { ApiErrorResponse, ApiSuccessResponse } from '../../types/api'
import { PLAYER_REQUEST_TIMEOUT_MS } from '../api/realPlayerApi'
import type { RoomStatus } from './RoomClient'

export type LiveRoomType = 'SOLO' | 'TEAM'
export type GroupingStrategy = 'RANDOM' | 'MANUAL_ASSIGN' | 'FREE_CHOICE'

interface LiveTeam {
  teamId: string
  teamName: string
  memberCount: number
}

interface LiveRoom {
  sessionId: string
  gameTitle: string
  sessionType: LiveRoomType
  status: RoomStatus
  groupingStrategy: GroupingStrategy | null
  teams: LiveTeam[]
}

export interface OpenLiveRoom {
  sessionId: string
  accessCode: string
  status: RoomStatus
  sessionType: LiveRoomType
}

interface LiveRoomDetail extends OpenLiveRoom {
  participants: { participantId: string; nickname: string; score: number; answeredCount: number; teamId: string | null }[]
  teams: LiveTeam[]
}

export type RoomAction = 'start' | 'pause' | 'resume' | 'close'

const config = { timeout: PLAYER_REQUEST_TIMEOUT_MS }
const gamePath = (gameId: string) => `/games/${encodeURIComponent(gameId)}/sessions`
const sessionPath = (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`

export async function findLiveRoom(pin: string): Promise<LiveRoom | null> {
  try {
    const response = await axiosInstance.get<ApiSuccessResponse<LiveRoom>>(`/sessions/by-code/${encodeURIComponent(pin)}`, config)
    return response.data.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export async function openLiveRoom(
  gameId: string,
  options: { classroomId?: string } & (
    { sessionType: 'SOLO'; maxParticipants?: number } |
    { sessionType: 'TEAM'; groupingStrategy: GroupingStrategy; teams: { teamName: string }[] }
  ),
) {
  const response = await axiosInstance.post<ApiSuccessResponse<OpenLiveRoom>>(
    gamePath(gameId), options, config,
  )
  return response.data.data
}

export async function findOpenLiveRoom(gameId: string): Promise<OpenLiveRoom | null> {
  const response = await axiosInstance.get<ApiSuccessResponse<(Omit<OpenLiveRoom, 'sessionType'> & { sessionType: string })[]>>(gamePath(gameId), config)
  return response.data.data.find((item): item is OpenLiveRoom =>
    item.status !== 'CLOSED' && (item.sessionType === 'SOLO' || item.sessionType === 'TEAM')) ?? null
}

export async function getLiveRoom(sessionId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<LiveRoomDetail>>(sessionPath(sessionId), config)
  return response.data.data
}

export async function controlLiveRoom(sessionId: string, action: RoomAction) {
  const response = await axiosInstance.post<ApiSuccessResponse<{ status: RoomStatus }>>(`${sessionPath(sessionId)}/${action}`, undefined, config)
  return response.data.data
}

export async function joinLiveRoom(sessionId: string, nickname: string, teamId?: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<{ participantId: string; nickname: string; team: LiveTeam | null }>>(
    `${sessionPath(sessionId)}/join`, { nickname, teamId }, config,
  )
  return { sessionId, ...response.data.data }
}

export async function assignLiveTeam(sessionId: string, participantId: string, teamId: string) {
  await axiosInstance.put(`${sessionPath(sessionId)}/participants/${encodeURIComponent(participantId)}/team`, { teamId }, config)
}

const participantConfig = (participantId: string) => ({ ...config, headers: { 'X-Participant-Id': participantId } })

export async function changeLiveTeam(sessionId: string, participantId: string, teamId: string) {
  await axiosInstance.put(`${sessionPath(sessionId)}/my-team`, { teamId }, participantConfig(participantId))
}

export async function getLiveTeamLeaderboard(sessionId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<{ teams: (LiveTeam & { rank: number; score: number })[] }>>(
    `${sessionPath(sessionId)}/leaderboard`, config,
  )
  return response.data.data.teams
}

export async function getLiveResult(sessionId: string, participantId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<{
    score: number; correctCount: number; answeredCount: number; totalQuestions: number;
  }>>(`${sessionPath(sessionId)}/my-result`, participantConfig(participantId))
  return response.data.data
}

export function liveRoomError(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return fallback
  const response = error.response
  if (!response || response.status >= 500) return fallback
  return response.data?.error?.message || fallback
}
