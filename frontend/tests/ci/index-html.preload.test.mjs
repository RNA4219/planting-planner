import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const indexHtmlPath = path.resolve(__dirname, '../../index.html')

const preloadPattern = /<link\s+rel="modulepreload"\s+href="\/src\/main\.tsx"/u

test('index.html preloads the main module entry', () => {
  const contents = fs.readFileSync(indexHtmlPath, 'utf8')
  assert.match(
    contents,
    preloadPattern,
    'Expected index.html to include a modulepreload link for /src/main.tsx'
  )
})
