import axios from 'axios'
import axiosInstance from '../../api/axiosInstance'
import type { ApiSuccessResponse } from '../../types/api'
import { PLAYER_REQUEST_TIMEOUT_MS } from '../api/realPlayerApi'
import type { RoomStatus } from './RoomClient'

interface LiveRoom {
  sessionId: string
  gameTitle: string
  sessionType: 'SOLO' | 'TEAM'
  status: RoomStatus
}

export interface OpenLiveRoom {
  sessionId: string
  accessCode: string
  status: RoomStatus
}

interface LiveRoomDetail extends OpenLiveRoom {
  participants: { participantId: string; nickname: string; score: number; answeredCount: number }[]
}

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

export async function openLiveRoom(gameId: string, classroomId?: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<OpenLiveRoom>>(
    gamePath(gameId), { sessionType: 'SOLO', ...(classroomId ? { classroomId } : {}) }, config,
  )
  return response.data.data
}

export async function findOpenLiveRoom(gameId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<(OpenLiveRoom & { sessionType: string })[]>>(gamePath(gameId), config)
  return response.data.data.find((room) => room.status !== 'CLOSED' && room.sessionType === 'SOLO') ?? null
}

export async function getLiveRoom(sessionId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<LiveRoomDetail>>(sessionPath(sessionId), config)
  return response.data.data
}

export async function controlLiveRoom(sessionId: string, action: 'start' | 'close') {
  const response = await axiosInstance.post<ApiSuccessResponse<{ status: RoomStatus }>>(`${sessionPath(sessionId)}/${action}`, undefined, config)
  return response.data.data
}

export async function joinLiveRoom(sessionId: string, nickname: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<{ participantId: string; nickname: string }>>(
    `${sessionPath(sessionId)}/join`, { nickname }, config,
  )
  return { sessionId, ...response.data.data }
}
