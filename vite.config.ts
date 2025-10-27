import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://bi-a.one-triple-nine.top',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Proxy error handling
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            // Proxy request
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // Proxy response
          });
        },
      },
      '/api/banks': {
        target: 'https://api.vietqr.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/banks/, '/v2/banks'),
      },
    },
  },
})

