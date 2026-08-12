'use client'

import type { RecoveryResult, EmergencyEvent } from '@/lib/types'
import { formatDistance, formatEnergy, riskHexColor, successHexColor } from '@/lib/utils'

interface RecoveryComparisonProps {
  recovery: RecoveryResult
  emergency: EmergencyEvent
  onDownload: () => void
}

interface Delta {
  label: string
  original: string
  recovered: string
  delta: string
  deltaColor: string
  arrow: string
}

export default function RecoveryComparison({
  recovery,
  emergency,
  onDownload,
}: RecoveryComparisonProps) {
  const orig = recovery.original_route.metrics
  const rec = recovery.recovery_route.metrics

  const deltas: Delta[] = [
    {
      label: 'Mission Success',
      original: `${(orig.mission_success_score * 100).toFixed(1)}`,
      recovered: `${(rec.mission_success_score * 100).toFixed(1)}`,
      delta: `${((rec.mission_success_score - orig.mission_success_score) * 100).toFixed(1)}`,
      deltaColor: rec.mission_success_score >= orig.mission_success_score ? '#10b981' : '#f59e0b',
      arrow: rec.mission_success_score >= orig.mission_success_score ? '↑' : '↓',
    },
    {
      label: 'Risk Score',
      original: `${(orig.risk_score * 100).toFixed(0)}%`,
      recovered: `${(rec.risk_score * 100).toFixed(0)}%`,
      delta: `${((rec.risk_score - orig.risk_score) * 100).toFixed(1)}%`,
      deltaColor: rec.risk_score <= orig.risk_score ? '#10b981' : '#ef4444',
      arrow: rec.risk_score <= orig.risk_score ? '↓' : '↑',
    },
    {
      label: 'Battery Reserve',
      original: `${orig.battery_reserve_percent.toFixed(1)}%`,
      recovered: `${rec.battery_reserve_percent.toFixed(1)}%`,
      delta: `${(rec.battery_reserve_percent - orig.battery_reserve_percent).toFixed(1)}%`,
      deltaColor: rec.battery_reserve_percent >= orig.battery_reserve_percent ? '#10b981' : '#ef4444',
      arrow: rec.battery_reserve_percent >= orig.battery_reserve_percent ? '↑' : '↓',
    },
    {
      label: 'Distance',
      original: formatDistance(orig.total_distance_m),
      recovered: formatDistance(rec.total_distance_m),
      delta: formatDistance(Math.abs(rec.total_distance_m - orig.total_distance_m)),
      deltaColor: '#9ca3af',
      arrow: rec.total_distance_m > orig.total_distance_m ? '+' : '−',
    },
    {
      label: 'Max Slope',
      original: `${orig.max_slope_encountered_deg.toFixed(1)}°`,
      recovered: `${rec.max_slope_encountered_deg.toFixed(1)}°`,
      delta: `${Math.abs(rec.max_slope_encountered_deg - orig.max_slope_encountered_deg).toFixed(1)}°`,
      deltaColor: rec.max_slope_encountered_deg <= orig.max_slope_encountered_deg ? '#10b981' : '#f59e0b',
      arrow: rec.max_slope_encountered_deg <= orig.max_slope_encountered_deg ? '↓' : '↑',
    },
    {
      label: 'Energy',
      original: formatEnergy(orig.energy_required_wh),
      recovered: formatEnergy(rec.energy_required_wh),
      delta: formatEnergy(Math.abs(rec.energy_required_wh - orig.energy_required_wh)),
      deltaColor: rec.energy_required_wh <= orig.energy_required_wh ? '#10b981' : '#f59e0b',
      arrow: rec.energy_required_wh <= orig.energy_required_wh ? '↓' : '↑',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-red-danger/30 bg-red-danger/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">⚠️</span>
            <div>
              <h2 className="text-xs font-bold text-red-danger uppercase tracking-wider">
                Emergency Recovery
              </h2>
              <p className="text-[10px] text-text-muted">{emergency.description}</p>
            </div>
          </div>
          <button
            onClick={onDownload}
            className="text-[10px] text-text-dim hover:text-cyan-electric transition-colors px-2 py-1 rounded border border-border-dim hover:border-cyan-electric/40"
          >
            ↓ Export
          </button>
        </div>
      </div>

      {/* Recovery banner */}
      {recovery.recovery_viable && (
        <div className="mx-3 mt-3 rounded-lg border border-green-success/40 bg-green-success/10 px-3 py-2 flex items-center gap-2 animate-fade-in">
          <span>✅</span>
          <p className="text-xs font-semibold text-green-success">Recovery Route Activated</p>
        </div>
      )}
      {!recovery.recovery_viable && (
        <div className="mx-3 mt-3 rounded-lg border border-red-danger/40 bg-red-danger/10 px-3 py-2 flex items-center gap-2 animate-fade-in">
          <span>❌</span>
          <p className="text-xs font-semibold text-red-danger">No Viable Recovery Route</p>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-4 gap-2 text-[9px] uppercase tracking-wider text-text-dim px-1">
          <span>Metric</span>
          <span className="text-center">Before</span>
          <span className="text-center">After</span>
          <span className="text-center">Δ Change</span>
        </div>

        {/* Delta rows */}
        <div className="glass-card rounded-xl overflow-hidden">
          {deltas.map((d, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 gap-2 px-3 py-2 items-center ${
                i < deltas.length - 1 ? 'border-b border-border-dim/40' : ''
              }`}
            >
              <p className="text-[10px] text-text-muted">{d.label}</p>
              <p className="text-[11px] font-mono text-center text-white">{d.original}</p>
              <p className="text-[11px] font-mono text-center font-semibold" style={{ color: d.deltaColor }}>
                {d.recovered}
              </p>
              <div className="text-center">
                <span className="text-[10px] font-mono" style={{ color: d.deltaColor }}>
                  {d.arrow} {d.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div className="glass-card rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-dim mb-1.5">AI Explanation</p>
          <p className="text-[11px] text-text-muted leading-relaxed">{recovery.explanation}</p>
        </div>

        {/* Emergency summary */}
        <div className="glass-card rounded-xl p-3 border border-amber-warning/20">
          <p className="text-[10px] uppercase tracking-wider text-amber-warning mb-1.5">Emergency Summary</p>
          <p className="text-[11px] text-text-muted leading-relaxed">{recovery.emergency_summary}</p>
        </div>

        {/* Planning time */}
        <p className="text-[10px] text-text-dim text-right font-mono">
          Replanned in {recovery.planning_time_ms}ms
        </p>
      </div>
    </div>
  )
}
