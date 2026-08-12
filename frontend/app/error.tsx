'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('LunaGuard UI error boundary:', error)
  }, [error])

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-6 text-white">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-red-danger/25 bg-[#07111f]/95 p-7 shadow-[0_28px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-red-danger/25 bg-red-danger/10 text-red-300">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">Mission console exception</p>
            <h1 className="mt-1 text-xl font-semibold">LunaGuard protected the operator session.</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              A client-side view failed to render. The route backend is isolated from this display error; retry the console before continuing the simulation.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-3 font-mono text-[10px] leading-relaxed text-slate-500">
          {error.message || 'Unexpected frontend error'}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck size={13} className="text-cyan-electric" />
            Deterministic mission data remains server-side.
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-electric/30 bg-cyan-electric/10 px-4 py-2 text-xs font-semibold text-cyan-electric transition hover:bg-cyan-electric/15"
          >
            <RefreshCw size={13} />
            Retry console
          </button>
        </div>
      </section>
    </main>
  )
}
