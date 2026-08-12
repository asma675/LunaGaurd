'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import type { RouteResult } from '@/lib/types'
import { profileColor, profileLabel } from '@/lib/utils'

interface RouteMetricsChartProps {
  routes: RouteResult[]
}

function normalize(value: number, min: number, max: number, invert = false): number {
  if (max === min) return 0.5
  const n = (value - min) / (max - min)
  return invert ? 1 - n : n
}

export default function RouteMetricsChart({ routes }: RouteMetricsChartProps) {
  if (routes.length === 0) return null

  const allDist = routes.map(r => r.metrics.total_distance_m)
  const allEnergy = routes.map(r => r.metrics.energy_required_wh)
  const allRisk = routes.map(r => r.metrics.risk_score)
  const allSlope = routes.map(r => r.metrics.max_slope_encountered_deg)
  const allSuccess = routes.map(r => r.metrics.mission_success_score)
  const allReserve = routes.map(r => r.metrics.battery_reserve_percent)

  const data = [
    {
      axis: 'Speed',
      ...Object.fromEntries(
        routes.map(r => [
          r.profile,
          Math.round(
            normalize(r.metrics.total_distance_m, Math.min(...allDist), Math.max(...allDist), true) * 100
          ),
        ])
      ),
    },
    {
      axis: 'Energy Eff.',
      ...Object.fromEntries(
        routes.map(r => [
          r.profile,
          Math.round(
            normalize(r.metrics.energy_required_wh, Math.min(...allEnergy), Math.max(...allEnergy), true) * 100
          ),
        ])
      ),
    },
    {
      axis: 'Safety',
      ...Object.fromEntries(
        routes.map(r => [
          r.profile,
          Math.round(
            normalize(r.metrics.risk_score, Math.min(...allRisk), Math.max(...allRisk), true) * 100
          ),
        ])
      ),
    },
    {
      axis: 'Terrain',
      ...Object.fromEntries(
        routes.map(r => [
          r.profile,
          Math.round(
            normalize(r.metrics.max_slope_encountered_deg, Math.min(...allSlope), Math.max(...allSlope), true) * 100
          ),
        ])
      ),
    },
    {
      axis: 'Battery',
      ...Object.fromEntries(
        routes.map(r => [
          r.profile,
          Math.round(
            normalize(r.metrics.battery_reserve_percent, Math.min(...allReserve), Math.max(...allReserve), false) * 100
          ),
        ])
      ),
    },
    {
      axis: 'Success',
      ...Object.fromEntries(
        routes.map(r => [
          r.profile,
          Math.round(
            normalize(r.metrics.mission_success_score, Math.min(...allSuccess), Math.max(...allSuccess), false) * 100
          ),
        ])
      ),
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={data} margin={{ top: 4, right: 20, bottom: 4, left: 20 }}>
        <PolarGrid stroke="#1e2d45" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 9, fill: '#9ca3af' }}
        />
        <Tooltip
          contentStyle={{
            background: '#0d1526',
            border: '1px solid #1e2d45',
            borderRadius: '8px',
            fontSize: 10,
            color: '#f1f5f9',
          }}
          formatter={(v: number) => [`${v}`, '']}
        />
        {routes.map(r => (
          <Radar
            key={r.profile}
            name={profileLabel(r.profile)}
            dataKey={r.profile}
            stroke={profileColor(r.profile)}
            fill={profileColor(r.profile)}
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
        ))}
        <Legend
          iconSize={6}
          wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          formatter={(value) => (
            <span style={{ color: routes.find(r => profileLabel(r.profile) === value)
              ? profileColor(routes.find(r => profileLabel(r.profile) === value)!.profile)
              : '#9ca3af'
            }}>{value}</span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
