'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { TerrainGrid, RouteResult, RouteProfile, GridPoint, TerrainLayer } from '@/lib/types'
import { profileColor } from '@/lib/utils'

interface TerrainMapProps {
  terrain: TerrainGrid | null
  routes: RouteResult[]
  selectedRoute: RouteProfile | null
  roverPosition: GridPoint | null
  start: GridPoint | null
  destination: GridPoint | null
  onCellClick: (point: GridPoint) => void
  activeLayer: TerrainLayer
  emergencyObstructions: GridPoint[]
  clickMode: 'set-start' | 'set-destination' | 'none'
}

interface TooltipInfo {
  x: number
  y: number
  row: number
  col: number
  elevation: number
  slope: number
  hazard: number
}

// ─── Color mapping functions ──────────────────────────────────────────────────

function elevationToColor(elevation: number, min: number, max: number): [number, number, number] {
  const n = Math.max(0, Math.min(1, (elevation - min) / Math.max(1, max - min)))
  if (n < 0.2) {
    const t = n / 0.2
    return [Math.floor(15 + t * 40), Math.floor(20 + t * 50), Math.floor(50 + t * 70)]
  }
  if (n < 0.55) {
    const t = (n - 0.2) / 0.35
    return [Math.floor(55 + t * 75), Math.floor(65 + t * 65), Math.floor(90 + t * 55)]
  }
  if (n < 0.8) {
    const t = (n - 0.55) / 0.25
    return [Math.floor(130 + t * 60), Math.floor(130 + t * 55), Math.floor(145 + t * 50)]
  }
  const t = (n - 0.8) / 0.2
  return [Math.floor(190 + t * 65), Math.floor(185 + t * 70), Math.floor(195 + t * 60)]
}

function slopeToColor(slope: number, min: number, max: number): [number, number, number] {
  const n = Math.max(0, Math.min(1, (slope - min) / Math.max(0.01, max - min)))
  if (n < 0.3) {
    const t = n / 0.3
    return [Math.floor(10 + t * 30), Math.floor(100 + t * 100), Math.floor(30 + t * 10)]
  }
  if (n < 0.6) {
    const t = (n - 0.3) / 0.3
    return [Math.floor(200 + t * 55), Math.floor(180 - t * 80), 10]
  }
  const t = (n - 0.6) / 0.4
  return [Math.floor(220 + t * 35), Math.floor(40 - t * 30), Math.floor(10 + t * 10)]
}

function hazardToColor(hazard: number, min: number, max: number): [number, number, number] {
  const n = Math.max(0, Math.min(1, (hazard - min) / Math.max(0.01, max - min)))
  if (n < 0.35) {
    const t = n / 0.35
    return [Math.floor(5 + t * 20), Math.floor(80 + t * 105), Math.floor(40 + t * 30)]
  }
  if (n < 0.65) {
    const t = (n - 0.35) / 0.3
    return [Math.floor(180 + t * 65), Math.floor(140 - t * 60), Math.floor(10 + t * 10)]
  }
  const t = (n - 0.65) / 0.35
  return [Math.floor(220 + t * 35), Math.floor(20 - t * 15), Math.floor(10 - t * 5)]
}

function cellToColor(
  cell: { elevation: number; slope: number; hazard_score: number },
  layer: TerrainLayer,
  meta: TerrainGrid['metadata']
): string {
  let r: number, g: number, b: number
  if (layer === 'elevation') {
    ;[r, g, b] = elevationToColor(cell.elevation, meta.elevation_min, meta.elevation_max)
  } else if (layer === 'slope') {
    ;[r, g, b] = slopeToColor(cell.slope, meta.slope_min, meta.slope_max)
  } else {
    ;[r, g, b] = hazardToColor(cell.hazard_score, meta.hazard_min, meta.hazard_max)
  }
  return `rgb(${r},${g},${b})`
}

function formatFinite(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TerrainMap({
  terrain,
  routes,
  selectedRoute,
  roverPosition,
  start,
  destination,
  onCellClick,
  activeLayer,
  emergencyObstructions,
  clickMode,
}: TerrainMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const animTickRef = useRef(0)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 600 })
  const layerRef = useRef(activeLayer)
  layerRef.current = activeLayer

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ w: Math.floor(width), h: Math.floor(height) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ─── Drawing functions ────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = canvasSize
    canvas.width = w
    canvas.height = h
    animTickRef.current += 1
    const tick = animTickRef.current

    // Background
    ctx.fillStyle = '#0a0e1a'
    ctx.fillRect(0, 0, w, h)

    if (!terrain) {
      // Draw placeholder grid
      ctx.strokeStyle = 'rgba(0,212,255,0.08)'
      ctx.lineWidth = 1
      const step = 30
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
      ctx.fillStyle = 'rgba(0,212,255,0.3)'
      ctx.font = '14px IBM Plex Sans, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Connecting to terrain service...', w / 2, h / 2)
      return
    }

    const rows = terrain.metadata.rows
    const cols = terrain.metadata.cols
    const cellW = w / cols
    const cellH = h / rows

    // Draw terrain cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = terrain.cells[r]?.[c]
        if (!cell) continue
        ctx.fillStyle = cellToColor(cell, layerRef.current, terrain.metadata)
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5)
        if (cell.traversable === false) {
          ctx.fillStyle = 'rgba(2,6,23,0.34)'
          ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5)
        }
      }
    }

    // Draw routes (non-selected first, then selected on top)
    const sortedRoutes = [...routes].sort(a =>
      a.profile === selectedRoute ? 1 : -1
    )
    for (const route of sortedRoutes) {
      if (route.path.length < 2) continue
      const isSelected = route.profile === selectedRoute
      const color = profileColor(route.profile)
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = isSelected ? 3 : 1.5
      ctx.globalAlpha = isSelected ? 0.95 : 0.35
      if (route.profile === 'FASTEST') {
        ctx.setLineDash([6, 4])
      } else if (route.profile === 'LOWEST_ENERGY') {
        ctx.setLineDash([2, 4])
      } else {
        ctx.setLineDash([])
      }
      if (isSelected) {
        // Glow effect
        ctx.shadowColor = color
        ctx.shadowBlur = 8
      }
      ctx.beginPath()
      const fp = route.path[0]
      ctx.moveTo((fp.col + 0.5) * cellW, (fp.row + 0.5) * cellH)
      for (let i = 1; i < route.path.length; i++) {
        const p = route.path[i]
        ctx.lineTo((p.col + 0.5) * cellW, (p.row + 0.5) * cellH)
      }
      ctx.stroke()
      ctx.restore()
    }

    // Draw emergency obstructions
    for (const obs of emergencyObstructions) {
      const x = obs.col * cellW
      const y = obs.row * cellH
      ctx.save()
      ctx.fillStyle = 'rgba(239,68,68,0.4)'
      ctx.fillRect(x, y, cellW, cellH)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + cellW - 2, y + cellH - 2)
      ctx.moveTo(x + cellW - 2, y + 2); ctx.lineTo(x + 2, y + cellH - 2)
      ctx.stroke()
      ctx.restore()
    }

    // Draw start marker
    if (start) {
      drawMarker(ctx, start, cellW, cellH, 'start', tick)
    }

    // Draw destination marker
    if (destination) {
      drawMarker(ctx, destination, cellW, cellH, 'destination', tick)
    }

    // Draw rover
    if (roverPosition) {
      drawRover(ctx, roverPosition, cellW, cellH, tick)
    }
  }, [terrain, routes, selectedRoute, roverPosition, start, destination, emergencyObstructions, canvasSize])

  function drawMarker(
    ctx: CanvasRenderingContext2D,
    point: GridPoint,
    cellW: number,
    cellH: number,
    type: 'start' | 'destination',
    tick: number
  ) {
    const cx = (point.col + 0.5) * cellW
    const cy = (point.row + 0.5) * cellH
    const color = type === 'start' ? '#10b981' : '#ef4444'
    const label = type === 'start' ? 'S' : 'D'
    const radius = Math.max(6, Math.min(cellW * 1.2, 12))
    const pulse = Math.sin(tick * 0.06) * 0.4 + 0.6

    ctx.save()
    // Outer pulse ring
    ctx.beginPath()
    ctx.arc(cx, cy, radius * (1.5 + pulse * 0.8), 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.globalAlpha = (1 - pulse) * 0.6
    ctx.stroke()

    // Inner circle
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = color + '33'
    ctx.globalAlpha = 1
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.stroke()

    // Label
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(8, radius * 0.9)}px IBM Plex Sans, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 0
    ctx.fillText(label, cx, cy)
    ctx.restore()
  }

  function drawRover(
    ctx: CanvasRenderingContext2D,
    point: GridPoint,
    cellW: number,
    cellH: number,
    tick: number
  ) {
    const cx = (point.col + 0.5) * cellW
    const cy = (point.row + 0.5) * cellH
    const bounce = Math.sin(tick * 0.1) * 2
    const size = Math.max(7, Math.min(cellW * 1.4, 14))

    ctx.save()
    ctx.translate(cx, cy + bounce)

    // Glow halo
    ctx.beginPath()
    ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 220, 50, 0.15)'
    ctx.fill()

    // Rover triangle
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.8, size * 0.6)
    ctx.lineTo(-size * 0.8, size * 0.6)
    ctx.closePath()
    ctx.fillStyle = '#ffd700'
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.restore()
  }

  // ─── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let running = true
    function loop() {
      if (!running) return
      draw()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [draw])

  // ─── Mouse interaction ────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!terrain) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const col = Math.floor((mx / rect.width) * terrain.metadata.cols)
    const row = Math.floor((my / rect.height) * terrain.metadata.rows)
    if (row < 0 || row >= terrain.metadata.rows || col < 0 || col >= terrain.metadata.cols) {
      setTooltip(null)
      return
    }
    const cell = terrain.cells[row]?.[col]
    if (!cell) return
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      row,
      col,
      elevation: cell.elevation,
      slope: cell.slope,
      hazard: cell.hazard_score,
    })
  }, [terrain])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!terrain) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const col = Math.floor((mx / rect.width) * terrain.metadata.cols)
    const row = Math.floor((my / rect.height) * terrain.metadata.rows)
    if (row >= 0 && row < terrain.metadata.rows && col >= 0 && col < terrain.metadata.cols) {
      onCellClick({ row, col })
    }
  }, [terrain, onCellClick])

  const cursorClass =
    clickMode === 'set-start' || clickMode === 'set-destination'
      ? 'cursor-crosshair'
      : 'cursor-default'

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#040b14]">
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${cursorClass}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-xl border border-cyan-electric/20 bg-[#07111f]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-xl pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}
        >
          <p className="text-cyan-electric font-mono">
            [{tooltip.row}, {tooltip.col}]
          </p>
          <p className="text-text-muted">Elev: <span className="text-white font-mono">{formatFinite(tooltip.elevation, 0)}m</span></p>
          <p className="text-text-muted">Slope: <span className="text-white font-mono">{formatFinite(tooltip.slope, 1)}°</span></p>
          <p className="text-text-muted">Hazard: <span className="text-white font-mono">{formatFinite(tooltip.hazard * 100, 0)}%</span></p>
        </div>
      )}

      {/* Click-mode instruction overlay */}
      {(clickMode === 'set-start' || clickMode === 'set-destination') && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2 text-xs text-cyan-electric border border-cyan-electric/30 pointer-events-none animate-pulse-glow">
          {clickMode === 'set-start' ? '📍 Click to set Start position' : '🎯 Click to set Destination'}
        </div>
      )}
    </div>
  )
}
