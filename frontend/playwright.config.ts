import { defineConfig } from '@playwright/test'

const HOST = process.env.PLAYWRIGHT_TEST_HOST ?? '127.0.0.1'
const WEB_PORT = Number.parseInt(process.env.WEB_PORT ?? '4173', 10)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${WEB_PORT}`

export default defineConfig({
  testDir: '.',
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: `npm run preview -- --host ${HOST} --port ${WEB_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'production',
    },
  },
})
