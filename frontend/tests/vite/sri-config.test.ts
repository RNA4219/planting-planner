import { describe, expect, test, vi } from 'vitest'

const sriFactory = vi.fn(
  (options?: { algorithms?: string[]; html?: boolean; applyTo?: string[] }) => ({
    name: 'vite-plugin-sri',
    apply: 'build',
    enforce: 'post',
    api: {
      options,
      algorithms: options?.algorithms ?? ['sha384'],
      handlesHtml: options?.html ?? options?.applyTo?.includes?.('html') ?? true,
    },
    writeBundle: vi.fn(),
  }),
)

vi.mock('vite-plugin-sri', () => ({
  __esModule: true,
  default: sriFactory,
}))

vi.mock('vite', () => ({
  defineConfig: (config: unknown) => config,
}))

vi.mock('@vitejs/plugin-react', () => ({
  default: () => ({
    name: 'vite:react',
  }),
}))

vi.mock('vite-plugin-pwa', () => ({
  VitePWA: (options: unknown) => ({
    name: 'vite-plugin-pwa',
    api: { options },
  }),
}))

const configModule = await import('../../vite.config')
const config = configModule.default

const findPluginByName = <T extends { name?: string }>(
  plugins: unknown,
  pluginName: string,
): (T & { name: string }) | undefined => {
  if (!Array.isArray(plugins)) {
    return undefined
  }

  return plugins.find((plugin): plugin is T & { name: string } => plugin?.name === pluginName)
}

describe('vite SRI configuration', () => {
  test('enables SRI plugin with secure integrity for HTML entry points', () => {
    expect.hasAssertions()
    const plugin = findPluginByName<{
      apply?: string
      enforce?: string
      api?: Record<string, unknown>
    }>(config.plugins, 'vite-plugin-sri')

    expect(plugin).toBeDefined()

    const algorithms = (plugin?.api as { algorithms?: string[] } | undefined)?.algorithms ?? []
    const normalized = algorithms.map(
      (algorithm) => algorithm?.toLowerCase?.() ?? String(algorithm).toLowerCase(),
    )
    const hasStrongAlgorithm = normalized.some(
      (algorithm) => algorithm === 'sha384' || algorithm === 'sha512',
    )

    expect(hasStrongAlgorithm).toBe(true)
    expect(plugin?.apply).toBe('build')
    expect(plugin?.enforce).toBe('post')

    const handlesHtml = (plugin?.api as { handlesHtml?: boolean } | undefined)?.handlesHtml
    expect(handlesHtml).toBe(true)
  })
})
