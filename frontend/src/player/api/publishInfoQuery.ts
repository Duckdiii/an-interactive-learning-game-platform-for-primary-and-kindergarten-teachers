import { queryOptions } from '@tanstack/react-query'
import { getPlayerApi } from '.'

/** Query thông tin xuất bản dùng chung cho /join và /play/:shareCode. */
export const publishInfoQuery = (shareCode: string) =>
  queryOptions({
    queryKey: ['player', 'publishInfo', shareCode],
    queryFn: async () => (await getPlayerApi()).getPublishInfo(shareCode),
    retry: false,
    // staleTime mặc định 0 làm PlayPage gọi lại ngay sau khi /join vừa tải; lần gọi thừa đó lỗi thì đẩy trẻ ra màn lỗi.
    staleTime: 60_000,
  })
