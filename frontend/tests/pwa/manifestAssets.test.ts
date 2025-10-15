import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('PWA manifest assets', () => {
  const manifestPath = resolve(__dirname, '../../public/manifest.webmanifest')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>

  it('declares required icon descriptors', () => {
    const icons = manifest.icons as Array<Record<string, unknown>> | undefined

    expect(Array.isArray(icons)).toBe(true)

    const requiredIcons = [
      { sizes: '192x192', purpose: undefined },
      { sizes: '512x512', purpose: undefined },
      { sizes: '512x512', purpose: 'maskable' },
    ] as const

    const normalizedIcons = icons.map((icon) => ({
      src: typeof icon?.src === 'string' ? icon.src : undefined,
      sizes: typeof icon?.sizes === 'string' ? icon.sizes : undefined,
      type: typeof icon?.type === 'string' ? icon.type : undefined,
      purpose: typeof icon?.purpose === 'string' ? icon.purpose : undefined,
    }))

    normalizedIcons.forEach((icon) => {
      expect(icon.src?.startsWith('/icons/')).toBe(true)
      expect(icon.type).toBe('image/png')
      expect(icon.sizes).toBeDefined()
    })

    for (const requirement of requiredIcons) {
      const matchingIcon = normalizedIcons.find(
        (icon) => icon.sizes === requirement.sizes && icon.purpose === requirement.purpose,
      )

      expect(matchingIcon).toBeDefined()
    }
  })
})
