'use client'

import type { AppPhase } from '@/lib/types'

interface RouteGenerateButtonProps {
  loading: boolean
  disabled: boolean
  onClick: () => void
  phase: AppPhase
}

export default function RouteGenerateButton({
  loading,
  disabled,
  onClick,
  phase,
}: RouteGenerateButtonProps) {
  const isSuccess = phase === 'routes-ready'

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full py-3 rounded-xl text-sm font-bold relative overflow-hidden transition-all duration-300
        ${
          loading
            ? 'bg-cyan-electric/10 text-cyan-electric border border-cyan-electric/30 cursor-not-allowed'
            : isSuccess
              ? 'bg-green-success/15 text-green-success border border-green-success/40 glow-green'
              : disabled
                ? 'bg-border-dim/40 text-text-dim border border-border-dim cursor-not-allowed opacity-50'
                : 'bg-cyan-electric/15 text-cyan-electric border border-cyan-electric/40 hover:bg-cyan-electric/25 hover:shadow-glow-cyan active:scale-95 glow-cyan'
        }
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Computing optimal paths…
        </span>
      ) : isSuccess ? (
        <span className="flex items-center justify-center gap-2">
          <span>✓</span> Routes Ready!
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Calculate Routes
        </span>
      )}

      {/* Shimmer on hover */}
      {!disabled && !loading && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 pointer-events-none" />
      )}
    </button>
  )
}
