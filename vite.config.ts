import path from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// `bun run dev:phone` serves over HTTPS on the LAN — camera, mic, crypto.subtle
// and service workers all require a secure context on a real device.
const phone = process.env.PHONE === '1'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    phone && basicSsl(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // We decide when to activate a new version (see src/lib/pwa.ts) so an
      // update never reloads the app while someone is typing.
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // Only precache Latin font subsets; others download on demand if ever needed.
        globIgnores: ['**/*-{latin-ext,cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        // heic-to (libheif) is a separate ~3 MB chunk, loaded only for HEIC photos.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false, type: 'module' },
      manifest: {
        id: '/',
        name: 'Journal — Life & Health Binder',
        short_name: 'Journal',
        description: 'Your daily health, life & memories binder.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone'],
        // Phones stay portrait via CSS layout; tablets rotate freely.
        orientation: 'any',
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false,
        launch_handler: { client_mode: 'focus-existing' },
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
        categories: ['health', 'lifestyle', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          { name: 'Today', url: '/', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Emergency info', url: '/emergency', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { host: phone },
  build: {
    target: ['es2022', 'safari16', 'chrome111'],
    cssMinify: 'lightningcss',
  },
})
