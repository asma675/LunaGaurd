'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { generateMissionBrief } from '@/lib/api'
import type { MissionBrief, RoutePlanResponse } from '@/lib/types'

interface GraniteBriefCardProps {
  routePlan: RoutePlanResponse
}

export default function GraniteBriefCard({ routePlan }: GraniteBriefCardProps) {
  const [brief, setBrief] = useState<MissionBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadBrief() {
    setLoading(true)
    setError(null)
    try {
      setBrief(await generateMissionBrief(routePlan))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate mission brief')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBrief()
    // Regenerate when the recommended route or mission changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePlan.mission_name, routePlan.recommended_profile])

  const isGranite = brief?.source === 'watsonx-granite'

  return (
    <section className="relative overflow-hidden rounded-2xl border border-ibm-blue/30 bg-gradient-to-br from-ibm-blue/10 via-card-dark/90 to-violet-accent/10 p-3.5 shadow-[0_16px_50px_rgba(0,67,206,0.12)]">
      <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-ibm-blue/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-xl border border-ibm-blue/30 bg-ibm-blue/15 p-2 text-cyan-electric">
              <BrainCircuit size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                  Mission Intelligence
                </p>
                <span className="rounded-full border border-ibm-blue/30 bg-ibm-blue/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-blue-300">
                  IBM watsonx
                </span>
              </div>
              <p className="mt-0.5 text-[9px] text-text-dim">
                Granite narration grounded in deterministic route evidence
              </p>
            </div>
          </div>

          <button
            onClick={loadBrief}
            disabled={loading}
            title="Regenerate mission brief"
            className="rounded-lg border border-border-dim bg-white/[0.03] p-1.5 text-text-muted transition hover:border-cyan-electric/40 hover:text-cyan-electric disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/20 p-3">
          {loading && !brief ? (
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Sparkles size={13} className="animate-pulse text-cyan-electric" />
              Grounding mission evidence…
            </div>
          ) : error ? (
            <p className="text-[10px] leading-relaxed text-red-danger">{error}</p>
          ) : brief ? (
            <p className="text-[11px] leading-[1.65] text-slate-200">{brief.brief}</p>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-wider ${
              isGranite
                ? 'border-green-success/30 bg-green-success/10 text-green-success'
                : 'border-amber-warning/30 bg-amber-warning/10 text-amber-warning'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isGranite ? 'bg-green-success' : 'bg-amber-warning'}`} />
            {isGranite ? 'Granite live' : 'Offline-safe fallback'}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border-dim bg-white/[0.03] px-2 py-1 text-[8px] text-text-muted">
            <ShieldCheck size={10} className="text-cyan-electric" />
            Numeric guardrails
          </div>

          <span className="ml-auto max-w-[180px] truncate font-mono text-[8px] text-text-dim">
            {brief?.model_id ?? 'ibm/granite-3-3-8b-instruct'}
          </span>
        </div>
      </div>
    </section>
  )
}
