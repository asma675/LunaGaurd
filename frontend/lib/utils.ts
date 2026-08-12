import type { RouteProfile } from './types'

export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`
  return `${Math.round(metres)} m`
}

export function formatEnergy(wh: number): string {
  return `${Math.round(wh)} Wh`
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatPercent(v: number, decimals = 1): string {
  return `${v.toFixed(decimals)}%`
}

export function formatSlope(deg: number): string {
  return `${deg.toFixed(1)}°`
}

export function formatScore(score: number): string {
  return (score * 100).toFixed(1)
}

/** Returns a Tailwind text color class based on risk score 0–1 */
export function riskColor(score: number): string {
  if (score >= 0.7) return 'text-red-danger'
  if (score >= 0.4) return 'text-amber-warning'
  return 'text-green-success'
}

/** Returns a hex color string based on risk score 0–1 */
export function riskHexColor(score: number): string {
  if (score >= 0.7) return '#ef4444'
  if (score >= 0.4) return '#f59e0b'
  return '#10b981'
}

/** Returns a hex color based on mission success score 0–1 */
export function successHexColor(score: number): string {
  if (score >= 0.7) return '#10b981'
  if (score >= 0.4) return '#f59e0b'
  return '#ef4444'
}

export function profileLabel(profile: RouteProfile): string {
  switch (profile) {
    case 'FASTEST':
      return 'Fastest Route'
    case 'LOWEST_ENERGY':
      return 'Lowest Energy'
    case 'SAFEST':
      return 'Safest Route'
  }
}

export function profileIcon(profile: RouteProfile): string {
  switch (profile) {
    case 'FASTEST':
      return '⚡'
    case 'LOWEST_ENERGY':
      return '🔋'
    case 'SAFEST':
      return '🛡️'
  }
}

export function profileColor(profile: RouteProfile): string {
  switch (profile) {
    case 'FASTEST':
      return '#00d4ff'
    case 'LOWEST_ENERGY':
      return '#10b981'
    case 'SAFEST':
      return '#7c3aed'
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
