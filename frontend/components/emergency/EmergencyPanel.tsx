'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, BatteryWarning, Gauge, MapPinned, RadioTower, Route } from 'lucide-react'
import type { EmergencyEvent, GridPoint, RouteResult, AppPhase } from '@/lib/types'
import { formatDistance, formatTime } from '@/lib/utils'

interface EmergencyPanelProps {
  missionActive: boolean
  onInjectEmergency: (event: EmergencyEvent) => void
  roverPosition: GridPoint | null
  roverProgress: number
  currentRoute: RouteResult | null
  recoveryLoading: boolean
  appPhase: AppPhase
}

type PresetKind = 'battery10' | 'battery25' | 'mobility3' | 'mobility6' | 'obstruction'

type EmergencyPreset = {
  kind: PresetKind
  label: string
  sublabel: string
  icon: ReactNode
  severity: EmergencyEvent['severity']
}

const PRESETS: EmergencyPreset[] = [
  { kind: 'battery10', label: 'Battery', sublabel: '−10%', icon: <BatteryWarning size={15} />, severity: 'LOW' },
  { kind: 'battery25', label: 'Battery', sublabel: '−25%', icon: <BatteryWarning size={15} />, severity: 'HIGH' },
  { kind: 'mobility3', label: 'Mobility', sublabel: '−3°', icon: <Gauge size={15} />, severity: 'MEDIUM' },
  { kind: 'mobility6', label: 'Mobility', sublabel: '−6°', icon: <Gauge size={15} />, severity: 'HIGH' },
  { kind: 'obstruction', label: 'Terrain', sublabel: 'blocked', icon: <MapPinned size={15} />, severity: 'CRITICAL' },
]

export default function EmergencyPanel({
  missionActive,
  onInjectEmergency,
  roverPosition,
  roverProgress,
  currentRoute,
  recoveryLoading,
  appPhase,
}: EmergencyPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState(4)
  const isEmergencyActive =
    appPhase === 'emergency' || appPhase === 'replanning' || appPhase === 'recovery-ready'
  const canInject = missionActive && !recoveryLoading && !isEmergencyActive

  function buildEvent(): EmergencyEvent {
    const preset = PRESETS[selectedPreset]
    if (preset.kind === 'battery10' || preset.kind === 'battery25') {
      const loss = preset.kind === 'battery10' ? 10 : 25
      return {
        type: 'BATTERY_DEGRADATION',
        severity: preset.severity,
        description: `Battery degradation detected: ${loss}% state-of-charge loss`,
        battery_loss_percent: loss,
      }
    }

    if (preset.kind === 'mobility3' || preset.kind === 'mobility6') {
      const reduction = preset.kind === 'mobility3' ? 3 : 6
      return {
        type: 'REDUCED_MOBILITY',
        severity: preset.severity,
        description: `Wheel / suspension anomaly reduces maximum traversable slope by ${reduction}°`,
        slope_reduction_deg: reduction,
      }
    }

    const path = currentRoute?.path ?? []
    const startIdx = Math.max(0, Math.floor(roverProgress * Math.max(1, path.length - 1)) + 2)
    const blocked = path.slice(startIdx, startIdx + 5)
    const safeFallback = roverPosition
      ? [{ row: Math.min(99, roverPosition.row + 1), col: roverPosition.col }]
      : [{ row: 50, col: 50 }]

    return {
      type: 'TERRAIN_OBSTRUCTION',
      severity: 'CRITICAL',
      description: 'New terrain obstruction detected ahead; planned corridor is no longer available',
      obstructed_cells: blocked.length ? blocked : safeFallback,
    }
  }

  const selected = PRESETS[selectedPreset]
  const pathLen = currentRoute?.path.length ?? 0
  const progressIdx = Math.floor(roverProgress * Math.max(1, pathLen - 1))

  return (
    <div className="flex w-full bg-[#07111f]/80">
      {/* Mission telemetry */}
      <div className="w-64 flex-shrink-0 border-r border-white/[0.06] p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <Route size={13} className="text-cyan-electric" />
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Mission telemetry</p>
        </div>

        {currentRoute ? (
          <>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-2.5">
              <div className="mb-1.5 flex justify-between text-[9px] text-slate-400">
                <span>Traverse progress</span>
                <span className="font-mono text-cyan-electric">{(roverProgress * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ibm-blue to-cyan-electric transition-all duration-300"
                  style={{ width: `${roverProgress * 100}%` }}
                />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <MiniMetric label="Step" value={`${progressIdx}/${Math.max(pathLen - 1, 0)}`} />
                <MiniMetric label="Position" value={roverPosition ? `[${roverPosition.row},${roverPosition.col}]` : '—'} />
                <MiniMetric label="Distance" value={formatDistance(currentRoute.metrics.total_distance_m)} />
                <MiniMetric label="ETA" value={formatTime(currentRoute.metrics.estimated_time_hours)} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-3 text-[10px] text-slate-600">
            Start a selected route to activate live telemetry and emergency recovery.
          </div>
        )}
      </div>

      {/* Scenario injector */}
      <div className="flex-1 p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-warning" />
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Resilience test bench</p>
          </div>
          <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[8px] text-slate-600">
            Human-triggered simulation
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.kind}
              onClick={() => setSelectedPreset(i)}
              disabled={!canInject}
              className={`rounded-xl border px-2.5 py-2 text-left transition-all ${
                selectedPreset === i
                  ? 'border-amber-warning/45 bg-amber-warning/[0.09] shadow-[0_0_24px_rgba(245,158,11,0.08)]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <div className={`mb-1.5 ${selectedPreset === i ? 'text-amber-warning' : 'text-slate-500'}`}>
                {preset.icon}
              </div>
              <p className="text-[9px] font-semibold text-slate-300">{preset.label}</p>
              <p className="font-mono text-[9px] text-slate-600">{preset.sublabel}</p>
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[9px] text-slate-500">
            Selected: <span className="text-slate-300">{selected.label} {selected.sublabel}</span> · LunaGuard recomputes the remaining route under changed constraints.
          </p>
          <button
            onClick={() => onInjectEmergency(buildEvent())}
            disabled={!canInject}
            className={`min-w-[185px] rounded-xl border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
              canInject
                ? 'border-red-danger/45 bg-red-danger/10 text-red-300 hover:bg-red-danger/20 hover:shadow-[0_0_26px_rgba(239,68,68,0.14)] active:scale-[0.98]'
                : 'border-white/[0.05] bg-white/[0.02] text-slate-700'
            }`}
          >
            {recoveryLoading
              ? 'Replanning…'
              : !missionActive
                ? 'Start mission first'
                : isEmergencyActive
                  ? 'Scenario active'
                  : 'Inject scenario'}
          </button>
        </div>
      </div>

      {/* Event trace */}
      <div className="w-60 flex-shrink-0 border-l border-white/[0.06] p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <RadioTower size={13} className="text-violet-300" />
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Decision trace</p>
        </div>
        <div className="space-y-2">
          <LogEntry active={missionActive} label="Mission" value={missionActive ? 'Traverse active' : 'Awaiting start'} />
          <LogEntry active={roverProgress > 0} label="Telemetry" value={roverPosition ? `[${roverPosition.row}, ${roverPosition.col}]` : 'No fix'} />
          <LogEntry active={isEmergencyActive} alert label="Anomaly" value={isEmergencyActive ? selected.label : 'Nominal'} />
          <LogEntry active={appPhase === 'recovery-ready'} label="Recovery" value={appPhase === 'recovery-ready' ? 'Decision ready' : 'Standby'} />
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[7px] uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[9px] text-slate-300">{value}</p>
    </div>
  )
}

function LogEntry({
  active,
  alert,
  label,
  value,
}: {
  active: boolean
  alert?: boolean
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
          active ? (alert ? 'bg-red-danger shadow-[0_0_8px_#ef4444]' : 'bg-green-success') : 'bg-slate-700'
        }`}
      />
      <div className="min-w-0">
        <p className="text-[8px] uppercase tracking-wider text-slate-600">{label}</p>
        <p className="truncate text-[9px] text-slate-400">{value}</p>
      </div>
    </div>
  )
}
