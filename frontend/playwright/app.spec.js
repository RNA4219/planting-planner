import { spawn } from 'node:child_process'
import { once } from 'node:events'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import { expect, test } from '@playwright/test'

const HOST = process.env.PLAYWRIGHT_TEST_HOST ?? '127.0.0.1'
const WEB_PORT = Number.parseInt(process.env.WEB_PORT ?? '4173', 10)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${WEB_PORT}`

let previewProcess
let previewExitedEarlyError

const waitForPreview = async () => {
  const timeoutMs = 30_000
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    if (previewExitedEarlyError) {
      throw previewExitedEarlyError
    }

    try {
      const response = await fetch(BASE_URL, { method: 'HEAD' })
      if (response.ok) {
        return
      }
    } catch {
      // ignore until server is ready
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for preview server at ${BASE_URL}`)
}

test.use({ baseURL: BASE_URL })

test.beforeAll(async () => {
  previewProcess = spawn(
    'npm',
    ['run', 'preview', '--', '--host', HOST, '--port', String(WEB_PORT)],
    {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  )

  previewProcess.once('error', (error) => {
    previewExitedEarlyError = error
  })
  previewProcess.once('exit', (code, signal) => {
    if (!previewExitedEarlyError) {
      previewExitedEarlyError = new Error(
        `preview server exited early (code: ${code ?? 'null'}, signal: ${signal ?? 'null'})`,
      )
    }
  })

  previewProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(chunk)
  })
  previewProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk)
  })

  await waitForPreview()
})

test.afterAll(async () => {
  if (!previewProcess) {
    return
  }

  if (!previewProcess.killed) {
    if (process.platform === 'win32') {
      previewProcess.kill()
    } else {
      process.kill(-previewProcess.pid, 'SIGTERM')
    }
  }

  try {
    await once(previewProcess, 'exit')
  } catch {
    // ignore errors while waiting for graceful shutdown
  }
})

test('トップページが表示される', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { level: 1, name: 'Planting Planner' })).toBeVisible()
})
