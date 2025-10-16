import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const INDEX_HTML_PATH = resolve(process.cwd(), 'index.html')

describe('index.html performance hints', () => {
  test('preloads the main module script for faster interactive boot', () => {
    const html = readFileSync(INDEX_HTML_PATH, 'utf-8')
    expect(html).toContain(
      '<link rel="preload" href="/src/main.tsx" as="script" crossorigin="anonymous" />',
    )
  })
})
