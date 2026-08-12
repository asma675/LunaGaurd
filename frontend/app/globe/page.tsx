'use client'

import { useState } from 'react'
import { Database, Layers3, Moon, Orbit, Satellite, SunMedium } from 'lucide-react'
import LunarGlobe, { type GlobeLayers } from '@/components/globe/LunarGlobe'

export default function GlobePage() {
  const [layers, setLayers] = useState<GlobeLayers>({ topo: true, relief: true, illumination: false, sites: true, grid: true })

  const toggles: { key: keyof GlobeLayers; label: string; copy: string; icon: typeof Moon }[] = [
    { key: 'topo', label: 'NASA LRO / LOLA topography', copy: 'Color logic modeled after lunar elevation/slope visualization concepts.', icon: Layers3 },
    { key: 'relief', label: 'LROC-style relief', copy: 'Procedural relief layer for crater/texture context.', icon: Moon },
    { key: 'illumination', label: 'Polar illumination', copy: 'Highlights polar regions relevant to lighting and power studies.', icon: SunMedium },
    { key: 'sites', label: 'Mission landmarks', copy: 'Reference markers for selected historic and polar sites.', icon: Orbit },
    { key: 'grid', label: 'Lat / lon grid', copy: 'Mission coordinate reference overlay.', icon: Satellite },
  ]

  return (
    <div className="page-wrap">
      <div>
        <p className="page-kicker">Spatial mission intelligence</p>
        <h1 className="page-title mt-2">3D Lunar Globe</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base">A global context view with switchable LRO/LOLA-inspired layers. The rendering is an interactive visual proxy; LunaGuard clearly links to NASA’s authoritative LRO/PDS products rather than pretending the generated globe pixels are raw spacecraft data.</p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_330px]">
        <section className="mission-card min-h-[620px] rounded-3xl p-2">
          <LunarGlobe layers={layers} />
        </section>
        <aside className="space-y-4">
          <section className="mission-card rounded-3xl p-5">
            <div className="flex items-center gap-2"><Layers3 size={18} className="text-cyan-electric" /><h2 className="text-lg font-bold text-white">Satellite layers</h2></div>
            <div className="mt-4 space-y-2">
              {toggles.map(({ key, label, copy, icon: Icon }) => (
                <button key={key} onClick={() => setLayers(prev => ({ ...prev, [key]: !prev[key] }))} className={`w-full rounded-2xl border p-3.5 text-left transition ${layers[key] ? 'border-cyan-electric/30 bg-cyan-electric/[0.07]' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${layers[key] ? 'bg-cyan-electric/10 text-cyan-200' : 'bg-white/[0.04] text-slate-500'}`}><Icon size={17} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{copy}</p>
                    </div>
                    <span className={`h-5 w-9 rounded-full border p-0.5 ${layers[key] ? 'border-cyan-electric/30 bg-cyan-electric/20' : 'border-white/10 bg-black/20'}`}><span className={`block h-3.5 w-3.5 rounded-full transition ${layers[key] ? 'translate-x-3.5 bg-cyan-200' : 'bg-slate-600'}`} /></span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="mission-card rounded-3xl p-5">
            <div className="flex items-center gap-2"><Database size={17} className="text-blue-300" /><h2 className="font-bold text-white">Authoritative pipeline</h2></div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <p><strong className="text-slate-200">NASA LRO / LOLA</strong> provides lunar elevation and slope information used for topographic mapping.</p>
              <p><strong className="text-slate-200">NASA PDS / LROC</strong> archives global, polar, regional, and topographic map products.</p>
              <p className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs text-amber-100/80">Visualization disclosure: this globe uses generated proxy layers so it stays fast and works offline. The Data Sources page exposes the official NASA products used as grounding references.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
