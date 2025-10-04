import { describe, expectTypeOf, it } from 'vitest'

import type {
  Crop,
  RefreshStatus,
  RefreshStatusResponse,
  SearchFilter,
} from '../src/types'

describe('type definitions', () => {
  it('SearchFilter はキーワード文字列を保持する', () => {
    expectTypeOf<SearchFilter>().toMatchTypeOf<{ keyword: string }>()
  })

  it('Crop は variety プロパティをオプションで受け取れる', () => {
    expectTypeOf<Crop>().toMatchTypeOf<{ variety?: string }>()
  })

  it('RefreshStatus は UI 仕様のフィールド名を提供する', () => {
    expectTypeOf<RefreshStatus>().toMatchTypeOf<{
      state: 'success' | 'failure' | 'running' | 'stale'
      startedAt: string | null
      finishedAt: string | null
      updatedRecords: number
      lastError: string | null
    }>()
  })

  it('RefreshStatusResponse は API 応答のスネークケースフィールドを保持する', () => {
    expectTypeOf<RefreshStatusResponse>().toMatchTypeOf<{
      state: 'success' | 'failure' | 'running' | 'stale'
      started_at: string | null
      finished_at: string | null
      updated_records: number
      last_error: string | null
    }>()
  })
})
