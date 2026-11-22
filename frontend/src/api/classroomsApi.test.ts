import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { createClassroom, deleteClassroom, fetchClassrooms } from './classroomsApi'

vi.mock('./axiosInstance', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const mockedGet = vi.mocked(axiosInstance.get)
const mockedPost = vi.mocked(axiosInstance.post)
const mockedDelete = vi.mocked(axiosInstance.delete)

describe('classroomsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /classrooms trả danh sách trong data', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, data: [{ classroomId: 'c1', className: '1A' }] } })

    expect(await fetchClassrooms()).toEqual([{ classroomId: 'c1', className: '1A' }])
    expect(mockedGet).toHaveBeenCalledWith('/classrooms')
  })

  it('POST /classrooms gửi đúng thân và trả lớp mới', async () => {
    mockedPost.mockResolvedValue({ data: { success: true, data: { classroomId: 'c2', className: '1B' } } })

    expect(await createClassroom({ className: '1B', schoolYear: '2026-2027' })).toEqual({ classroomId: 'c2', className: '1B' })
    expect(mockedPost).toHaveBeenCalledWith('/classrooms', { className: '1B', schoolYear: '2026-2027' })
  })

  it('DELETE /classrooms/{id} mã hóa mã lớp', async () => {
    mockedDelete.mockResolvedValue({ data: undefined })

    await deleteClassroom('a/b')

    expect(mockedDelete).toHaveBeenCalledWith('/classrooms/a%2Fb')
  })
})
