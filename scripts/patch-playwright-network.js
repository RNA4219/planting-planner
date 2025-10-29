#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const targets = process.argv.slice(2);
const roots = targets.length ? targets : [process.cwd()];
const patchMarker = 'HttpsProxyAgent(agentOptions)';

for (const root of roots) {
  const resolvedRoot = path.resolve(root);
  const networkFile = path.join(resolvedRoot, 'node_modules', 'playwright-core', 'lib', 'utils', 'network.js');
  if (!fs.existsSync(networkFile)) {
    continue;
  }
  const source = fs.readFileSync(networkFile, 'utf8');
  if (source.includes(patchMarker)) {
    continue;
  }
  const needle = "      parsedProxyURL.secureProxy = parsedProxyURL.protocol === 'https:';\n      options.agent = new _utilsBundle.HttpsProxyAgent(parsedProxyURL);\n      options.rejectUnauthorized = false;\n";
  const replacement = "      parsedProxyURL.secureProxy = parsedProxyURL.protocol === 'https:';\n      const agentOptions = { ...parsedProxyURL };\n      if (params.rejectUnauthorized !== undefined)\n        agentOptions.rejectUnauthorized = params.rejectUnauthorized;\n      options.agent = new _utilsBundle.HttpsProxyAgent(agentOptions);\n";
  if (!source.includes(needle)) {
    console.error(`playwright-core network shim not found in ${networkFile}`);
    process.exitCode = 1;
    continue;
  }
  const updated = source.replace(needle, replacement);
  fs.writeFileSync(networkFile, updated, 'utf8');
}
