'use client'

import type { MissionRequest, RoutePlanResponse, RouteProfile, AppPhase, ClickMode } from '@/lib/types'
import { profileLabel, profileColor, profileIcon } from '@/lib/utils'

interface MissionConfigPanelProps {
  missionConfig: MissionRequest
  appPhase: AppPhase
  clickMode: ClickMode
  onLoadDemo: () => void
  onReset: () => void
  onStartMission: () => void
  routePlan: RoutePlanResponse | null
  selectedRoute: RouteProfile
}

const PHASE_LABELS: Record<AppPhase, string> = {
  'idle': 'Idle',
  'loading-terrain': 'Loading Terrain',
  'ready': 'Ready',
  'planning': 'Planning...',
  'routes-ready': 'Routes Ready',
  'mission-active': 'Mission Active',
  'emergency': 'EMERGENCY',
  'replanning': 'Replanning...',
  'recovery-ready': 'Recovery Ready',
}

const PHASE_COLORS: Record<AppPhase, string> = {
  'idle': 'text-text-dim',
  'loading-terrain': 'text-amber-warning',
  'ready': 'text-text-muted',
  'planning': 'text-cyan-electric',
  'routes-ready': 'text-green-success',
  'mission-active': 'text-cyan-electric',
  'emergency': 'text-red-danger',
  'replanning': 'text-amber-warning',
  'recovery-ready': 'text-green-success',
}

export default function MissionConfigPanel({
  missionConfig,
  appPhase,
  clickMode,
  onLoadDemo,
  onReset,
  onStartMission,
  routePlan,
  selectedRoute,
}: MissionConfigPanelProps) {
  const isActive = appPhase === 'mission-active' || appPhase === 'emergency' || appPhase === 'recovery-ready'
  const canStart = appPhase === 'routes-ready' && routePlan !== null
  const isEmergency = appPhase === 'emergency' || appPhase === 'replanning' || appPhase === 'recovery-ready'

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🌙</span>
          <h1 className="text-sm font-bold tracking-widest uppercase text-white font-mono">
            LunaGuard
          </h1>
        </div>
        <p className="text-[10px] text-text-dim uppercase tracking-wider">
          Mission Planning Console
        </p>
      </div>

      {/* Phase indicator */}
      <div className="glass-card rounded-lg px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-text-dim">Status</span>
        <div className="flex items-center gap-1.5">
          {(appPhase === 'mission-active' || appPhase === 'planning' || appPhase === 'replanning') && (
            <span className="w-2 h-2 rounded-full bg-cyan-electric animate-pulse inline-block" />
          )}
          {appPhase === 'emergency' && (
            <span className="w-2 h-2 rounded-full bg-red-danger animate-pulse inline-block" />
          )}
          <span className={`text-xs font-medium font-mono ${PHASE_COLORS[appPhase]}`}>
            {PHASE_LABELS[appPhase]}
          </span>
        </div>
      </div>

      {/* Waypoints */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-text-dim">Waypoints</p>
        <WaypointDisplay
          label="START"
          point={missionConfig.start}
          color="#10b981"
          active={clickMode === 'set-start'}
        />
        <WaypointDisplay
          label="DEST"
          point={missionConfig.destination}
          color="#ef4444"
          active={clickMode === 'set-destination'}
        />
      </div>

      {/* Click instruction */}
      {(clickMode === 'set-start' || clickMode === 'set-destination') && (
        <div className="glass-card rounded border border-cyan-electric/20 px-3 py-2 text-[10px] text-cyan-electric animate-fade-in">
          {clickMode === 'set-start'
            ? '📍 Click terrain map to set start'
            : '🎯 Click terrain map to set destination'}
        </div>
      )}

      {/* Selected route indicator */}
      {routePlan && (
        <div
          className="glass-card rounded-lg px-3 py-2 border animate-fade-in"
          style={{ borderColor: profileColor(selectedRoute) + '40' }}
        >
          <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Selected Route</p>
          <div className="flex items-center gap-2">
            <span className="text-sm">{profileIcon(selectedRoute)}</span>
            <span className="text-xs font-medium" style={{ color: profileColor(selectedRoute) }}>
              {profileLabel(selectedRoute)}
            </span>
          </div>
        </div>
      )}

      {/* Emergency alert */}
      {isEmergency && (
        <div className="glass-card rounded-lg border border-red-danger/40 px-3 py-2 animate-fade-in glow-red">
          <div className="flex items-center gap-2">
            <span className="text-sm animate-pulse">⚠️</span>
            <div>
              <p className="text-xs font-bold text-red-danger">Emergency Active</p>
              <p className="text-[10px] text-text-muted">
                {appPhase === 'replanning' ? 'Computing recovery...' : 'Recovery route ready'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {canStart && (
          <button
            onClick={onStartMission}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-green-success/15 text-green-success border border-green-success/40 hover:bg-green-success/25 transition-all glow-green animate-fade-in"
          >
            🚀 Start Mission
          </button>
        )}

        <button
          onClick={onLoadDemo}
          disabled={isActive}
          className="w-full py-2 rounded-lg text-xs font-semibold bg-violet-accent/15 text-purple-300 border border-violet-accent/40 hover:bg-violet-accent/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Load Reference Mission
        </button>

        <button
          onClick={onReset}
          className="w-full py-2 rounded-lg text-xs font-medium text-text-muted border border-border-dim hover:border-text-muted hover:text-white transition-all"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  )
}

function WaypointDisplay({
  label,
  point,
  color,
  active,
}: {
  label: string
  point: { row: number; col: number }
  color: string
  active: boolean
}) {
  return (
    <div
      className={`glass-card rounded-lg px-3 py-2 flex items-center justify-between transition-all ${
        active ? 'border border-cyan-electric/40 animate-pulse-glow' : 'border border-border-dim'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
          style={{ borderColor: color, color, background: color + '20' }}
        >
          {label[0]}
        </span>
        <span className="text-[10px] font-medium text-text-muted">{label}</span>
      </div>
      <span className="text-[11px] font-mono text-white">
        [{point.row}, {point.col}]
      </span>
    </div>
  )
}
