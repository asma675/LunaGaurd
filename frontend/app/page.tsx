'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Bot,
  Boxes,
  Database,
  Globe2,
  MapPinned,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { checkHealth, getAiStatus, getKnowledgeSources } from '@/lib/api'
import type { AiStatus, KnowledgeSource } from '@/lib/types'

const modules = [
  {
    href: '/planner',
    icon: MapPinned,
    title: 'Mission Planner',
    copy: 'Compare fastest, lowest-energy, and safest routes with deterministic constraints and transparent scoring.',
    accent: 'from-cyan-400/20 to-blue-500/5',
  },
  {
    href: '/timeline',
    icon: RadioTower,
    title: 'Mission Timeline',
    copy: 'NASA-style chronological trace of AI recommendations, operator actions, anomalies, and recovery decisions.',
    accent: 'from-blue-500/20 to-violet-500/5',
  },
  {
    href: '/digital-twin',
    icon: Boxes,
    title: 'Digital Twin Lab',
    copy: 'Run an end-to-end rover mission, inject dynamic failures, and watch the real replanner recover in simulation.',
    accent: 'from-violet-500/20 to-fuchsia-500/5',
  },
  {
    href: '/globe',
    icon: Globe2,
    title: '3D Lunar Globe',
    copy: 'Explore an interactive lunar sphere with LRO/LOLA-inspired topography, illumination, relief, and mission layers.',
    accent: 'from-slate-400/20 to-cyan-400/5',
  },
  {
    href: '/copilot',
    icon: Bot,
    title: 'AI Mission Copilot',
    copy: 'Ask mission questions grounded in NASA and Canadian Space Agency sources, narrated through IBM Granite on watsonx.ai.',
    accent: 'from-ibm-blue/30 to-cyan-400/5',
  },
  {
    href: '/data',
    icon: Database,
    title: 'Data & Provenance',
    copy: 'See authoritative NASA/CSA sources, live feed status, data limitations, and responsible-AI guardrails.',
    accent: 'from-emerald-400/20 to-cyan-400/5',
  },
]

export default function DashboardPage() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [ai, setAi] = useState<AiStatus | null>(null)
  const [sources, setSources] = useState<KnowledgeSource[]>([])

  useEffect(() => {
    Promise.all([checkHealth(), getAiStatus().catch(() => null), getKnowledgeSources().catch(() => [])]).then(([healthy, aiStatus, sourceList]) => {
      setApiOnline(healthy)
      setAi(aiStatus)
      setSources(sourceList)
    })
  }, [])

  const liveSources = sources.filter(source => source.status === 'live').length

  return (
    <div className="page-wrap">
      <section className="hero-grid mission-card relative overflow-hidden rounded-[28px] p-6 md:p-9 lg:p-11">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ibm-blue/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-36 w-36 rounded-full bg-cyan-electric/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
          <div>
            <p className="page-kicker">Explainable resilient autonomy</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.045em] text-white md:text-6xl">
              Mission intelligence for the moments when a lunar plan stops going to plan.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              LunaGuard combines deterministic route safety, digital-twin recovery, IBM watsonx.ai + Granite explanations, and authoritative NASA/CSA knowledge grounding in one human-in-the-loop mission console.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/planner" className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100">
                Plan a mission <ArrowRight size={16} />
              </Link>
              <Link href="/digital-twin" className="flex items-center gap-2 rounded-xl border border-cyan-electric/25 bg-cyan-electric/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-electric/10">
                <Zap size={16} /> Run resilience simulation
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatusMetric label="Backend" value={apiOnline === null ? 'CHECKING' : apiOnline ? 'ONLINE' : 'OFFLINE'} tone={apiOnline ? 'green' : 'amber'} />
            <StatusMetric label="IBM Granite" value={ai?.enabled ? 'LIVE' : 'SAFE FALLBACK'} tone={ai?.enabled ? 'green' : 'amber'} />
            <StatusMetric label="Grounding" value={`${sources.length || 3} SOURCES`} tone="blue" />
            <StatusMetric label="Live feeds" value={`${liveSources} ACTIVE`} tone="blue" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="page-kicker">Mission operating system</p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">One platform, six mission-critical capabilities</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-green-success" /> Deterministic safety remains authoritative
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(module => {
            const Icon = module.icon
            return (
              <Link key={module.href} href={module.href} className="mission-card group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-electric/25">
                <div className={`absolute inset-0 bg-gradient-to-br ${module.accent} opacity-60 transition group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-cyan-100">
                    <Icon size={21} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{module.title}</h3>
                  <p className="mt-2 min-h-[64px] text-sm leading-6 text-slate-400">{module.copy}</p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-electric">
                    Open module <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="mission-card rounded-2xl p-6">
          <div className="flex items-center gap-2 text-blue-200"><Sparkles size={18} /><span className="text-xs font-bold uppercase tracking-[0.16em]">IBM technology story</span></div>
          <h3 className="mt-3 text-xl font-bold text-white">Granite explains the decision. It does not invent the physics.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">Route geometry, slope constraints, energy use, risk, and viability are computed deterministically. IBM Granite on watsonx.ai turns that evidence and NASA/CSA grounding into concise operator intelligence.</p>
        </div>
        <div className="mission-card rounded-2xl p-6">
          <div className="flex items-center gap-2 text-cyan-200"><ShieldCheck size={18} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Operational resilience</span></div>
          <h3 className="mt-3 text-xl font-bold text-white">Plan → explain → simulate → fail → recover → audit.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">The workflow covers a full mission lifecycle instead of stopping at a shortest-path visualization. Every recommendation and anomaly can be reviewed in the mission timeline.</p>
        </div>
      </section>
    </div>
  )
}

function StatusMetric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'blue' }) {
  const toneClass = tone === 'green' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-cyan-200'
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className={`mt-2 font-mono text-sm font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
