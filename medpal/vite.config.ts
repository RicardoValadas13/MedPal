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
      workbox: {
        // Offline shell only: precache the built app shell and static
        // assets. No runtimeCaching rules on purpose — Supabase data,
        // auth and Edge Function calls are never cached.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
