'use client'

import type { RouteResult } from '@/lib/types'

interface ScoreExplainerProps {
  route: RouteResult
}

export default function ScoreExplainer({ route }: ScoreExplainerProps) {
  const breakdown = route.score_breakdown ?? []
  const totalScore = route.metrics.mission_success_score

  return (
    <div className="mt-2 border-t border-border-dim pt-2 animate-fade-in">
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
        Score Breakdown — {(totalScore * 100).toFixed(1)} / 100
      </p>

      {/* Factor table */}
      <div className="space-y-1">
        {breakdown.map((item, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-text-muted w-28 truncate">{item.factor}</span>
                <span className="text-[9px] text-text-dim">w={item.weight.toFixed(2)}</span>
              </div>
              <span className="text-[10px] font-mono text-white">
                {(item.weighted_contribution * 100).toFixed(1)}
              </span>
            </div>
            {/* Bar */}
            <div className="h-1 bg-border-dim rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, item.normalized_value * 100)}%`,
                  background: item.weighted_contribution >= 0 ? '#10b981' : '#ef4444',
                }}
              />
            </div>
            {item.penalty && item.penalty > 0 && (
              <p className="text-[9px] text-red-danger">Penalty: −{(item.penalty * 100).toFixed(1)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Hard violations */}
      {route.hard_constraint_violations.length > 0 && (
        <div className="mt-2 space-y-0.5">
          <p className="text-[9px] uppercase tracking-wider text-red-danger font-semibold">Hard Violations</p>
          {route.hard_constraint_violations.map((v, i) => (
            <p key={i} className="text-[9px] text-red-danger bg-red-danger/10 rounded px-1.5 py-0.5">⛔ {v}</p>
          ))}
        </div>
      )}

      {/* Recommendation reason */}
      {route.recommendation_reason && (
        <div className="mt-2 p-2 rounded bg-card-dark border border-border-dim">
          <p className="text-[9px] text-text-muted">{route.recommendation_reason}</p>
        </div>
      )}
    </div>
  )
}
