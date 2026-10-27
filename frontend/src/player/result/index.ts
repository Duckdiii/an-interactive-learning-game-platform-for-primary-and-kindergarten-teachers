import type { ComponentType } from 'react'
import type { AgeBand } from '../profile/types'
import BeResult from './BeResult'
import StudentResult from './StudentResult'
import type { ResultProps } from './types'

export type { ResultProps } from './types'

// `Record<AgeBand, ...>` bắt buộc mỗi khung có màn kết quả.
export const RESULTS: Readonly<Record<AgeBand, ComponentType<ResultProps>>> = {
  be: BeResult,
  hocSinh: StudentResult,
}
