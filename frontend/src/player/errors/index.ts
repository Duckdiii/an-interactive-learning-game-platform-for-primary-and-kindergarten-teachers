import type { ComponentType } from 'react'
import type { AgeBand } from '../profile/types'
import BeError from './BeError'
import StudentError from './StudentError'
import type { ErrorScreenProps } from './types'

export type { ErrorScreenProps } from './types'

// `Record<AgeBand, ...>` bắt buộc mỗi khung có màn lỗi: thêm khung mới mà quên đăng ký thì lỗi lúc build.
export const ERROR_SCREENS: Readonly<Record<AgeBand, ComponentType<ErrorScreenProps>>> = {
  be: BeError,
  hocSinh: StudentError,
}
