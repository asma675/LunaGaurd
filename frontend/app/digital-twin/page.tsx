'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, BatteryCharging, Boxes, CircleAlert, Pause, Play, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DEMO_MISSION } from '@/lib/demo-mission'
import { planRoutes, reassessRoute } from '@/lib/api'
import type { EmergencyEvent, GridPoint, RecoveryResult, RoutePlanResponse, RouteResult } from '@/lib/types'
import { appendTimelineEvent } from '@/lib/timeline'

type TwinState = 'idle' | 'planning' | 'running' | 'anomaly' | 'replanning' | 'recovered' | 'recovering' | 'complete' | 'error'
type Scenario = 'BATTERY_DEGRADATION' | 'REDUCED_MOBILITY' | 'TERRAIN_OBSTRUCTION'

interface TelemetryPoint {
  t: number
  progress: number
  battery: number
  risk: number
}

export default function DigitalTwinPage() {
  const [state, setState] = useState<TwinState>('idle')
  const [scenario, setScenario] = useState<Scenario>('TERRAIN_OBSTRUCTION')
  const [plan, setPlan] = useState<RoutePlanResponse | null>(null)
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [battery, setBattery] = useState(DEMO_MISSION.rover.battery_percent)
  const [risk, setRisk] = useState(0)
  const [position, setPosition] = useState<GridPoint>(DEMO_MISSION.start)
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([])
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const recoveryDelayRef = useRef<number | null>(null)
  const anomalyTriggered = useRef(false)

  const reset = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    if (recoveryDelayRef.current !== null) window.clearTimeout(recoveryDelayRef.current)
    timerRef.current = null
    recoveryDelayRef.current = null
    anomalyTriggered.current = false
    setState('idle')
    setPlan(null)
    setRecovery(null)
    setProgress(0)
    setBattery(DEMO_MISSION.rover.battery_percent)
    setRisk(0)
    setPosition(DEMO_MISSION.start)
    setTelemetry([])
    setPaused(false)
    pausedRef.current = false
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      if (recoveryDelayRef.current !== null) window.clearTimeout(recoveryDelayRef.current)
    }
  }, [])

  const makeEmergency = useCallback((routePath: GridPoint[]): EmergencyEvent => {
    if (scenario === 'BATTERY_DEGRADATION') {
      return { type: scenario, severity: 'HIGH', description: 'Digital twin detected a 26% unexpected battery-capacity loss.', battery_loss_percent: 26 }
    }
    if (scenario === 'REDUCED_MOBILITY') {
      return { type: scenario, severity: 'HIGH', description: 'Wheel traction degradation reduced the rover safe slope envelope by 7°.', slope_reduction_deg: 7 }
    }
    const start = Math.floor(routePath.length * 0.58)
    return {
      type: scenario,
      severity: 'CRITICAL',
      description: 'New terrain hazard blocks the projected corridor ahead of the rover.',
      obstructed_cells: routePath.slice(start, Math.min(routePath.length, start + 7)),
    }
  }, [scenario])

  const continueOnRecoveryRoute = useCallback((result: RecoveryResult, startBattery: number) => {
    if (!result.recovery_viable || result.recommendation !== 'FOLLOW_RECOVERY_ROUTE' || result.recovery_route.path.length < 2) {
      if (result.recommendation === 'ABORT') {
        appendTimelineEvent({ type: 'recovery', title: 'Twin mission halted', detail: 'No safe recovery traverse was available. The digital twin preserved the ABORT recommendation rather than forcing mission completion.', severity: 'critical', source: 'Digital Twin Lab' })
      }
      return
    }

    const route = result.recovery_route
    let recoveryIndex = 0
    let recoveryBattery = startBattery
    setState('recovering')

    timerRef.current = window.setInterval(() => {
      if (pausedRef.current) return
      recoveryIndex += 1
      const clamped = Math.min(recoveryIndex, route.path.length - 1)
      const localProgress = clamped / Math.max(1, route.path.length - 1)
      const overallProgress = 0.48 + localProgress * 0.52
      const point = route.path[clamped]
      const reserveTarget = Math.max(0, route.metrics.battery_reserve_percent)
      recoveryBattery = Math.max(reserveTarget, startBattery - localProgress * Math.max(0, startBattery - reserveTarget))
      const dynamicRisk = Math.min(100, Math.max(0, route.metrics.risk_score * 100 + Math.sin(localProgress * 9) * 2))

      setPosition(point)
      setProgress(overallProgress)
      setBattery(recoveryBattery)
      setRisk(dynamicRisk)
      setTelemetry(prev => [...prev.slice(-60), { t: prev.length + 1, progress: overallProgress * 100, battery: recoveryBattery, risk: dynamicRisk }])

      if (localProgress >= 1) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current)
        timerRef.current = null
        setProgress(1)
        setState('complete')
        appendTimelineEvent({ type: 'telemetry', title: 'Digital twin mission completed', detail: `Recovery traverse reached the destination with ${recoveryBattery.toFixed(1)}% simulated battery remaining.`, severity: 'success', source: 'Digital Twin Lab' })
      }
    }, 180)
  }, [])

  const triggerRecovery = useCallback(async (routePath: GridPoint[], current: GridPoint, route: RouteResult, currentBattery: number) => {
    const emergency = makeEmergency(routePath)
    setState('anomaly')
    const batteryAfterAnomaly = scenario === 'BATTERY_DEGRADATION' ? Math.max(5, currentBattery - 22) : currentBattery
    setBattery(batteryAfterAnomaly)
    appendTimelineEvent({ type: 'anomaly', title: `Digital twin: ${scenario.replaceAll('_', ' ')}`, detail: emergency.description, severity: 'critical', source: 'Digital Twin Lab' })
    try {
      setState('replanning')
      const result = await reassessRoute({
        original_mission: DEMO_MISSION,
        active_route: route,
        current_position: current,
        emergency_event: emergency,
      })
      setRecovery(result)
      setState('recovered')
      appendTimelineEvent({ type: 'recovery', title: `Twin recovery: ${result.recommendation.replaceAll('_', ' ')}`, detail: result.explanation, severity: result.recovery_viable ? 'success' : 'critical', source: 'Emergency Replanner' })

      recoveryDelayRef.current = window.setTimeout(() => {
        recoveryDelayRef.current = null
        continueOnRecoveryRoute(result, batteryAfterAnomaly)
      }, 650)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery simulation failed')
      setState('error')
    }
  }, [continueOnRecoveryRoute, makeEmergency, scenario])

  const startSimulation = useCallback(async () => {
    reset()
    setState('planning')
    appendTimelineEvent({ type: 'system', title: 'Digital twin initialized', detail: `Scenario armed: ${scenario.replaceAll('_', ' ')}. Route planning started.`, severity: 'info', source: 'Digital Twin Lab' })
    try {
      const routePlan = await planRoutes(DEMO_MISSION)
      setPlan(routePlan)
      const route = routePlan.routes.find(item => item.profile === routePlan.recommended_profile) ?? routePlan.routes[0]
      setRisk(route.metrics.risk_score * 100)
      setState('running')
      let index = 0
      timerRef.current = window.setInterval(() => {
        if (pausedRef.current) return
        index += 1
        const clamped = Math.min(index, route.path.length - 1)
        const p = clamped / Math.max(1, route.path.length - 1)
        const point = route.path[clamped]
        setPosition(point)
        setProgress(p)
        const projectedBattery = Math.max(0, DEMO_MISSION.rover.battery_percent - p * (DEMO_MISSION.rover.battery_percent - route.metrics.battery_reserve_percent))
        setBattery(projectedBattery)
        const dynamicRisk = Math.min(100, route.metrics.risk_score * 100 + Math.sin(p * 8) * 3 + (p > 0.45 ? 2 : 0))
        setRisk(dynamicRisk)
        setTelemetry(prev => [...prev.slice(-45), { t: index, progress: p * 100, battery: projectedBattery, risk: dynamicRisk }])

        if (p >= 0.48 && !anomalyTriggered.current) {
          anomalyTriggered.current = true
          if (timerRef.current !== null) window.clearInterval(timerRef.current)
          timerRef.current = null
          void triggerRecovery(route.path, point, route, projectedBattery)
          return
        }
        if (p >= 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current)
          timerRef.current = null
          setState('complete')
        }
      }, 180)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Digital twin failed to plan the mission')
      setState('error')
    }
  }, [reset, scenario, triggerRecovery])

  return (
    <div className="page-wrap">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">End-to-end resilience simulation</p>
          <h1 className="page-title mt-2">Digital Twin Lab</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">Run LunaGuard’s real route planner through a simulated mission, inject a failure at mid-traverse, and use the same emergency replanner to produce a recovery decision.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300"><RotateCcw size={15} /> Reset</button>
          <button onClick={startSimulation} disabled={!['idle', 'complete', 'error'].includes(state)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-40"><Play size={15} /> Run twin</button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <section className="mission-card rounded-3xl p-5 md:p-6">
          <div className="flex items-center gap-2"><Boxes size={19} className="text-violet-300" /><h2 className="text-lg font-bold text-white">Scenario controller</h2></div>
          <div className="mt-5 space-y-3">
            {([
              ['TERRAIN_OBSTRUCTION', 'Blocked terrain', 'A newly detected hazard invalidates the corridor ahead.'],
              ['BATTERY_DEGRADATION', 'Battery degradation', 'Unexpected battery-capacity loss changes the energy margin.'],
              ['REDUCED_MOBILITY', 'Reduced mobility', 'Wheel/traction damage lowers the safe slope envelope.'],
            ] as const).map(([value, title, copy]) => (
              <button key={value} onClick={() => setScenario(value)} disabled={state !== 'idle' && state !== 'complete' && state !== 'error'} className={`w-full rounded-2xl border p-4 text-left transition ${scenario === value ? 'border-violet-400/40 bg-violet-400/10' : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.04]'}`}>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-electric/15 bg-cyan-electric/[0.05] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">Simulation state</p>
            <p className="mt-2 font-mono text-lg font-bold uppercase text-white">{state}</p>
            {error && <p className="mt-2 text-xs leading-5 text-red-300">{error}</p>}
          </div>
          {(state === 'running' || state === 'recovering') && (
            <button onClick={() => setPaused(value => { const next = !value; pausedRef.current = next; return next })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300">
              {paused ? <Play size={15} /> : <Pause size={15} />} {paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </section>

        <section className="mission-card overflow-hidden rounded-3xl">
          <div className="grid grid-cols-3 border-b border-white/10">
            <Metric icon={Activity} label="Traverse" value={`${(progress * 100).toFixed(0)}%`} />
            <Metric icon={BatteryCharging} label="Battery" value={`${battery.toFixed(1)}%`} />
            <Metric icon={ShieldCheck} label="Dynamic risk" value={`${risk.toFixed(1)}/100`} />
          </div>
          <div className="h-[310px] p-5">
            {telemetry.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry}>
                  <defs>
                    <linearGradient id="batteryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient>
                    <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#07111f', border: '1px solid rgba(148,163,184,.18)', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="battery" stroke="#22d3ee" fill="url(#batteryFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="risk" stroke="#f59e0b" fill="url(#riskFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles size={32} className="text-violet-300" />
                <p className="mt-4 text-lg font-bold text-white">Ready to instantiate the rover twin</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">The simulation plans the South Pole reference mission, streams battery/risk telemetry, triggers the selected anomaly around 48% progress, requests a live recovery route, and then continues the rover to mission completion when recovery is viable.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="mission-card rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Current rover pose</p>
          <p className="mt-2 font-mono text-2xl font-bold text-white">ROW {position.row} · COL {position.col}</p>
          <p className="mt-2 text-sm text-slate-500">Route profile: {plan?.recommended_profile?.replaceAll('_', ' ') ?? 'awaiting plan'}</p>
        </section>
        <section className={`mission-card rounded-2xl p-5 ${recovery ? 'border-emerald-400/25' : ''}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Recovery decision</p>
          <p className="mt-2 text-xl font-bold text-white">{recovery ? recovery.recommendation.replaceAll('_', ' ') : 'No anomaly assessed yet'}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{recovery?.explanation ?? 'LunaGuard will compare the damaged original route against a freshly planned SAFEST recovery path from the rover’s current position.'}</p>
        </section>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="p-4 md:p-5">
      <div className="flex items-center gap-2 text-slate-500"><Icon size={14} /><span className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</span></div>
      <p className="mt-2 font-mono text-lg font-bold text-white md:text-xl">{value}</p>
    </div>
  )
}
