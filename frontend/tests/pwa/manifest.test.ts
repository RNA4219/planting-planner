import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('PWA manifest', () => {
  const manifestPath = resolve(__dirname, '../../public/manifest.webmanifest')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>

  it('defines basic metadata', () => {
    expect(manifest).toMatchObject({
      name: 'Planting Planner',
      short_name: 'Planner',
      start_url: '/',
      display: 'standalone',
      scope: '/',
      background_color: '#f9fbf7',
      theme_color: '#0ea5e9',
    })
  })

  it('defines expected icons', () => {
    const icons = manifest.icons as Array<Record<string, string>> | undefined
    expect(Array.isArray(icons)).toBe(true)

    const expectedIcons = [
      { src: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
      { src: '/icons/icon-512x512.png', type: 'image/png', sizes: '512x512' },
      {
        src: '/icons/icon-maskable.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
    ]

    expectedIcons.forEach((entry) => {
      expect(icons).toEqual(expect.arrayContaining([expect.objectContaining(entry)]))
    })
  })
})
