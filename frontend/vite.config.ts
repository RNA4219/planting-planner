import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import sri from 'vite-plugin-sri'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  const proxy = {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
    '/recommend': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
    '/refresh': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  }

  return {
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        injectRegister: false,
        registerType: 'prompt',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          navigateFallback: '/index.html',
        },
        manifest: {
          id: '/',
          name: 'Planting Planner',
          short_name: 'Planner',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#14532d',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
      sri(),
    ],
  }
})
