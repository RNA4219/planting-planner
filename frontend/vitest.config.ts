import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      ...configDefaults.exclude,
      'playwright/**',
      'tests/e2e/**',
      'tests/ci/bundle-size.test.mjs',
    ],
  },
})
