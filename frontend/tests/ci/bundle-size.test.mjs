import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../dist/assets');
const MAX_GZIP_BYTES = 300 * 1024;

test('bundled JavaScript assets stay under 300 KiB compressed', () => {
  assert.ok(
    fs.existsSync(assetsDir),
    'dist/assets directory is missing. Run `npm run build` before executing this test.'
  );

  const assetFiles = fs
    .readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => path.join(assetsDir, entry.name));

  assert.ok(
    assetFiles.length > 0,
    'No JavaScript bundles were found in dist/assets. Ensure the build outputs .js files.'
  );

  for (const assetPath of assetFiles) {
    const contents = fs.readFileSync(assetPath);
    const compressedSize = gzipSync(contents).length;

    assert.ok(
      compressedSize <= MAX_GZIP_BYTES,
      `${path.basename(assetPath)} exceeds ${MAX_GZIP_BYTES} bytes when gzipped (actual: ${compressedSize}).`
    );
  }
});
