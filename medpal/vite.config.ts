import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // We maintain public/manifest.webmanifest by hand (linked in index.html)
      manifest: false,
      registerType: 'autoUpdate',
      // Custom SW: offline shell precache plus push and medication
      // reminder notification handlers.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
