import type { ComponentType } from 'react'
import type { AgeBand } from '../profile/types'
import BeShell from './BeShell'
import StudentShell from './StudentShell'
import type { ShellProps } from './types'

export type { ShellProps } from './types'

// PresentShell (trình chiếu trên lớp) thêm ở P4. `Record<AgeBand, ...>` bắt buộc mỗi khung có shell: thêm khung mới mà quên đăng ký thì lỗi lúc build.
export const SHELLS: Readonly<Record<AgeBand, ComponentType<ShellProps>>> = {
  be: BeShell,
  hocSinh: StudentShell,
}

export const getShell = (band: AgeBand) => SHELLS[band]
