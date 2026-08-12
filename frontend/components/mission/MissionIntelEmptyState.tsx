'use client'

import type { ReactNode } from 'react'
import { BrainCircuit, GitBranch, Radar, ShieldCheck, Sparkles } from 'lucide-react'

export default function MissionIntelEmptyState() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-ibm-blue/[0.10] via-white/[0.025] to-violet-accent/[0.08] p-4">
        <div className="absolute -right-12 -top-10 h-28 w-28 rounded-full bg-cyan-electric/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-electric/20 bg-cyan-electric/[0.08] text-cyan-electric">
            <Radar size={20} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-electric">Mission decision engine</p>
          <h2 className="mt-1 text-base font-semibold leading-snug text-white">
            Plan, explain, and recover before the rover commits.
          </h2>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Select two points on the terrain, compare three objective profiles, then simulate an anomaly to prove recovery behavior.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <Capability
          icon={<GitBranch size={14} />}
          title="Multi-objective A*"
          copy="Fastest, lowest-energy, and safest candidates under hard terrain constraints."
          accent="text-cyan-electric"
        />
        <Capability
          icon={<BrainCircuit size={14} />}
          title="IBM watsonx · Granite"
          copy="Grounded mission narration with deterministic metrics kept authoritative."
          accent="text-blue-300"
        />
        <Capability
          icon={<ShieldCheck size={14} />}
          title="Emergency resilience"
          copy="Battery loss, mobility degradation, and newly blocked terrain trigger replanning."
          accent="text-green-success"
        />
      </div>

      <div className="mt-auto rounded-xl border border-amber-warning/15 bg-amber-warning/[0.04] p-3">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-amber-warning">
          <Sparkles size={12} />
          Reference mission path
        </div>
        <p className="mt-1.5 text-[9px] leading-relaxed text-slate-500">
          Use <span className="font-semibold text-slate-300">Load Reference Mission</span> → Calculate Routes → Start Mission → Inject Terrain Block.
        </p>
      </div>
    </div>
  )
}

function Capability({
  icon,
  title,
  copy,
  accent,
}: {
  icon: ReactNode
  title: string
  copy: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.10] hover:bg-white/[0.035]">
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 ${accent}`}>{icon}</div>
        <div>
          <p className="text-[10px] font-semibold text-slate-300">{title}</p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-slate-600">{copy}</p>
        </div>
      </div>
    </div>
  )
}
