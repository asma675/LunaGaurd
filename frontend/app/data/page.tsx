'use client'

import { useEffect, useState } from 'react'
import { Database, ExternalLink, RefreshCw, Satellite, ShieldCheck, Waves } from 'lucide-react'
import { getKnowledgeSources } from '@/lib/api'
import type { KnowledgeSource } from '@/lib/types'

export default function DataSourcesPage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setSources(await getKnowledgeSources(true))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load source catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  return (
    <div className="page-wrap">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Evidence and provenance</p>
          <h1 className="page-title mt-2">Data Sources</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base">LunaGuard is explicit about what is real, what is live, and what is synthetic. NASA and Canadian Space Agency sources ground the AI copilot; the route simulation terrain remains deterministic synthetic data until mission-grade map products are integrated.</p>
        </div>
        <button onClick={() => void refresh()} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh sources</button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SourceMetric icon={Satellite} label="NASA LRO / LOLA" value="AUTHORITATIVE" copy="Lunar topography, slope, polar science, and landing-site context." />
        <SourceMetric icon={Waves} label="NASA DONKI" value="BEST-EFFORT LIVE" copy="Recent space-weather notifications via NASA's public API." />
        <SourceMetric icon={Database} label="CSA Open Data" value="AUTHORITATIVE" copy="LEAD rover analogue plus CKAN discovery from the CSA data portal." />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <section className="mission-card rounded-3xl p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Grounding catalog</h2>
            <span className="font-mono text-xs text-slate-500">{sources.length || '—'} records</span>
          </div>
          {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{error}</div>}
          <div className="mt-4 space-y-3">
            {sources.map(source => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="group block rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:border-cyan-electric/25 hover:bg-white/[0.04]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-cyan-200">{source.id}</span>
                      <span className="text-[10px] text-slate-600">· {source.kind}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-white">{source.title}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">{source.agency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${source.status === 'live' ? 'bg-emerald-400/10 text-emerald-300' : source.status === 'offline-fallback' ? 'bg-amber-400/10 text-amber-300' : 'bg-blue-400/10 text-blue-300'}`}>{source.status}</span>
                    <ExternalLink size={13} className="text-slate-600 group-hover:text-cyan-200" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{source.summary}</p>
              </a>
            ))}
            {!loading && sources.length === 0 && <p className="py-10 text-center text-sm text-slate-500">The backend source catalog is unavailable. Start Docker and refresh.</p>}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="mission-card rounded-3xl p-5">
            <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-300" /><h2 className="font-bold text-white">Provenance policy</h2></div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <p><strong className="text-slate-200">Operational metrics:</strong> deterministic LunaGuard computation.</p>
              <p><strong className="text-slate-200">Copilot knowledge:</strong> listed NASA/CSA sources supplied as grounding context.</p>
              <p><strong className="text-slate-200">Current terrain grid:</strong> synthetic, seeded, reproducible, and clearly labelled—not falsely presented as NASA flight data.</p>
              <p><strong className="text-slate-200">3D globe:</strong> generated visual proxy with authoritative NASA data-product links.</p>
            </div>
          </section>
          <section className="mission-card rounded-3xl border-blue-400/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">Production pathway</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">Replace the synthetic terrain adapter with mission-specific LRO/PDS raster products, validated hazard layers, and rover telemetry while retaining the same planning, explainability, recovery, and audit interfaces.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SourceMetric({ icon: Icon, label, value, copy }: { icon: typeof Satellite; label: string; value: string; copy: string }) {
  return <div className="mission-card rounded-2xl p-5"><Icon size={19} className="text-cyan-electric" /><p className="mt-4 text-sm font-bold text-white">{label}</p><p className="mt-1 font-mono text-[11px] font-bold text-cyan-200">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></div>
}
