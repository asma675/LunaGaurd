'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, CircleAlert, Clock3, RotateCcw, Satellite, ShieldCheck, UserRoundCog, Wrench } from 'lucide-react'
import type { MissionTimelineEvent } from '@/lib/types'
import { clearTimeline, readTimeline } from '@/lib/timeline'

const iconByType = {
  system: Satellite,
  ai: Bot,
  operator: UserRoundCog,
  anomaly: CircleAlert,
  recovery: Wrench,
  telemetry: Clock3,
}

const toneBySeverity = {
  info: 'border-blue-400/25 bg-blue-400/[0.06] text-blue-200',
  success: 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200',
  warning: 'border-amber-400/25 bg-amber-400/[0.06] text-amber-200',
  critical: 'border-red-400/30 bg-red-400/[0.08] text-red-200',
}

export default function MissionTimelinePage() {
  const [events, setEvents] = useState<MissionTimelineEvent[]>([])
  const [filter, setFilter] = useState<'all' | MissionTimelineEvent['type']>('all')

  useEffect(() => {
    const refresh = () => setEvents(readTimeline())
    refresh()
    window.addEventListener('lunaguard:timeline', refresh as EventListener)
    window.addEventListener('lunaguard:timeline-reset', refresh as EventListener)
    return () => {
      window.removeEventListener('lunaguard:timeline', refresh as EventListener)
      window.removeEventListener('lunaguard:timeline-reset', refresh as EventListener)
    }
  }, [])

  const visible = useMemo(() => filter === 'all' ? events : events.filter(event => event.type === filter), [events, filter])
  const missionStart = useMemo(() => events.length ? Math.min(...events.map(event => new Date(event.timestamp).getTime())) : Date.now(), [events])

  return (
    <div className="page-wrap">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Mission control audit trail</p>
          <h1 className="page-title mt-2">Every decision has a timestamp, source, and consequence.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">A NASA-style operations timeline for AI recommendations, operator actions, anomalies, telemetry milestones, and recovery decisions. It makes LunaGuard explainable after the fact—not only at the moment of action.</p>
        </div>
        <button
          onClick={() => { clearTimeline(); setEvents(readTimeline()) }}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-cyan-electric/30 hover:text-white"
        >
          <RotateCcw size={15} /> Reset log
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['all', 'ai', 'operator', 'anomaly', 'recovery', 'telemetry', 'system'] as const).map(option => (
          <button key={option} onClick={() => setFilter(option)} className={`rounded-full border px-3 py-2 text-xs font-semibold capitalize ${filter === option ? 'border-cyan-electric/35 bg-cyan-electric/10 text-cyan-100' : 'border-white/10 bg-white/[0.025] text-slate-500 hover:text-slate-300'}`}>
            {option}
          </button>
        ))}
      </div>

      <div className="mission-card relative mt-6 overflow-hidden rounded-3xl p-5 md:p-7">
        <div className="absolute left-[39px] top-10 bottom-10 w-px bg-gradient-to-b from-cyan-electric/40 via-blue-500/20 to-transparent md:left-[51px]" />
        <div className="space-y-4">
          {visible.map(event => {
            const Icon = iconByType[event.type]
            return (
              <article key={event.id} className="relative grid grid-cols-[48px_1fr] gap-3 md:grid-cols-[72px_1fr]">
                <div className="relative z-10 flex justify-center pt-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border bg-[#07111f] ${toneBySeverity[event.severity]}`}>
                    <Icon size={15} />
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${toneBySeverity[event.severity]}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">{formatMet(new Date(event.timestamp).getTime() - missionStart)} · {event.type}</p>
                      <h2 className="mt-1 text-base font-bold text-white">{event.title}</h2>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[11px] text-slate-400">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      {event.source && <p className="mt-1 text-[10px] text-slate-500">{event.source}</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{event.detail}</p>
                </div>
              </article>
            )
          })}
          {visible.length === 0 && <div className="py-16 text-center text-sm text-slate-500">No events match this filter yet. Run a mission or digital twin scenario.</div>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={14} className="text-cyan-electric" /> Timeline entries are stored locally in the browser for this local console and are not a certified flight log.
      </div>
    </div>
  )
}


function formatMet(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `T+${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
