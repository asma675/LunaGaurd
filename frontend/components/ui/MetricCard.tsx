'use client'

import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: string
  color?: string
  trend?: 'up' | 'down' | 'flat'
  trendColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_VALUE: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
}

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  color = '#f1f5f9',
  trend,
  trendColor,
  size = 'md',
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`glass-card rounded-xl p-3 flex flex-col gap-1 ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-text-dim font-medium">{label}</p>
        {icon && <span className="text-sm">{icon}</span>}
        {trend && (
          <span
            className={`text-[10px] font-mono ${trendColor || (trend === 'up' ? 'text-green-success' : trend === 'down' ? 'text-red-danger' : 'text-text-dim')}`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono font-bold tabular-nums ${SIZE_VALUE[size]}`}
          style={{ color }}
        >
          {value}
        </span>
        {unit && <span className="text-[10px] text-text-dim">{unit}</span>}
      </div>
    </div>
  )
}
