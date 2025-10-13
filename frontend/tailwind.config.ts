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
  const [, ...segments] = token.token.split('.')
  const name = segments.join('.')
  acc[name] = token.hex_color
  return acc
}, {})

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
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
