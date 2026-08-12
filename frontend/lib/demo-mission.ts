import type { MissionRequest } from './types'

export const DEMO_MISSION: MissionRequest = {
  name: 'South Pole Survey Alpha',
  start: { row: 31, col: 7 },
  destination: { row: 17, col: 36 },
  rover: {
    battery_capacity_wh: 3000,
    battery_percent: 95,
    emergency_reserve_percent: 15,
    base_energy_per_metre: 0.05,
    max_slope_deg: 25,
    speed_mps: 0.5,
    risk_tolerance: 0.5,
  },
}

export const DEFAULT_ROVER_CONFIG = {
  battery_capacity_wh: 1000,
  battery_percent: 100,
  emergency_reserve_percent: 15,
  base_energy_per_metre: 0.05,
  max_slope_deg: 15,
  speed_mps: 0.5,
  risk_tolerance: 0.5,
}

export const DEFAULT_MISSION: MissionRequest = {
  name: 'New Mission',
  start: { row: 10, col: 10 },
  destination: { row: 80, col: 80 },
  rover: { ...DEFAULT_ROVER_CONFIG },
}
