'use client'

import type { RoutePlanResponse, RouteProfile, RouteResult } from '@/lib/types'
import {
  profileLabel, profileIcon, profileColor,
  formatDistance, formatTime, formatEnergy,
  riskHexColor, successHexColor,
} from '@/lib/utils'
import RouteCard from './RouteCard'
import RouteMetricsChart from '@/components/charts/RouteMetricsChart'
import BatteryChart from '@/components/charts/BatteryChart'
import GraniteBriefCard from '@/components/ai/GraniteBriefCard'

interface RouteComparisonPanelProps {
  routePlan: RoutePlanResponse
  selectedRoute: RouteProfile
  onSelectRoute: (p: RouteProfile) => void
  onDownload: () => void
}

export default function RouteComparisonPanel({
  routePlan,
  selectedRoute,
  onSelectRoute,
  onDownload,
}: RouteComparisonPanelProps) {
  const selected = routePlan.routes.find(r => r.profile === selectedRoute)

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-border-dim flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Route Analysis</h2>
            <p className="text-[10px] text-text-dim mt-0.5">{routePlan.mission_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-dim font-mono">
              {routePlan.planning_time_ms}ms
            </span>
            <button
              onClick={onDownload}
              className="text-[10px] text-text-dim hover:text-cyan-electric transition-colors px-2 py-1 rounded border border-border-dim hover:border-cyan-electric/40"
            >
              ↓ Export
            </button>
          </div>
        </div>

        {/* Recommended route callout */}
        <div
          className="mt-2 rounded-lg px-3 py-2 border text-[10px] animate-fade-in"
          style={{
            borderColor: profileColor(routePlan.recommended_profile) + '40',
            background: profileColor(routePlan.recommended_profile) + '0d',
          }}
        >
          <span className="font-semibold" style={{ color: profileColor(routePlan.recommended_profile) }}>
            {profileIcon(routePlan.recommended_profile)} {profileLabel(routePlan.recommended_profile)}
          </span>
          <span className="text-text-muted ml-1">is recommended</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* IBM watsonx / Granite mission brief */}
        <GraniteBriefCard routePlan={routePlan} />

        {/* Route cards */}
        {routePlan.routes.map(route => (
          <RouteCard
            key={route.profile}
            route={route}
            isSelected={route.profile === selectedRoute}
            isRecommended={route.profile === routePlan.recommended_profile}
            onClick={() => onSelectRoute(route.profile)}
          />
        ))}

        {/* Radar chart */}
        <div className="glass-card rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-dim mb-2">Route Comparison</p>
          <RouteMetricsChart routes={routePlan.routes} />
        </div>

        {/* Battery chart for selected */}
        {selected && (
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-dim mb-2">
              Battery Profile — {profileLabel(selectedRoute)}
            </p>
            <BatteryChart route={selected} />
          </div>
        )}

        {/* Comparison table */}
        <ComparisonTable routes={routePlan.routes} selectedRoute={selectedRoute} />
      </div>
    </div>
  )
}

function ComparisonTable({
  routes,
  selectedRoute,
}: {
  routes: RouteResult[]
  selectedRoute: RouteProfile
}) {
  const metrics: Array<{
    key: keyof RouteResult['metrics']
    label: string
    fmt: (v: number) => string
    lowerIsBetter?: boolean
  }> = [
    { key: 'total_distance_m', label: 'Distance', fmt: v => formatDistance(v) },
    { key: 'estimated_time_hours', label: 'Time', fmt: v => formatTime(v) },
    { key: 'energy_required_wh', label: 'Energy', fmt: v => formatEnergy(v), lowerIsBetter: true },
    { key: 'battery_reserve_percent', label: 'Reserve', fmt: v => `${v.toFixed(1)}%` },
    { key: 'max_slope_encountered_deg', label: 'Max Slope', fmt: v => `${v.toFixed(1)}°`, lowerIsBetter: true },
    { key: 'risk_score', label: 'Risk', fmt: v => `${(v * 100).toFixed(0)}%`, lowerIsBetter: true },
    { key: 'mission_success_score', label: 'Success', fmt: v => `${(v * 100).toFixed(1)}` },
  ]

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border-dim">
        <p className="text-[10px] uppercase tracking-wider text-text-dim">Metric Comparison</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-dim">
              <th className="text-[9px] text-text-dim text-left px-3 py-1.5 uppercase tracking-wider">Metric</th>
              {routes.map(r => (
                <th key={r.profile} className="text-[9px] px-2 py-1.5 text-center">
                  <span style={{ color: profileColor(r.profile) }}>{profileIcon(r.profile)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => {
              const values = routes.map(r => r.metrics[m.key] as number)
              const best = m.lowerIsBetter ? Math.min(...values) : Math.max(...values)
              const worst = m.lowerIsBetter ? Math.max(...values) : Math.min(...values)
              return (
                <tr key={m.key} className="border-b border-border-dim/40">
                  <td className="text-[9px] text-text-dim px-3 py-1.5">{m.label}</td>
                  {routes.map(r => {
                    const v = r.metrics[m.key] as number
                    const isBest = v === best
                    const isWorst = v === worst
                    return (
                      <td key={r.profile} className="text-center px-2 py-1.5">
                        <span
                          className={`text-[10px] font-mono ${
                            isBest ? 'text-green-success font-semibold' :
                            isWorst ? 'text-red-danger' : 'text-white'
                          }`}
                        >
                          {m.fmt(v)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
