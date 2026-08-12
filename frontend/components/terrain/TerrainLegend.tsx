'use client'

import type { TerrainGrid, TerrainLayer } from '@/lib/types'

interface TerrainLegendProps {
  activeLayer: TerrainLayer
  terrain: TerrainGrid | null
}

const STOPS = {
  elevation: [
    { color: 'rgb(12,26,48)', label: 'Crater' },
    { color: 'rgb(36,62,92)', label: 'Plain' },
    { color: 'rgb(115,125,145)', label: 'Rise' },
    { color: 'rgb(190,196,211)', label: 'High' },
    { color: 'rgb(248,250,252)', label: 'Peak' },
  ],
  slope: [
    { color: 'rgb(16,110,70)', label: 'Flat' },
    { color: 'rgb(160,145,40)', label: 'Moderate' },
    { color: 'rgb(235,122,30)', label: 'Steep' },
    { color: 'rgb(239,68,68)', label: 'Max' },
  ],
  hazard: [
    { color: 'rgb(9,111,77)', label: 'Safe' },
    { color: 'rgb(180,130,20)', label: 'Caution' },
    { color: 'rgb(225,85,25)', label: 'Danger' },
    { color: 'rgb(239,68,68)', label: 'Critical' },
  ],
} satisfies Record<TerrainLayer, Array<{ color: string; label: string }>>

const GRADIENTS: Record<TerrainLayer, string> = {
  elevation:
    'linear-gradient(to right, rgb(12,26,48), rgb(36,62,92), rgb(115,125,145), rgb(190,196,211), rgb(248,250,252))',
  slope:
    'linear-gradient(to right, rgb(16,110,70), rgb(160,145,40), rgb(235,122,30), rgb(239,68,68))',
  hazard:
    'linear-gradient(to right, rgb(9,111,77), rgb(180,130,20), rgb(225,85,25), rgb(239,68,68))',
}

function fixed(value: number | undefined, digits: number): string {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '—'
}

function layerRange(
  layer: TerrainLayer,
  terrain: TerrainGrid | null
): { min: string; max: string } {
  if (!terrain) return { min: '—', max: '—' }
  const m = terrain.metadata
  switch (layer) {
    case 'elevation':
      return { min: `${fixed(m.elevation_min, 0)} m`, max: `${fixed(m.elevation_max, 0)} m` }
    case 'slope':
      return { min: `${fixed(m.slope_min, 1)}°`, max: `${fixed(m.slope_max, 1)}°` }
    case 'hazard':
      return { min: `${fixed(m.hazard_min * 100, 0)}%`, max: `${fixed(m.hazard_max * 100, 0)}%` }
  }
}

export default function TerrainLegend({ activeLayer, terrain }: TerrainLegendProps) {
  const range = layerRange(activeLayer, terrain)
  const title =
    activeLayer === 'elevation'
      ? 'Elevation'
      : activeLayer === 'slope'
        ? 'Slope angle'
        : 'Hazard index'

  return (
    <div className="absolute bottom-4 left-4 z-10 min-w-[220px] rounded-2xl border border-white/[0.08] bg-[#07111f]/90 px-3.5 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">Terrain layer</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-200">{title}</p>
        </div>
        <div className="text-right font-mono text-[8px] text-slate-500">
          <span>{range.min}</span>
          <span className="mx-1.5 text-slate-700">→</span>
          <span>{range.max}</span>
        </div>
      </div>

      <div className="h-2.5 rounded-full ring-1 ring-white/5" style={{ background: GRADIENTS[activeLayer] }} />

      <div className="mt-2 flex justify-between gap-2">
        {STOPS[activeLayer].map(stop => (
          <div key={stop.label} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: stop.color }} />
            <span className="text-[7px] uppercase tracking-wider text-slate-600">{stop.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
