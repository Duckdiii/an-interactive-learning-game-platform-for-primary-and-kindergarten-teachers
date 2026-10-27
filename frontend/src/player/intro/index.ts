import type { ComponentType } from 'react'
import type { AgeBand } from '../profile/types'
import BeIntro from './BeIntro'
import StudentIntro from './StudentIntro'
import type { IntroProps } from './types'

export type { IntroProps } from './types'

// `Record<AgeBand, ...>` bắt buộc mỗi khung có màn vào: thêm khung mới mà quên đăng ký thì lỗi lúc build.
export const INTROS: Readonly<Record<AgeBand, ComponentType<IntroProps>>> = {
  be: BeIntro,
  hocSinh: StudentIntro,
}
