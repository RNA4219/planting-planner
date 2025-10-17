import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexHtmlPath = path.resolve(__dirname, '../../index.html');

const preloadHrefPattern = /<link[^>]*rel=["']preload["'][^>]*href=["']\/src\/[^"']*["'][^>]*>/i;

test('index.html does not manually preload source modules', () => {
  const html = fs.readFileSync(indexHtmlPath, 'utf-8');

  assert.ok(
    !preloadHrefPattern.test(html),
    'Remove <link rel="preload"> tags that point to /src/. Vite will inject modulepreload hints as needed.'
  );
});

if (typeof globalThis.test === 'function') {
  globalThis.test.skip?.('node:test-only: index-html-preload', () => {});
}
