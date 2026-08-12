'use client'

import { useState } from 'react'
import type { RoverConfig } from '@/lib/types'

interface RoverConstraintsFormProps {
  config: RoverConfig
  onChange: (config: RoverConfig) => void
  disabled?: boolean
}

interface FieldError {
  battery_percent?: string
  battery_capacity_wh?: string
  emergency_reserve_percent?: string
  max_slope_deg?: string
  speed_mps?: string
  risk_tolerance?: string
}

function validate(c: RoverConfig): FieldError {
  const errors: FieldError = {}
  if (c.battery_percent < 1 || c.battery_percent > 100) errors.battery_percent = '1–100%'
  if (c.battery_capacity_wh < 100 || c.battery_capacity_wh > 10000) errors.battery_capacity_wh = '100–10000 Wh'
  if (c.emergency_reserve_percent < 0 || c.emergency_reserve_percent > 50) errors.emergency_reserve_percent = '0–50%'
  if (c.max_slope_deg < 1 || c.max_slope_deg > 30) errors.max_slope_deg = '1–30°'
  if (c.speed_mps < 0.1 || c.speed_mps > 5) errors.speed_mps = '0.1–5 m/s'
  if (c.risk_tolerance < 0 || c.risk_tolerance > 1) errors.risk_tolerance = '0–1'
  return errors
}

export default function RoverConstraintsForm({
  config,
  onChange,
  disabled,
}: RoverConstraintsFormProps) {
  const [expanded, setExpanded] = useState(true)
  const errors = validate(config)

  function set<K extends keyof RoverConfig>(key: K, value: RoverConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-3">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-xs text-text-muted hover:text-white transition-colors mb-2"
      >
        <span className="uppercase tracking-wider font-medium">🛸 Rover Constraints</span>
        <span className="text-text-dim">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="space-y-3 animate-fade-in">
          {/* Battery Capacity */}
          <SliderField
            label="Battery Capacity"
            unit="Wh"
            value={config.battery_capacity_wh}
            min={100} max={5000} step={50}
            onChange={v => set('battery_capacity_wh', v)}
            disabled={disabled}
            error={errors.battery_capacity_wh}
          />

          {/* Battery Level */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-text-dim uppercase tracking-wider">Battery Level</label>
              <span className="text-[10px] font-mono text-white">{config.battery_percent}%</span>
            </div>
            <div className="relative">
              <div className="h-2 bg-border-dim rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${config.battery_percent}%`,
                    background: config.battery_percent > 50
                      ? '#10b981'
                      : config.battery_percent > 25
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                />
              </div>
              <input
                type="range"
                min={1} max={100} step={1}
                value={config.battery_percent}
                disabled={disabled}
                onChange={e => set('battery_percent', Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            {errors.battery_percent && (
              <p className="text-[9px] text-red-danger">{errors.battery_percent}</p>
            )}
          </div>

          {/* Emergency Reserve */}
          <SliderField
            label="Emergency Reserve"
            unit="%"
            value={config.emergency_reserve_percent}
            min={0} max={50} step={1}
            onChange={v => set('emergency_reserve_percent', v)}
            disabled={disabled}
            error={errors.emergency_reserve_percent}
            color="#f59e0b"
          />

          {/* Max Slope */}
          <SliderField
            label="Max Slope"
            unit="°"
            value={config.max_slope_deg}
            min={1} max={30} step={0.5}
            onChange={v => set('max_slope_deg', v)}
            disabled={disabled}
            error={errors.max_slope_deg}
            color="#7c3aed"
          />

          {/* Speed */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-text-dim uppercase tracking-wider">Speed</label>
              <input
                type="number"
                min={0.1} max={5} step={0.1}
                value={config.speed_mps}
                disabled={disabled}
                onChange={e => set('speed_mps', Number(e.target.value))}
                className="w-16 text-right text-[11px] font-mono bg-card-dark border border-border-dim rounded px-1 py-0.5 text-white focus:border-cyan-electric/60 focus:outline-none disabled:opacity-50"
              />
            </div>
            <p className="text-[9px] text-text-dim">m/s (0.1 – 5)</p>
            {errors.speed_mps && <p className="text-[9px] text-red-danger">{errors.speed_mps}</p>}
          </div>

          {/* Risk Tolerance */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-text-dim uppercase tracking-wider">Risk Tolerance</label>
              <span className="text-[10px] font-mono text-white">{config.risk_tolerance.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={config.risk_tolerance}
              disabled={disabled}
              onChange={e => set('risk_tolerance', Number(e.target.value))}
              className="w-full disabled:opacity-50"
            />
            <div className="flex justify-between text-[9px] text-text-dim">
              <span>Aggressive</span>
              <span>Cautious</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SliderField({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  error,
  color = '#00d4ff',
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
  error?: string
  color?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-text-dim uppercase tracking-wider">{label}</label>
        <span className="text-[11px] font-mono" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full disabled:opacity-50"
        style={{ accentColor: color }}
      />
      {error && <p className="text-[9px] text-red-danger">{error}</p>}
    </div>
  )
}
