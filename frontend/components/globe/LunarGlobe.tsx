'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface GlobeLayers {
  topo: boolean
  relief: boolean
  illumination: boolean
  sites: boolean
  grid: boolean
}

interface Props {
  layers: GlobeLayers
}

const SITES = [
  { name: 'Apollo 11', lat: 0.67, lon: 23.47 },
  { name: 'Apollo 15', lat: 26.13, lon: 3.63 },
  { name: 'South Pole', lat: -89.4, lon: 0 },
]

const CRATERS = [
  { lat: -43, lon: -11, radius: 0.22, depth: 0.95 },
  { lat: -20, lon: -58, radius: 0.15, depth: 0.72 },
  { lat: 9, lon: -21, radius: 0.12, depth: 0.78 },
  { lat: 23, lon: 45, radius: 0.16, depth: 0.84 },
  { lat: 38, lon: -74, radius: 0.1, depth: 0.65 },
  { lat: -5, lon: 78, radius: 0.09, depth: 0.62 },
  { lat: 57, lon: 18, radius: 0.08, depth: 0.58 },
  { lat: -66, lon: 56, radius: 0.11, depth: 0.8 },
  { lat: 14, lon: 116, radius: 0.13, depth: 0.7 },
  { lat: -32, lon: 142, radius: 0.1, depth: 0.68 },
].map(item => ({ ...item, lat: item.lat * Math.PI / 180, lon: item.lon * Math.PI / 180 }))

const MARIA = [
  { lat: 18, lon: 31, radius: 0.34, strength: 0.55 },
  { lat: 25, lon: -16, radius: 0.28, strength: 0.42 },
  { lat: 8, lon: 57, radius: 0.25, strength: 0.38 },
  { lat: 44, lon: 18, radius: 0.18, strength: 0.32 },
].map(item => ({ ...item, lat: item.lat * Math.PI / 180, lon: item.lon * Math.PI / 180 }))

function angularDistance(latA: number, lonA: number, latB: number, lonB: number) {
  const value =
    Math.sin(latA) * Math.sin(latB) +
    Math.cos(latA) * Math.cos(latB) * Math.cos(lonA - lonB)
  return Math.acos(Math.max(-1, Math.min(1, value)))
}

function terrainNoise(lat: number, lon: number) {
  const broad = Math.sin(lon * 2.9 + Math.cos(lat * 1.8)) * 0.26
  const mid = Math.cos(lat * 6.1 - lon * 1.7) * 0.19
  const fine = Math.sin((lat + lon) * 12.7) * 0.08 + Math.cos(lon * 21.0 - lat * 14.0) * 0.05
  return broad + mid + fine
}

function lunarSurface(lat: number, lon: number) {
  let elevation = terrainNoise(lat, lon)
  let albedo = 0.68 + terrainNoise(lat * 1.11, lon * 0.93) * 0.13

  for (const basin of MARIA) {
    const d = angularDistance(lat, lon, basin.lat, basin.lon)
    const falloff = Math.max(0, 1 - d / basin.radius)
    albedo -= falloff * falloff * basin.strength
    elevation -= falloff * 0.08
  }

  for (const crater of CRATERS) {
    const d = angularDistance(lat, lon, crater.lat, crater.lon)
    const normalized = d / crater.radius
    if (normalized < 1.45) {
      const bowl = normalized < 0.82 ? -(1 - normalized / 0.82) * crater.depth : 0
      const rim = Math.exp(-Math.pow((normalized - 0.93) / 0.11, 2)) * crater.depth * 0.65
      const ejecta = normalized > 1 && normalized < 1.45 ? (1.45 - normalized) * 0.12 : 0
      elevation += bowl * 0.22 + rim * 0.19 + ejecta
      albedo += rim * 0.10 + ejecta * 0.08
    }
  }

  return {
    elevation,
    albedo: Math.max(0.18, Math.min(0.92, albedo)),
  }
}

export default function LunarGlobe({ layers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rotationRef = useRef({ lon: -0.42, lat: -0.18 })
  const zoomRef = useRef(1)
  const draggingRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const [autoRotate, setAutoRotate] = useState(true)
  const [zoomLabel, setZoomLabel] = useState(100)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
    const width = Math.max(360, Math.floor(rect.width * dpr))
    const height = Math.max(360, Math.floor(rect.height * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)

    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.405 * zoomRef.current
    const step = Math.max(3, Math.round(dpr * 3.15))
    const { lon: yaw, lat: pitch } = rotationRef.current
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)

    const halo = ctx.createRadialGradient(cx, cy, radius * 0.75, cx, cy, radius * 1.24)
    halo.addColorStop(0, 'rgba(103,232,249,0)')
    halo.addColorStop(0.79, 'rgba(59,130,246,.035)')
    halo.addColorStop(0.94, 'rgba(103,232,249,.11)')
    halo.addColorStop(1, 'rgba(103,232,249,0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, width, height)

    const sun = { x: -0.42, y: -0.18, z: 0.89 }

    for (let y = Math.floor(cy - radius); y <= cy + radius; y += step) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x += step) {
        const nx = (x - cx) / radius
        const ny = (y - cy) / radius
        const rr = nx * nx + ny * ny
        if (rr > 1) continue

        const nz = Math.sqrt(1 - rr)
        const py = ny * cosP + nz * sinP
        const pz = -ny * sinP + nz * cosP
        const px = nx
        const wx = px * cosY - pz * sinY
        const wz = px * sinY + pz * cosY
        const wy = py
        const lat = Math.asin(Math.max(-1, Math.min(1, wy)))
        const lon = Math.atan2(wx, wz)
        const surface = lunarSurface(lat, lon)

        const directional = Math.max(0.045, nx * sun.x + ny * sun.y + nz * sun.z)
        const limb = Math.pow(nz, 0.32)
        const reliefBoost = layers.relief ? Math.max(-0.12, Math.min(0.16, surface.elevation * 0.22)) : 0
        let illumination = Math.max(0.04, directional + reliefBoost)

        if (layers.illumination) {
          const polar = Math.pow(Math.abs(Math.sin(lat)), 6)
          illumination += polar * 0.08
        }

        let red: number
        let green: number
        let blue: number
        if (layers.topo) {
          const t = Math.max(0, Math.min(1, 0.48 + surface.elevation * 0.55))
          if (t < 0.38) {
            red = 32 + t * 58
            green = 61 + t * 95
            blue = 104 + t * 145
          } else if (t < 0.72) {
            red = 70 + t * 118
            green = 98 + t * 92
            blue = 130 + t * 64
          } else {
            red = 142 + t * 94
            green = 126 + t * 80
            blue = 118 + t * 73
          }
        } else {
          const tone = 66 + surface.albedo * 145
          red = tone * 0.96
          green = tone * 0.985
          blue = tone * 1.02
        }

        const brightness = illumination * limb
        ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, red * brightness))},${Math.min(255, Math.max(0, green * brightness))},${Math.min(255, Math.max(0, blue * brightness))})`
        ctx.fillRect(x, y, step + 1, step + 1)
      }
    }

    const edge = ctx.createRadialGradient(cx, cy, radius * 0.78, cx, cy, radius)
    edge.addColorStop(0, 'rgba(0,0,0,0)')
    edge.addColorStop(0.94, 'rgba(0,0,0,.03)')
    edge.addColorStop(1, 'rgba(1,5,12,.34)')
    ctx.fillStyle = edge
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(165,243,252,.24)'
    ctx.lineWidth = Math.max(1, dpr)
    ctx.stroke()

    function project(latDeg: number, lonDeg: number) {
      const lat = latDeg * Math.PI / 180
      const lon = lonDeg * Math.PI / 180
      const wx = Math.cos(lat) * Math.sin(lon)
      const wy = Math.sin(lat)
      const wz = Math.cos(lat) * Math.cos(lon)
      const px = wx * cosY + wz * sinY
      const pz0 = -wx * sinY + wz * cosY
      const py = wy * cosP - pz0 * sinP
      const pz = wy * sinP + pz0 * cosP
      return { x: cx + px * radius, y: cy + py * radius, visible: pz > 0 }
    }

    if (layers.grid) {
      ctx.strokeStyle = 'rgba(125,211,252,.14)'
      ctx.lineWidth = Math.max(0.6, dpr * 0.65)
      for (const lat of [-60, -30, 0, 30, 60]) {
        ctx.beginPath()
        let started = false
        for (let lon = -180; lon <= 180; lon += 3) {
          const point = project(lat, lon)
          if (!point.visible) {
            started = false
            continue
          }
          if (!started) {
            ctx.moveTo(point.x, point.y)
            started = true
          } else {
            ctx.lineTo(point.x, point.y)
          }
        }
        ctx.stroke()
      }
      for (const lon of [-120, -60, 0, 60, 120, 180]) {
        ctx.beginPath()
        let started = false
        for (let lat = -88; lat <= 88; lat += 3) {
          const point = project(lat, lon)
          if (!point.visible) {
            started = false
            continue
          }
          if (!started) {
            ctx.moveTo(point.x, point.y)
            started = true
          } else {
            ctx.lineTo(point.x, point.y)
          }
        }
        ctx.stroke()
      }
    }

    if (layers.sites) {
      ctx.font = `${Math.max(10, 11 * dpr)}px IBM Plex Mono, monospace`
      for (const site of SITES) {
        const point = project(site.lat, site.lon)
        if (!point.visible) continue
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4 * dpr, 0, Math.PI * 2)
        ctx.fillStyle = '#67e8f9'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8 * dpr, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(103,232,249,.25)'
        ctx.lineWidth = 1.5 * dpr
        ctx.stroke()
        ctx.fillStyle = 'rgba(226,232,240,.95)'
        ctx.fillText(site.name, point.x + 10 * dpr, point.y - 7 * dpr)
      }
    }
  }, [layers])

  useEffect(() => {
    draw()
    const onResize = () => draw()
    window.addEventListener('resize', onResize)

    let frame = 0
    let previous = performance.now()
    const loop = (time: number) => {
      if (autoRotate && !draggingRef.current && time - previous > 34) {
        rotationRef.current.lon += 0.0042
        previous = time
        draw()
      }
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(frame)
    }
  }, [autoRotate, draw])

  function resetView() {
    rotationRef.current = { lon: -0.42, lat: -0.18 }
    zoomRef.current = 1
    setZoomLabel(100)
    draw()
  }

  return (
    <div className="relative h-full min-h-[560px] w-full overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_50%_45%,#0b1730_0%,#03070e_62%,#010309_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_18%,rgba(255,255,255,.6)_0_1px,transparent_1.4px),radial-gradient(circle_at_73%_26%,rgba(103,232,249,.5)_0_1px,transparent_1.4px),radial-gradient(circle_at_34%_76%,rgba(255,255,255,.5)_0_1px,transparent_1.4px)] [background-size:150px_150px,230px_230px,190px_190px]" />
      <canvas
        ref={canvasRef}
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onDoubleClick={resetView}
        onWheel={event => {
          event.preventDefault()
          const next = Math.max(0.72, Math.min(1.28, zoomRef.current - event.deltaY * 0.0006))
          zoomRef.current = next
          setZoomLabel(Math.round(next * 100))
          draw()
        }}
        onPointerDown={event => {
          draggingRef.current = true
          lastRef.current = { x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          if (!draggingRef.current) return
          const dx = event.clientX - lastRef.current.x
          const dy = event.clientY - lastRef.current.y
          lastRef.current = { x: event.clientX, y: event.clientY }
          rotationRef.current.lon += dx * 0.006
          rotationRef.current.lat = Math.max(-1.2, Math.min(1.2, rotationRef.current.lat + dy * 0.004))
          draw()
        }}
        onPointerUp={event => {
          draggingRef.current = false
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          draggingRef.current = false
        }}
      />

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={resetView}
          className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur hover:border-cyan-electric/30"
        >
          Reset · {zoomLabel}%
        </button>
        <button
          onClick={() => setAutoRotate(value => !value)}
          className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur hover:border-cyan-electric/30"
        >
          {autoRotate ? 'Pause rotation' : 'Auto rotate'}
        </button>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200">Interactive lunar globe</p>
        <p className="mt-1 text-[10px] text-slate-400">Drag to rotate · wheel to zoom · double-click to reset</p>
      </div>
    </div>
  )
}
