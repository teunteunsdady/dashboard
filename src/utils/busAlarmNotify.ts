import type { BusArrivalItem } from '../services/busService'
import { formatStopDisplayName } from '../data/busStops'

export function showBusArrivalNotification(
  stop: BusArrivalItem,
  arrivalMessage: string,
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const title = `${stop.routeNumber}번 버스 곧 도착`
  const body = `${formatStopDisplayName(stop.stopName)} · ${arrivalMessage}`

  const notification = new Notification(title, {
    body,
    tag: `bus-alarm:${stop.id}`,
    icon: '/favicon.ico',
  })

  notification.onclick = () => {
    window.focus()
    if (window.location.pathname !== '/bus') {
      window.location.href = '/bus'
    }
    notification.close()
  }
}
