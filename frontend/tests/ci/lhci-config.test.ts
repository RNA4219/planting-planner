import { describe, expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const repoRoot = join(__dirname, '..', '..', '..')

const lhciConfigPath = join(repoRoot, 'frontend', 'lighthouserc.json')
const ciWorkflowPath = join(repoRoot, '.github', 'workflows', 'ci.yml')

const lhciConfigRaw = await readFile(lhciConfigPath, 'utf-8')
const lhciConfig = JSON.parse(lhciConfigRaw) as {
  readonly ci: {
    readonly collect: {
      readonly staticDistDir: string
      readonly numberOfRuns: number
    }
    readonly assert: {
      readonly assertions: Record<string, readonly [string, { readonly minScore: number }]>
    }
    readonly upload: {
      readonly target: string
      readonly outputDir: string
    }
  }
}

const ciWorkflow = await readFile(ciWorkflowPath, 'utf-8')

describe('lighthouse ci configuration', () => {
  test('defines minimum scores for key categories', () => {
    const assertions = lhciConfig.ci.assert.assertions

    expect(assertions['categories:pwa']).toEqual([
      'error',
      { minScore: 0.9 },
    ])
    expect(assertions['categories:performance']).toEqual([
      'error',
      { minScore: 0.8 },
    ])
    expect(assertions['categories:accessibility']).toEqual([
      'error',
      { minScore: 0.9 },
    ])
  })

  test('matches static dist collection settings', () => {
    expect(lhciConfig.ci.collect.staticDistDir).toBe('frontend/dist')
    expect(lhciConfig.ci.collect.numberOfRuns).toBe(1)
  })

  test('stores reports on failure in the filesystem', () => {
    expect(lhciConfig.ci.upload).toEqual({
      target: 'filesystem',
      outputDir: './lhci-report',
    })
  })
})

describe('ci workflow lighthouse job', () => {
  test('uses repository lighthouse configuration', () => {
    expect(ciWorkflow).toContain('--config=frontend/lighthouserc.json')
    expect(ciWorkflow).not.toContain('--assert.assertions."categories:pwa"=off')
  })
})
