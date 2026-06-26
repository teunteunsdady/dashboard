import { getBusArrivalsWithCache } from '../../server/busCache.js'

function readStopId(request: { url?: string; query?: { stopId?: string | string[] } }) {
  if (request.query?.stopId) {
    const value = request.query.stopId
    return Array.isArray(value) ? value[0] : value
  }

  if (request.url) {
    const url = new URL(request.url, 'http://localhost')
    return url.searchParams.get('stopId') ?? undefined
  }

  return undefined
}

export default async function handler(
  request: { method?: string; url?: string; query?: { stopId?: string | string[] } },
  response: {
    status: (code: number) => {
      setHeader: (key: string, value: string) => typeof response
      json: (body: unknown) => void
    }
  },
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const stopId = readStopId(request)
  if (!stopId) {
    return response.status(400).json({ error: 'stopId가 필요합니다.' })
  }

  const serviceKey = process.env.SEOUL_BUS_API_KEY
  if (!serviceKey) {
    return response.status(503).json({
      error: 'SEOUL_BUS_API_KEY가 설정되지 않았습니다.',
    })
  }

  try {
    const payload = await getBusArrivalsWithCache(stopId, serviceKey)
    response
      .status(200)
      .setHeader('Cache-Control', 'private, max-age=30')
    return response.status(200).json(payload)
  } catch (error) {
    return response.status(500).json({
      error:
        error instanceof Error ? error.message : '버스 도착 정보 조회 실패',
    })
  }
}
