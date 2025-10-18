import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const indexHtmlPath = path.resolve(__dirname, '../../index.html')

const modulePreloadPattern =
  /<link[^>]*rel=["']modulepreload["'][^>]*href=["']\/src\/main\.tsx["'][^>]*>/iu

test('index.html does not manually modulepreload the main module entry', () => {
  const contents = fs.readFileSync(indexHtmlPath, 'utf8')
  assert.ok(
    !modulePreloadPattern.test(contents),
    'Remove <link rel="modulepreload"> tags that point to /src/main.tsx. Vite will inject modulepreload hints as needed.',
  )
})

if (typeof globalThis.test === 'function') {
  globalThis.test.skip?.('node:test-only: index-html-main-module-preload', () => {})
}
