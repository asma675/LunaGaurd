'use client'

import type { ReactNode } from 'react'

interface GlowButtonProps {
  children: ReactNode
  variant?: 'primary' | 'danger' | 'success' | 'secondary' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'bg-cyan-electric/15 text-cyan-electric border-cyan-electric/40 hover:bg-cyan-electric/25 shadow-glow-cyan',
  danger: 'bg-red-danger/15 text-red-danger border-red-danger/40 hover:bg-red-danger/25 shadow-glow-red',
  success: 'bg-green-success/15 text-green-success border-green-success/40 hover:bg-green-success/25 shadow-glow-green',
  secondary: 'bg-violet-accent/15 text-purple-300 border-violet-accent/40 hover:bg-violet-accent/25',
  warning: 'bg-amber-warning/15 text-amber-warning border-amber-warning/40 hover:bg-amber-warning/25',
}

const SIZE_STYLES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-[11px] rounded-lg',
  md: 'px-4 py-2 text-xs rounded-xl',
  lg: 'px-6 py-3 text-sm rounded-xl',
}

export default function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}: GlowButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        font-semibold border transition-all duration-200 active:scale-95
        flex items-center justify-center gap-2
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${className}
      `}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </>
      ) : children}
    </button>
  )
}
