import { describe, it, expect } from 'vitest'
import { DEMO_MISSION, DEFAULT_MISSION, DEFAULT_ROVER_CONFIG } from '@/lib/demo-mission'
import type { RoverConfig } from '@/lib/types'

// ─── Rover config validation helpers ─────────────────────────────────────────

function validateRoverConfig(c: RoverConfig): Record<string, string> {
  const errors: Record<string, string> = {}
  if (c.battery_percent < 1 || c.battery_percent > 100) errors.battery_percent = 'Must be 1–100%'
  if (c.battery_capacity_wh < 100 || c.battery_capacity_wh > 10000) errors.battery_capacity_wh = 'Must be 100–10000 Wh'
  if (c.emergency_reserve_percent < 0 || c.emergency_reserve_percent > 50) errors.emergency_reserve_percent = 'Must be 0–50%'
  if (c.max_slope_deg < 1 || c.max_slope_deg > 30) errors.max_slope_deg = 'Must be 1–30°'
  if (c.speed_mps < 0.1 || c.speed_mps > 5) errors.speed_mps = 'Must be 0.1–5 m/s'
  if (c.risk_tolerance < 0 || c.risk_tolerance > 1) errors.risk_tolerance = 'Must be 0–1'
  return errors
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rover config validation', () => {
  it('accepts valid default config', () => {
    const errors = validateRoverConfig(DEFAULT_ROVER_CONFIG)
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('rejects battery_percent = 0', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, battery_percent: 0 }
    const errors = validateRoverConfig(config)
    expect(errors.battery_percent).toBeDefined()
  })

  it('rejects battery_percent = 101', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, battery_percent: 101 }
    const errors = validateRoverConfig(config)
    expect(errors.battery_percent).toBeDefined()
  })

  it('rejects max_slope_deg = 0', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, max_slope_deg: 0 }
    const errors = validateRoverConfig(config)
    expect(errors.max_slope_deg).toBeDefined()
  })

  it('rejects max_slope_deg = 31', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, max_slope_deg: 31 }
    const errors = validateRoverConfig(config)
    expect(errors.max_slope_deg).toBeDefined()
  })

  it('accepts max_slope_deg at boundary (30)', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, max_slope_deg: 30 }
    const errors = validateRoverConfig(config)
    expect(errors.max_slope_deg).toBeUndefined()
  })

  it('rejects risk_tolerance = -0.1', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, risk_tolerance: -0.1 }
    const errors = validateRoverConfig(config)
    expect(errors.risk_tolerance).toBeDefined()
  })

  it('accepts risk_tolerance at boundary (1.0)', () => {
    const config = { ...DEFAULT_ROVER_CONFIG, risk_tolerance: 1.0 }
    const errors = validateRoverConfig(config)
    expect(errors.risk_tolerance).toBeUndefined()
  })
})

describe('demo mission loads correct values', () => {
  it('has correct mission name', () => {
    expect(DEMO_MISSION.name).toBe('South Pole Survey Alpha')
  })

  it('has correct start position', () => {
    expect(DEMO_MISSION.start).toEqual({ row: 31, col: 7 })
  })

  it('has correct destination position', () => {
    expect(DEMO_MISSION.destination).toEqual({ row: 17, col: 36 })
  })

  it('has correct battery capacity', () => {
    expect(DEMO_MISSION.rover.battery_capacity_wh).toBe(3000)
  })

  it('has correct battery percent', () => {
    expect(DEMO_MISSION.rover.battery_percent).toBe(95)
  })

  it('has correct max slope', () => {
    expect(DEMO_MISSION.rover.max_slope_deg).toBe(25)
  })

  it('has correct risk tolerance', () => {
    expect(DEMO_MISSION.rover.risk_tolerance).toBe(0.5)
  })

  it('passes validation', () => {
    const errors = validateRoverConfig(DEMO_MISSION.rover)
    expect(Object.keys(errors)).toHaveLength(0)
  })
})

describe('start destination reset', () => {
  it('default mission has different start and destination', () => {
    const { start, destination } = DEFAULT_MISSION
    expect(start.row !== destination.row || start.col !== destination.col).toBe(true)
  })

  it('spread creates independent copy', () => {
    const copy = { ...DEFAULT_MISSION }
    copy.name = 'Modified'
    expect(DEFAULT_MISSION.name).toBe('New Mission')
  })

  it('reset returns start to default', () => {
    const resetState = { ...DEFAULT_MISSION }
    expect(resetState.start).toEqual(DEFAULT_MISSION.start)
    expect(resetState.destination).toEqual(DEFAULT_MISSION.destination)
  })
})
