import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'

export interface NotoCatalogAsset {
  id: string
  label: string
  group: string
  imageUrl: string
}

/** Read the server-owned catalog so edited games use the same IDs checked during publish. */
export async function getNotoCatalog(): Promise<NotoCatalogAsset[]> {
  const response = await axiosInstance.get<ApiSuccessResponse<NotoCatalogAsset[]>>('/catalog/noto')
  if (!Array.isArray(response.data.data) || !response.data.data.every((asset) =>
    asset && typeof asset.id === 'string' && typeof asset.label === 'string'
    && typeof asset.group === 'string' && typeof asset.imageUrl === 'string')) {
    throw new Error('Invalid catalog response')
  }
  return response.data.data
}
