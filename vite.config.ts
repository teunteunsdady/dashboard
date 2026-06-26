import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { getBusArrivalsWithCache } from './server/busCache.js'

function busApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'bus-api-dev',
    configureServer(server) {
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

          if (!stopId) {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify({ error: 'stopId가 필요합니다.' }))
            return
          }

          const payload = await getBusArrivalsWithCache(stopId, serviceKey)
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify(payload))
        } catch (error) {
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
    plugins: [react(), busApiDevPlugin(env)],
  }
})
