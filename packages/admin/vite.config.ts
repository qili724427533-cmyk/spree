import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Proxy /api to the Rails server so the SPA is same-origin with the API in dev.
  // Same-origin keeps the refresh-token cookie working under SameSite=Lax without
  // needing HTTPS (production cross-origin uses SameSite=None; Secure).
  //
  // `VITE_API_PROXY_TARGET` is the proxy *target* — kept distinct from
  // `VITE_SPREE_API_URL` (which the SDK reads at build time to switch to
  // absolute URLs) so the E2E suite can keep dev's same-origin path even when
  // pointing at a different Rails port.
  server: {
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_PROXY_TARGET ||
          process.env.VITE_SPREE_API_URL ||
          'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
