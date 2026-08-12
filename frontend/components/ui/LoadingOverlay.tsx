'use client'

import { useEffect, useState } from 'react'

interface LoadingOverlayProps {
  message?: string
  fullScreen?: boolean
}

const MESSAGES = [
  'Scanning lunar surface…',
  'Analyzing elevation data…',
  'Computing traversal paths…',
  'Evaluating energy profiles…',
  'Assessing risk factors…',
  'Applying terrain constraints…',
]

export default function LoadingOverlay({
  message,
  fullScreen = false,
}: LoadingOverlayProps) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d + 1) % 4)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  const displayMessage = message || MESSAGES[msgIdx]

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-6
        ${fullScreen
          ? 'fixed inset-0 z-50 bg-space-dark/90 backdrop-blur-sm'
          : 'absolute inset-0 z-10 bg-space-dark/80 backdrop-blur-sm'
        }
        animate-fade-in
      `}
    >
      {/* Animated lunar scan */}
      <div className="relative w-48 h-48">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-electric/20 animate-pulse" />
        {/* Middle ring */}
        <div className="absolute inset-4 rounded-full border border-cyan-electric/30" />
        {/* Inner ring */}
        <div className="absolute inset-8 rounded-full border border-cyan-electric/50 animate-spin-slow" />
        {/* Center */}
        <div className="absolute inset-12 rounded-full bg-cyan-electric/10 flex items-center justify-center">
          <span className="text-3xl animate-float">🌙</span>
        </div>

        {/* Scan line */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute left-0 right-0 h-0.5 bg-cyan-electric/60"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              animation: 'scan-line 2s linear infinite',
              boxShadow: '0 0 8px rgba(0, 212, 255, 0.8)',
            }}
          />
        </div>

        {/* Corner dots */}
        {[0, 90, 180, 270].map(deg => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full bg-cyan-electric"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(70px) translateY(-50%)`,
              boxShadow: '0 0 6px rgba(0, 212, 255, 0.8)',
              animation: `pulse-glow ${1.5 + deg / 360}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-cyan-electric font-mono">
          {displayMessage}
          <span className="inline-block w-6">{'.'.repeat(dots)}</span>
        </p>
        <p className="text-[11px] text-text-dim">LunaGuard AI Route Planner</p>
      </div>
    </div>
  )
}
