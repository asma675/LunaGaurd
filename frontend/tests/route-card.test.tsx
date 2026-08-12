import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RouteCard from '@/components/routes/RouteCard'
import type { RouteResult } from '@/lib/types'

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeRoute(overrides: Partial<RouteResult> = {}): RouteResult {
  return {
    profile: 'SAFEST',
    path: [{ row: 20, col: 20 }, { row: 75, col: 78 }],
    metrics: {
      total_distance_m: 8400,
      estimated_time_hours: 4.67,
      energy_required_wh: 324,
      battery_reserve_percent: 67.6,
      max_slope_encountered_deg: 11.2,
      avg_hazard_score: 0.18,
      risk_score: 0.22,
      mission_success_score: 0.83,
      is_viable: true,
      path_length: 120,
    },
    score_breakdown: [
      {
        factor: 'Risk',
        weight: 0.4,
        raw_value: 0.22,
        normalized_value: 0.78,
        weighted_contribution: 0.312,
      },
      {
        factor: 'Energy',
        weight: 0.3,
        raw_value: 324,
        normalized_value: 0.65,
        weighted_contribution: 0.195,
      },
    ],
    is_recommended: false,
    recommendation_reason: 'Safest path with adequate battery reserve',
    warnings: [],
    hard_constraint_violations: [],
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RouteCard — viable route', () => {
  it('renders profile label', () => {
    render(
      <RouteCard
        route={makeRoute()}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.getByText('Safest Route')).toBeInTheDocument()
  })

  it('shows mission success score', () => {
    render(
      <RouteCard
        route={makeRoute()}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    // Success score 0.83 → 83 displayed in the ring
    expect(screen.getByText('83')).toBeInTheDocument()
  })

  it('does not show NOT VIABLE for viable route', () => {
    render(
      <RouteCard
        route={makeRoute({ metrics: { ...makeRoute().metrics, is_viable: true } })}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.queryByText('NOT VIABLE')).not.toBeInTheDocument()
  })
})

describe('RouteCard — non-viable route', () => {
  it('shows NOT VIABLE warning for non-viable route', () => {
    render(
      <RouteCard
        route={makeRoute({ metrics: { ...makeRoute().metrics, is_viable: false } })}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.getByText('⚠ NOT VIABLE')).toBeInTheDocument()
  })

  it('renders hard constraint violations', () => {
    render(
      <RouteCard
        route={makeRoute({
          metrics: { ...makeRoute().metrics, is_viable: false },
          hard_constraint_violations: ['Insufficient battery for route'],
        })}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.getByText(/Insufficient battery/)).toBeInTheDocument()
  })
})

describe('RouteCard — recommended badge', () => {
  it('shows recommended badge when isRecommended=true', () => {
    render(
      <RouteCard
        route={makeRoute()}
        isSelected={false}
        isRecommended={true}
        onClick={() => {}}
      />
    )
    expect(screen.getByText(/Recommended/)).toBeInTheDocument()
  })

  it('does not show recommended badge when isRecommended=false', () => {
    render(
      <RouteCard
        route={makeRoute()}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.queryByText(/Recommended/)).not.toBeInTheDocument()
  })

  it('shows correct profile icon for FASTEST', () => {
    render(
      <RouteCard
        route={makeRoute({ profile: 'FASTEST' })}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('shows correct profile icon for LOWEST_ENERGY', () => {
    render(
      <RouteCard
        route={makeRoute({ profile: 'LOWEST_ENERGY' })}
        isSelected={false}
        isRecommended={false}
        onClick={() => {}}
      />
    )
    expect(screen.getByText('🔋')).toBeInTheDocument()
  })
})
