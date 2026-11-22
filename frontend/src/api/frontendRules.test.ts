import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Luật trong .claude/rules/frontend.md, đẩy từ chữ lên test (docs/enforcement-map.md R28, R29).
const FRONTEND = join(__dirname, '..', '..')
const SRC = join(FRONTEND, 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)

    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  })
}

// shortcut: danh sách thư viện state đã biết, không bắt thư viện mới chưa có tên ở đây; thêm tên khi gặp.
const STATE_LIBRARIES = [
  'zustand', 'redux', '@reduxjs/toolkit', 'react-redux', 'jotai', 'recoil', 'mobx', 'mobx-react', 'mobx-react-lite',
  'valtio', 'xstate', '@xstate/react', 'effector', 'nanostores', '@preact/signals-react', '@legendapp/state',
  '@hookstate/core', 'unstated-next', 'use-context-selector',
]

// Ngoài axiosInstance.ts chỉ được dùng phần tiện ích của axios (nhận diện lỗi, hủy, kiểu), không tạo instance hay gọi request.
const AXIOS_HELPERS = ['isAxiosError', 'isCancel', 'CanceledError', 'AxiosError', 'AxiosHeaders', 'CancelToken']

// Bỏ dòng chú thích (`//`, `/*`, ` *`) theo dòng; không xoá `//` giữa dòng vì đó có thể là URL ('http://...').
const withoutCommentLines = (code: string) => code.split('\n').filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line)).join('\n')

/** Các cách dùng axios không phải tiện ích trong một file, ví dụ ['import { create }', 'api.get']. */
export function axiosMisuses(source: string): string[] {
  const code = withoutCommentLines(source)
  const found: string[] = []
  // Mệnh đề import chỉ gồm tên, dấu phẩy, khoảng trắng và khối {…}: code không dùng `;` nên `[^;]*` sẽ nuốt các import trước.
  for (const m of code.matchAll(/import\s+(type\s+)?((?:[\w\s,]|\{[^}]*\})+?)\s+from\s+['"]axios['"]/g)) {
    if (m[1]) continue
    const clause = m[2]
    const named = /\{([^}]*)\}/.exec(clause)?.[1] ?? ''
    for (const raw of named.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (raw.startsWith('type ')) continue
      const name = raw.split(/\s+as\s+/)[0]
      if (name === 'default') found.push(`import { default }`)
      else if (!AXIOS_HELPERS.includes(name)) found.push(`import { ${name} }`)
    }
    const local = /^\s*(\w+)/.exec(clause.replace(/\{[^}]*\}/, ''))?.[1] ?? /default\s+as\s+(\w+)/.exec(named)?.[1]
    if (!local) continue
    const helpers = AXIOS_HELPERS.join('|')
    // Gọi thẳng `ax(...)`, truy cập kiểu `ax['get']`, hay thuộc tính không phải tiện ích `ax.get`, `ax.postForm`.
    for (const use of code.matchAll(new RegExp(`\\b${local}\\s*(\\(|\\[|\\.\\s*(?!(?:${helpers})\\b)\\w+)`, 'g'))) {
      if (use.index !== undefined && code.slice(Math.max(0, use.index - 7), use.index).includes('import')) continue
      found.push(use[0].replace(/\s+/g, ''))
    }
  }
  return found
}

describe('luật frontend', () => {
  it('chỉ dùng Context + useState/useReducer cho client state: không có thư viện state trong package.json', () => {
    const pkg = JSON.parse(readFileSync(join(FRONTEND, 'package.json'), 'utf8'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })

    expect(deps.filter((name) => STATE_LIBRARIES.includes(name))).toEqual([])
  })

  it('chỉ src/api/axiosInstance.ts tạo axios instance hay gọi HTTP bằng axios trực tiếp (để có interceptor token và 401)', () => {
    const offenders = sourceFiles(SRC)
      .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\./.test(path) && !path.endsWith(join('api', 'axiosInstance.ts')))
      .flatMap((path) => axiosMisuses(readFileSync(path, 'utf8')).map((use) => `${relative(SRC, path)}: ${use}`))

    expect(offenders).toEqual([])
  })

  it('axiosMisuses: bắt mọi cách gọi request, kể cả đổi tên, không báo nhầm phần tiện ích', () => {
    const bad = [
      "import axios from 'axios'\nexport const f = () => axios.get<string>('/x')",
      "import ax from 'axios'\nax.post('/x')",
      "import axios from 'axios'\naxios({ url: '/x' })",
      "import axios from 'axios'\naxios['get']('/x')",
      "import axios from 'axios'\naxios.postForm('/x', {})",
      "import axios from 'axios'\nconst inst = axios.create()",
      "import { create } from 'axios'",
      "import { default as http } from 'axios'\nhttp.get('/x')",
      "import axios from 'axios'\nconst u = 'http://x'; axios.get(u)",
    ]
    for (const source of bad) expect(axiosMisuses(source), source).not.toEqual([])
    const ok = [
      "import axios from 'axios'\nif (axios.isAxiosError(e) || axios.isCancel(e)) {}",
      "import axios, { CanceledError } from 'axios'\nthrow new CanceledError()",
      "import type { AxiosError, AxiosResponse } from 'axios'",
      "import { AxiosError, type InternalAxiosRequestConfig } from 'axios'",
      "import axios from 'axios'\n// axios.get('/x') chỉ là chú thích\n/** lỗi giống axios (mã ECONNABORTED) */",
      "import { useQuery } from '@tanstack/react-query'\nimport axios from 'axios'\naxios.isAxiosError(e)",
    ]
    for (const source of ok) expect(axiosMisuses(source), source).toEqual([])
  })
})
