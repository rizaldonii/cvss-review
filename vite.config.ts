import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import adminHandler from './api/admin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Populate environment variables for serverless admin during dev
  if (env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD
  if (env.ADMIN_SESSION_SECRET) process.env.ADMIN_SESSION_SECRET = env.ADMIN_SESSION_SECRET
  if (env.VITE_SUPABASE_URL) process.env.SUPABASE_URL = env.VITE_SUPABASE_URL
  if (env.VITE_SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

  return {
    plugins: [
      react(),
      {
        name: 'local-api-admin-server',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/api/admin')) {
              let body = ''
              req.on('data', chunk => {
                body += chunk
              })
              req.on('end', async () => {
                const dummyRes = {
                  setHeader: (k: string, v: string) => res.setHeader(k, v),
                  status: (code: number) => {
                    res.statusCode = code
                    return {
                      json: (data: any) => {
                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify(data))
                      },
                      end: () => res.end()
                    }
                  }
                }
                const customReq = {
                  ...req,
                  body,
                  headers: req.headers,
                  url: req.url,
                  method: req.method
                }
                try {
                  await adminHandler(customReq, dummyRes)
                } catch (err: any) {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false, error: err.message }))
                }
              })
              return
            }
            next()
          })
        }
      }
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false
    }
  }
})
