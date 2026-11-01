import { useUiProfile } from '../profile/useUiProfile'
import { SHELLS } from './index'
import type { ShellProps } from './types'

/** Dùng trong trang chơi: chọn shell theo khung của profile trong context (một nguồn duy nhất, nơi gọi không truyền khung). */
export default function PlayerShell(props: ShellProps) {
  const Impl = SHELLS[useUiProfile().band]

  return <Impl {...props} />
}
