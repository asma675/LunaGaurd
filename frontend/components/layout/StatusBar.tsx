'use client'

import { CircleAlert, Database, ServerCog } from 'lucide-react'
import type { AppPhase } from '@/lib/types'

interface StatusBarProps {
  phase: AppPhase
  apiConnected: boolean | null
}

export default function StatusBar({ phase, apiConnected }: StatusBarProps) {
  return (
    <div className="flex h-7 flex-shrink-0 items-center gap-4 border-t border-white/[0.06] bg-[#050b14] px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CircleAlert size={11} className="flex-shrink-0 text-amber-warning" />
        <p className="truncate text-[8px] text-slate-600">
          Decision-support simulation environment · synthetic terrain · not flight-certified
        </p>
      </div>

      <div className="hidden items-center gap-1.5 text-[8px] text-slate-600 md:flex">
        <Database size={10} />
        <span>seed 42 · 100 × 100 grid</span>
      </div>

      <div className="flex items-center gap-1.5 text-[8px]">
        <span className="uppercase tracking-wider text-slate-700">Phase</span>
        <span className="font-mono text-cyan-electric">{phase}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[8px] text-slate-600">
        <ServerCog size={10} />
        <span className={apiConnected ? 'text-green-success' : ''}>
          {apiConnected === null ? 'checking API' : apiConnected ? 'backend healthy' : 'backend offline'}
        </span>
      </div>
    </div>
  )
}
