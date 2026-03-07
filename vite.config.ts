import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, cpSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Copy guides/ and assets/ into dist/ so the user guide is served by the app
    {
      name: 'copy-guides',
      configureServer(server) {
        // Serve assets/ directory during dev so wiki images work
        server.middlewares.use((req, res, next) => {
          const match = req.url?.match(/^\/assets\/(.+)/)
          if (match) {
            const filePath = join(process.cwd(), 'assets', match[1])
            if (existsSync(filePath)) {
              const ext = match[1].split('.').pop() || ''
              const types: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', gif: 'image/gif' }
              res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
              res.end(readFileSync(filePath))
              return
            }
          }
          next()
        })
      },
      closeBundle() {
        const dest = 'dist/guides'
        if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
        cpSync('guides', dest, { recursive: true })
        if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Chart Hero',
        short_name: 'Chart Hero',
        description: 'Professional browser-based diagramming application',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/Chart-Hero/',
        start_url: '/Chart-Hero/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,md}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/Chart-Hero/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'flow-vendor': ['@xyflow/react'],
          'export-vendor': ['jspdf', 'pptxgenjs', 'html-to-image', 'jszip', 'file-saver'],
          'icons-vendor': ['lucide-react'],
          'diagram-styles': [
            './src/styles/diagramStyles/index.ts',
            './src/styles/palettes/index.ts',
          ],
          'ai-lib': [
            './src/lib/ai/client.ts',
            './src/lib/ai/tools.ts',
            './src/lib/ai/stream.ts',
            './src/lib/ai/toolExecutor.ts',
            './src/lib/ai/prompts.ts',
            './src/lib/ai/providers.ts',
          ],
          'collab-vendor': ['yjs', 'y-webrtc'],
          'extensions': [
            './src/extensions/packs/index.ts',
            './src/extensions/packs/networkInfra.ts',
            './src/extensions/packs/uxWireframe.ts',
            './src/extensions/packs/peopleTeams.ts',
          ],
        },
      },
    },
  },
})
