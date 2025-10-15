import { TextDecoder, TextEncoder } from 'util'
import { describe, expect, test, vi } from 'vitest'

Object.assign(globalThis, { TextEncoder, TextDecoder })

vi.mock('vite-plugin-pwa', () => ({
  VitePWA: (options: unknown) => ({
    name: 'vite-plugin-pwa',
    api: { options },
  }),
}))

vi.mock('vite', () => ({
  defineConfig: (config: unknown) => config,
}))

vi.mock('@vitejs/plugin-react', () => ({
  default: () => ({
    name: 'vite:react',
  }),
}))

const configModule = await import('../../vite.config')
const config = configModule.default

describe('vite PWA configuration', () => {
  test('includes VitePWA plugin with expected options', () => {
    expect.hasAssertions()
    const plugins = Array.isArray(config.plugins) ? config.plugins : []
    const pwaPlugin = plugins.find((plugin) => plugin?.name === 'vite-plugin-pwa') as
      | undefined
      | {
          api?: {
            options?: Record<string, unknown>
          }
        }

    expect(pwaPlugin).toBeDefined()

    const options = pwaPlugin?.api?.options as
      | undefined
      | {
          filename?: string
          srcDir?: string
          strategies?: string
          injectRegister?: boolean
          registerType?: string
          workbox?: Record<string, unknown>
        }

    expect(options).toMatchObject({
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      injectRegister: false,
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        navigateFallback: '/index.html',
      },
    })
  })
})
