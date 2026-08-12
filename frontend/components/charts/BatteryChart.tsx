'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { RouteResult } from '@/lib/types'

interface BatteryChartProps {
  route: RouteResult
  emergencyPoint?: number // distance in metres where emergency occurred
}

export default function BatteryChart({ route, emergencyPoint }: BatteryChartProps) {
  const { metrics } = route
  const distance = metrics.total_distance_m
  const startBattery = 95 // approximate starting battery
  const endBattery = metrics.battery_reserve_percent
  const reserve = 15

  // Build data points: simulate linear consumption along path
  const N = 20
  const data = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N
    const distKm = (t * distance) / 1000
    const battery = startBattery - t * (startBattery - endBattery)
    return {
      dist: Number(distKm.toFixed(2)),
      battery: Number(battery.toFixed(1)),
      reserve,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4540" vertical={false} />
        <XAxis
          dataKey="dist"
          tick={{ fontSize: 9, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}km`}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: '#0d1526',
            border: '1px solid #1e2d45',
            borderRadius: '8px',
            fontSize: 10,
            color: '#f1f5f9',
          }}
          formatter={(value: number, name: string) => [
            `${value.toFixed(1)}%`,
            name === 'battery' ? 'Battery' : 'Reserve',
          ]}
          labelFormatter={v => `${v} km`}
        />
        {/* Reserve dashed line */}
        <ReferenceLine
          y={reserve}
          stroke="#f59e0b"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: 'Reserve', fontSize: 8, fill: '#f59e0b', position: 'right' }}
        />
        {/* Emergency marker */}
        {emergencyPoint && (
          <ReferenceLine
            x={emergencyPoint / 1000}
            stroke="#ef4444"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            label={{ value: 'Emergency', fontSize: 8, fill: '#ef4444', position: 'top' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="battery"
          stroke="#00d4ff"
          strokeWidth={2}
          fill="url(#battGrad)"
          dot={false}
          activeDot={{ r: 3, fill: '#00d4ff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
