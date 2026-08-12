'use client'

import { useState } from 'react'
import type { RouteResult } from '@/lib/types'
import {
  profileLabel, profileIcon, profileColor,
  formatDistance, formatTime, formatEnergy,
  riskHexColor, successHexColor,
} from '@/lib/utils'
import ScoreExplainer from './ScoreExplainer'

interface RouteCardProps {
  route: RouteResult
  isSelected: boolean
  isRecommended: boolean
  onClick: () => void
}

export default function RouteCard({ route, isSelected, isRecommended, onClick }: RouteCardProps) {
  const [showExplainer, setShowExplainer] = useState(false)
  const color = profileColor(route.profile)
  const successScore = route.metrics.mission_success_score
  const riskScore = route.metrics.risk_score
  const successPct = Math.round(successScore * 100)
  const circumference = 2 * Math.PI * 20
  const dash = (successPct / 100) * circumference

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl p-3 cursor-pointer transition-all duration-200 border
        ${isSelected
          ? 'border-opacity-60 shadow-lg'
          : 'border-border-dim hover:border-opacity-40 hover:translate-y-[-1px]'
        }
        ${!route.metrics.is_viable ? 'opacity-75' : ''}
      `}
      style={{
        borderColor: isSelected ? color : undefined,
        background: isSelected ? color + '0a' : 'rgba(17,24,39,0.6)',
        boxShadow: isSelected ? `0 0 16px ${color}22` : undefined,
      }}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div
          className="absolute -top-2 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ background: color, color: '#000' }}
        >
          ★ Recommended
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{profileIcon(route.profile)}</span>
          <div>
            <p className="text-xs font-semibold text-white">{profileLabel(route.profile)}</p>
            {!route.metrics.is_viable && (
              <p className="text-[9px] text-red-danger font-medium">⚠ NOT VIABLE</p>
            )}
          </div>
        </div>

        {/* Success Score Ring */}
        <div className="relative flex items-center justify-center w-12 h-12">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#1e2d45" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke={successHexColor(successScore)}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="text-center z-10">
            <p className="text-[10px] font-bold font-mono leading-tight" style={{ color: successHexColor(successScore) }}>
              {successPct}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
        <MetricRow label="Distance" value={formatDistance(route.metrics.total_distance_m)} />
        <MetricRow label="Time" value={formatTime(route.metrics.estimated_time_hours)} />
        <MetricRow label="Energy" value={formatEnergy(route.metrics.energy_required_wh)} />
        <MetricRow
          label="Reserve"
          value={`${route.metrics.battery_reserve_percent.toFixed(1)}%`}
          color={route.metrics.battery_reserve_percent < 15 ? '#ef4444' : '#10b981'}
        />
        <MetricRow
          label="Max Slope"
          value={`${route.metrics.max_slope_encountered_deg.toFixed(1)}°`}
        />
        <MetricRow
          label="Risk"
          value={`${(riskScore * 100).toFixed(0)}%`}
          color={riskHexColor(riskScore)}
        />
      </div>

      {/* Violations */}
      {route.hard_constraint_violations.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {route.hard_constraint_violations.map((v, i) => (
            <p key={i} className="text-[9px] text-red-danger bg-red-danger/10 rounded px-2 py-0.5">
              ⛔ {v}
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {route.warnings.length > 0 && !showExplainer && (
        <div className="mb-2">
          <p className="text-[9px] text-amber-warning/80 truncate">⚠ {route.warnings[0]}</p>
        </div>
      )}

      {/* Explainer toggle */}
      <button
        onClick={e => { e.stopPropagation(); setShowExplainer(s => !s) }}
        className="text-[10px] text-text-dim hover:text-white transition-colors flex items-center gap-1"
      >
        {showExplainer ? '▲ Hide' : '▼ How scored'}
      </button>

      {showExplainer && (
        <div onClick={e => e.stopPropagation()}>
          <ScoreExplainer route={route} />
        </div>
      )}
    </div>
  )
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[9px] text-text-dim uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-mono font-medium" style={{ color: color || '#f1f5f9' }}>
        {value}
      </p>
    </div>
  )
}
