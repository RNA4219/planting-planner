import test from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const assetsDir = path.resolve(__dirname, '../../dist/assets')
const MAX_GZIP_BYTES = 300 * 1024

const collectJavaScriptFiles = (directoryPath) => {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true })
  const filePaths = []

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      filePaths.push(...collectJavaScriptFiles(entryPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      filePaths.push(entryPath)
    }
  }

  return filePaths
}

test('bundled JavaScript assets stay under 300 KiB compressed', () => {
  assert.ok(
    fs.existsSync(assetsDir),
    'dist/assets directory is missing. Run `npm run build` before executing this test.',
  )

  const assetFiles = collectJavaScriptFiles(assetsDir)

  assert.ok(
    assetFiles.length > 0,
    'No JavaScript bundles were found in dist/assets. Ensure the build outputs .js files.',
  )

  for (const assetPath of assetFiles) {
    const contents = fs.readFileSync(assetPath)
    const compressedSize = gzipSync(contents).length

    assert.ok(
      compressedSize <= MAX_GZIP_BYTES,
      `${path.relative(assetsDir, assetPath)} exceeds ${MAX_GZIP_BYTES} bytes when gzipped (actual: ${compressedSize}).`,
    )
  }
})
