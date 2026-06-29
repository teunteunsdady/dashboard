import { defineConfig, loadEnv, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { BusQuotaExhaustedError, getBusArrivalsWithCache } from './server/busCache.js'

const EVENT_DEBUG_LOG = path.resolve(process.cwd(), 'logs', 'event-validation.log')

function eventDebugDevPlugin(): Plugin {
  return {
    name: 'event-debug-dev',
    configureServer(server) {
      server.middlewares.use('/__dev/event-log', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.end('Method not allowed')
          return
        }

        let body = ''
        request.on('data', (chunk) => {
          body += chunk
        })
        request.on('end', () => {
          try {
            const payload = JSON.parse(body) as {
              step?: string
              data?: unknown
              at?: string
            }
            const line = `${payload.at ?? new Date().toISOString()} ${payload.step ?? ''} ${JSON.stringify(payload.data ?? '')}\n`
            fs.mkdirSync(path.dirname(EVENT_DEBUG_LOG), { recursive: true })
            fs.appendFileSync(EVENT_DEBUG_LOG, line)
            console.log('[event-validation]', payload.step, payload.data ?? '')
          } catch (error) {
            console.error('[event-validation] log parse error', error)
          }
          response.statusCode = 204
          response.end()
        })
      })
    },
  }
}

function busApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'bus-api-dev',
    configureServer(server) {
      if (!process.env.SUPABASE_URL) {
        process.env.SUPABASE_URL =
          env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? ''
      }
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
      }

      server.middlewares.use('/api/bus/arrivals', async (request, response) => {
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const serviceKey = env.SEOUL_BUS_API_KEY
        if (!serviceKey) {
          response.statusCode = 503
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(
            JSON.stringify({
              error: 'SEOUL_BUS_API_KEY가 설정되지 않았습니다.',
            }),
          )
          return
        }

        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          const stopId = url.searchParams.get('stopId')
          const bypassCache =
            url.searchParams.get('force') === '1' ||
            url.searchParams.get('force') === 'true'

          if (!stopId) {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify({ error: 'stopId가 필요합니다.' }))
            return
          }

          const payload = await getBusArrivalsWithCache(stopId, serviceKey, {
            bypassCache,
          })
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify(payload))
        } catch (error) {
          if (error instanceof BusQuotaExhaustedError) {
            response.statusCode = 429
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(
              JSON.stringify({
                error: error.message,
                quota: error.quota,
              }),
            )
            return
          }
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : '버스 도착 정보 조회 실패',
            }),
          )
        }
      })
    },
  }
}

// Vite 개발 서버 및 빌드 설정
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), eventDebugDevPlugin(), busApiDevPlugin(env)],
  }
})
