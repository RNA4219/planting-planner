import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const INDEX_HTML_PATH = resolve(process.cwd(), 'index.html')

describe('index.html performance hints', () => {
  test('loads the main module script entry point', () => {
    const html = readFileSync(INDEX_HTML_PATH, 'utf-8')
    expect(html).toContain(
      '<script type="module" src="/src/main.tsx" crossorigin="anonymous"></script>',
    )
  })
})
