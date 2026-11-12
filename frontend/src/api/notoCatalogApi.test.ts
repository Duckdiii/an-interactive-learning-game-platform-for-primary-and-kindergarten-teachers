import { beforeEach, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { getNotoCatalog } from './notoCatalogApi'

vi.mock('./axiosInstance', () => ({ default: { get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())

it('loads the server catalog for the editor', async () => {
  const assets = [{ id: 'cat-face', label: 'Mèo', group: 'cat', imageUrl: '/assets/noto/cat.svg' }]
  vi.mocked(axiosInstance.get).mockResolvedValue({ data: { success: true, data: assets } })
  await expect(getNotoCatalog()).resolves.toEqual(assets)
  expect(axiosInstance.get).toHaveBeenCalledWith('/catalog/noto')
})

it('rejects a malformed catalog before it reaches the editor', async () => {
  vi.mocked(axiosInstance.get).mockResolvedValue({ data: { success: true, data: [{ id: 'cat' }] } })
  await expect(getNotoCatalog()).rejects.toThrow('Invalid catalog response')
})
