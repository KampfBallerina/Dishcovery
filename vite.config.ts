import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the repo under /Dishcovery/
export default defineConfig({
  base: '/Dishcovery/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Dishcovery',
        short_name: 'Dishcovery',
        description: 'Gerichte und Wochenplan für den Haushalt',
        lang: 'de',
        display: 'standalone',
        background_color: '#ECEDE8',
        theme_color: '#ECEDE8',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // The source logo (~0.9 MB) is only an asset for generating icons, not needed offline.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'], globIgnores: ['**/Dishcovery_Logo_NoBackground.png'] },
    }),
  ],
})
