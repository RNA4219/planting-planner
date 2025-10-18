import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import defaultTheme from 'tailwindcss/defaultTheme'

import type { Config } from 'tailwindcss'

type ThemeToken = {
  readonly token: string
  readonly hex_color: string
}

const tokensPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/theme_tokens.json')
const themeTokens = JSON.parse(readFileSync(tokensPath, 'utf8')) as readonly ThemeToken[]

const marketColors = themeTokens.reduce<Record<string, string>>((acc, token) => {
  const [prefix, ...segments] = token.token.split('.')
  if (prefix !== 'market' || segments.length === 0) {
    return acc
  }
  const name = segments.join('-')
  acc[name] = token.hex_color
  return acc
}, {})

const marketBackgroundSafelist = Object.keys(marketColors).map((name) => `bg-market-${name}`)

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  safelist: marketBackgroundSafelist,
  theme: {
    aria: defaultTheme.aria,
    extend: {
      colors: {
        market: marketColors,
      },
    },
  },
}

export default config
