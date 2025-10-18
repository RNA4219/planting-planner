import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const CONFIG_PATH = new URL('../../frontend/lighthouserc.json', import.meta.url);

await test('Lighthouse performance assertion severity', async (t) => {
  const fileContents = await readFile(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(fileContents);
  const performanceAssertion = config?.ci?.assert?.assertions?.['categories:performance'];

  assert.ok(Array.isArray(performanceAssertion), 'performance assertion should be an array');
  assert.deepStrictEqual(performanceAssertion, [
    'error',
    { minScore: 0.8, aggregationMethod: 'median' },
  ]);
});
