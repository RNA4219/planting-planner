import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  recordAttempt,
  recordEnqueue,
  recordFailure,
  recordSuccess,
  setRefreshQueueStoreAdapter,
  type RefreshQueueRecord,
  type RefreshQueueStoreAdapter,
} from '../../src/sw/refreshQueueStore'

describe('refreshQueueStore', () => {
  const records = new Map<string, RefreshQueueRecord>()

  const adapter: RefreshQueueStoreAdapter = {
    async put(record) {
      records.set(record.id, { ...record })
    },
    async get(id) {
      const record = records.get(id)
      return record ? { ...record } : undefined
    },
    async delete(id) {
      records.delete(id)
    },
  }

  beforeEach(() => {
    records.clear()
    setRefreshQueueStoreAdapter(adapter)
  })

  afterEach(() => {
    setRefreshQueueStoreAdapter(null)
    records.clear()
  })

  it('serializes requests and tracks attempts', async () => {
    const body = JSON.stringify({ foo: 'bar' })
    const request = new Request('https://example.test/api/refresh', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'abc123',
      },
      body,
    })

    const id = 'entry-1'
    const timestamp = 1_700_000_000_000

    await recordEnqueue({ id, request, timestamp })

    const stored = await adapter.get(id)

    expect(stored).toStrictEqual({
      id,
      url: 'https://example.test/api/refresh',
      body: Buffer.from(body).toString('base64'),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'abc123',
      },
      createdAt: timestamp,
      attempt: 0,
      lastFailureAt: null,
      lastFailureMessage: null,
      failedAt: null,
      lastError: null,
    })

    await recordAttempt({ id })

    const updated = await adapter.get(id)
    expect(updated).toMatchObject({
      id,
      url: 'https://example.test/api/refresh',
      body: Buffer.from(body).toString('base64'),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'abc123',
      },
      createdAt: timestamp,
      attempt: 1,
    })
  })

  it('removes entries after success and retains failed entries for retry', async () => {
    const id = 'entry-2'
    const request = new Request('https://example.test/api/refresh', {
      method: 'POST',
      body: 'payload',
    })

    await recordEnqueue({ id, request, timestamp: 100 })
    await recordSuccess({ id })

    expect(await adapter.get(id)).toBeUndefined()

    const failureId = 'entry-3'
    await recordEnqueue({ id: failureId, request, timestamp: 200 })
    await recordAttempt({ id: failureId })
    await recordFailure({ id: failureId, timestamp: 300, error: new Error('boom') })

    const failedRecord = await adapter.get(failureId)
    expect(failedRecord).toMatchObject({
      id: failureId,
      attempt: 1,
      lastFailureAt: 300,
      lastFailureMessage: 'boom',
      failedAt: 300,
      lastError: 'boom',
    })

    await recordAttempt({ id: failureId })
    const retriedRecord = await adapter.get(failureId)
    expect(retriedRecord).toMatchObject({
      id: failureId,
      attempt: 2,
      lastFailureAt: 300,
      lastFailureMessage: 'boom',
      failedAt: 300,
      lastError: 'boom',
    })
  })
})
