import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: parseInt(env.VITE_PORT || '8088'),
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3150',
          changeOrigin: false,
          secure: false,
          ws: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Preservar el header Authorization
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization)
                console.log('✅ Authorization header forwarded to backend')
              } else {
                console.warn('⚠️ No authorization header in request')
              }

              console.log('🔄 Proxy Request:', {
                method: req.method,
                url: req.url,
                hasAuth: !!req.headers.authorization,
                headers: Object.keys(req.headers)
              })
            })
          }
        },
      },
    },
  }
})