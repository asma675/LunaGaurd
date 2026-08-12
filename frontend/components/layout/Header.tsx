'use client'

import { Activity, BrainCircuit, Clock3, Route, ShieldCheck } from 'lucide-react'
import type { AiStatus, AppPhase } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'

interface HeaderProps {
  phase: AppPhase
  apiConnected: boolean | null
  calcTime: number | null
  aiStatus: AiStatus | null
}

export default function Header({ phase, apiConnected, calcTime, aiStatus }: HeaderProps) {
  const aiLive = aiStatus?.enabled === true

  return (
    <header className="relative z-30 flex h-[68px] flex-shrink-0 items-center gap-4 border-b border-white/[0.06] bg-[#07111f]/95 px-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-electric/45 to-transparent" />

      {/* Workspace identity — the global shell owns primary LunaGuard branding. */}
      <div className="flex min-w-[255px] flex-shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-electric/20 bg-cyan-electric/[0.07] text-cyan-electric">
          <Route size={20} strokeWidth={1.7} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-[0.14em] text-white">MISSION PLANNER</span>
            <span className="rounded-md border border-cyan-electric/20 bg-cyan-electric/[0.06] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-electric">
              Live
            </span>
          </div>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Route trade studies · execution workspace
          </p>
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-white/[0.07]" />
      <StatusBadge phase={phase} size="md" />

      <div className="hidden items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 xl:flex">
        <ShieldCheck size={13} className="text-green-success" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Human-in-loop</span>
      </div>

      <div className="flex-1" />

      {/* IBM AI status */}
      <div className="flex items-center gap-2 rounded-xl border border-ibm-blue/25 bg-ibm-blue/[0.08] px-3 py-2">
        <BrainCircuit size={15} className="text-blue-300" />
        <div className="leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200">IBM watsonx</span>
            <span className={`h-1.5 w-1.5 rounded-full ${aiLive ? 'bg-green-success' : 'bg-amber-warning'}`} />
          </div>
          <p className="mt-1 max-w-[170px] truncate font-mono text-[8px] text-slate-500">
            {aiStatus?.model_id ?? 'ibm/granite-3-3-8b-instruct'}
          </p>
        </div>
      </div>

      {calcTime !== null && (
        <div className="hidden items-center gap-1.5 text-[9px] text-slate-500 lg:flex">
          <Clock3 size={12} />
          <span className="font-mono">{calcTime}ms</span>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
        <Activity size={14} className={apiConnected ? 'text-green-success' : 'text-slate-500'} />
        <div className="leading-none">
          <p className="text-[9px] font-semibold text-slate-300">
            {apiConnected === null ? 'Connecting' : apiConnected ? 'API Online' : 'API Offline'}
          </p>
          <p className="mt-1 text-[8px] text-slate-600">FastAPI · port 8000</p>
        </div>
      </div>
    </header>
  )
}
