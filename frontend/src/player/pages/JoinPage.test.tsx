import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMockScenario } from '../../services/mock/mockRuntime'
import App from '../../App'
import { MockPlayerApi } from '../api/mockPlayerApi'
import JoinPage from './JoinPage'

function PlayStub() {
  return <p>đã sang {useParams().shareCode}</p>
}

function openJoin() {
  const client = new QueryClient()

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/join']}>
        <Routes>
          <Route path="/join" element={<JoinPage />} />
          <Route path="/play/:shareCode" element={<PlayStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return client
}

const input = () => screen.getByLabelText('Mã trò chơi')
const enter = (value: string) => {
  fireEvent.change(input(), { target: { value } })
  fireEvent.submit(input().closest('form')!)
}

configure({ asyncUtilTimeout: 10_000 })

beforeEach(() => vi.stubEnv('VITE_PLAYER_API', 'mock'))
afterEach(() => {
  vi.stubEnv('VITE_PLAYER_API', '')
  vi.restoreAllMocks()
  setMockScenario('normal')
})

describe('JoinPage (/join)', () => {
  it('"mock 00" sang /play/MOCK00 và để sẵn dữ liệu trong cache cho PlayPage', async () => {
    const client = openJoin()

    enter('mock 00')

    expect(await screen.findByText('đã sang MOCK00')).toBeInTheDocument()
    expect(client.getQueryData(['player', 'publishInfo', 'MOCK00'])).toMatchObject({ gameTitle: 'Đếm số đến 10' })
  })

  it('sai định dạng: báo ngay dưới ô, không gọi API, giữ chữ đã gõ và có aria', () => {
    const spy = vi.spyOn(MockPlayerApi.prototype, 'getPublishInfo')

    openJoin()
    enter('ABC')

    expect(screen.getByRole('alert')).toHaveTextContent('Mã gồm 6 chữ cái hoặc chữ số')
    expect(input()).toHaveValue('ABC')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAttribute('aria-describedby', screen.getByRole('alert').id)
    expect(input()).toHaveFocus()
    expect(spy).not.toHaveBeenCalled()
  })

  it('đang chờ: nút bị khóa, chữ "Đang tìm trò chơi…", aria-busy', async () => {
    openJoin()
    enter('MOCK00')

    const button = screen.getByRole('button', { name: /Đang tìm trò chơi/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await screen.findByText('đã sang MOCK00')
  })

  it.each([
    ['ZZZZZZ', 'Không tìm thấy trò chơi'],
    ['MOCKNP', 'Trò chơi chưa mở'],
    ['MOCKEX', 'Trò chơi đã hết hạn'],
    ['MOCKDS', 'Trò chơi đang tạm đóng'],
  ])('%s: hiện "%s", giữ chữ đã gõ và focus lại ô', async (code, title) => {
    openJoin()
    enter(code)

    expect(await screen.findByRole('alert')).toHaveTextContent(title)
    expect(input()).toHaveValue(code)
    expect(input()).toHaveFocus()
  })

  it('sang PlayPage thật: thông tin xuất bản chỉ tải MỘT lần (PlayPage dùng lại cache)', async () => {
    const spy = vi.spyOn(MockPlayerApi.prototype, 'getPublishInfo')

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/join']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByLabelText('Mã trò chơi') // App tải trang lười
    enter('MOCK00')

    expect(await screen.findByRole('heading', { name: /Đếm số đến 10/ })).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('bấm vào hai lần liền nhau chỉ gọi API một lần', async () => {
    const spy = vi.spyOn(MockPlayerApi.prototype, 'getPublishInfo')

    openJoin()
    fireEvent.change(input(), { target: { value: 'MOCK00' } })
    fireEvent.submit(input().closest('form')!)
    fireEvent.submit(input().closest('form')!)

    await screen.findByText('đã sang MOCK00')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('gõ lại sau lỗi: bỏ thông báo và aria-invalid', () => {
    openJoin()
    enter('ABC')
    fireEvent.change(input(), { target: { value: 'ABCD' } })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('mất mạng: hiện "Chưa kết nối được"', async () => {
    setMockScenario('error')
    openJoin()
    enter('MOCK00')

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Chưa kết nối được'))
    expect(input()).toHaveValue('MOCK00')
  })
})
