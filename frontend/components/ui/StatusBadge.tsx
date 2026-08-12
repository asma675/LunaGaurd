'use client'

import type { AppPhase } from '@/lib/types'

interface StatusBadgeProps {
  phase: AppPhase
  size?: 'sm' | 'md'
}

const PHASE_CONFIG: Record<AppPhase, { label: string; color: string; bg: string; border: string; pulse?: boolean }> = {
  'idle': {
    label: 'Idle',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
    border: 'rgba(107,114,128,0.3)',
  },
  'loading-terrain': {
    label: 'Loading Terrain',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    pulse: true,
  },
  'ready': {
    label: 'Ready',
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.1)',
    border: 'rgba(156,163,175,0.2)',
  },
  'planning': {
    label: 'Planning',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.1)',
    border: 'rgba(0,212,255,0.3)',
    pulse: true,
  },
  'routes-ready': {
    label: 'Routes Ready',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
  },
  'mission-active': {
    label: 'Mission Active',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.1)',
    border: 'rgba(0,212,255,0.3)',
    pulse: true,
  },
  'emergency': {
    label: 'EMERGENCY',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.5)',
    pulse: true,
  },
  'replanning': {
    label: 'Replanning',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    pulse: true,
  },
  'recovery-ready': {
    label: 'Recovery Ready',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
  },
}

export default function StatusBadge({ phase, size = 'sm' }: StatusBadgeProps) {
  const cfg = PHASE_CONFIG[phase]
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[11px]'
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full ${px} ${textSize}
        font-medium uppercase tracking-wider border
      `}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.pulse ? 'animate-pulse' : ''}`}
        style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}
      />
      {cfg.label}
    </span>
  )
}
