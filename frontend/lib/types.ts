// ─── Primitives ──────────────────────────────────────────────────────────────

export interface GridPoint {
  row: number
  col: number
}

// ─── Rover & Mission ─────────────────────────────────────────────────────────

export interface RoverConfig {
  battery_capacity_wh: number
  battery_percent: number
  emergency_reserve_percent: number
  base_energy_per_metre: number
  max_slope_deg: number
  speed_mps: number
  risk_tolerance: number
}

export interface MissionRequest {
  name: string
  start: GridPoint
  destination: GridPoint
  rover: RoverConfig
}

// ─── Route Profiles ──────────────────────────────────────────────────────────

export type RouteProfile = 'FASTEST' | 'LOWEST_ENERGY' | 'SAFEST'

// ─── Route Results ───────────────────────────────────────────────────────────

/** UI-friendly metrics. Scores are normalized to 0..1 in the frontend adapter. */
export interface RouteMetrics {
  total_distance_m: number
  estimated_time_hours: number
  energy_required_wh: number
  battery_reserve_percent: number
  max_slope_encountered_deg: number
  avg_hazard_score: number
  risk_score: number
  mission_success_score: number
  is_viable: boolean
  path_length: number
}

export interface ScoreBreakdown {
  factor: string
  weight: number
  raw_value: number
  normalized_value: number
  weighted_contribution: number
  penalty?: number
  description?: string
}

export interface RouteResult {
  profile: RouteProfile
  path: GridPoint[]
  metrics: RouteMetrics
  score_breakdown: ScoreBreakdown[]
  is_recommended: boolean
  recommendation_reason: string
  warnings: string[]
  hard_constraint_violations: string[]
}

export interface RoutePlanResponse {
  mission_name: string
  routes: RouteResult[]
  recommended_profile: RouteProfile
  planning_time_ms: number
  terrain_metadata: TerrainMetadata
}

// ─── Emergency & Recovery ────────────────────────────────────────────────────

export type EmergencyType =
  | 'BATTERY_DEGRADATION'
  | 'REDUCED_MOBILITY'
  | 'TERRAIN_OBSTRUCTION'

export interface EmergencyEvent {
  type: EmergencyType
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  battery_loss_percent?: number
  slope_reduction_deg?: number
  obstructed_cells?: GridPoint[]
}

export interface ReassessRequest {
  original_mission: MissionRequest
  active_route: RouteResult
  current_position: GridPoint
  emergency_event: EmergencyEvent
}

export interface RecoveryResult {
  original_route: RouteResult
  recovery_route: RouteResult
  emergency_summary: string
  delta_distance_m: number
  delta_energy_wh: number
  delta_risk_score: number
  recovery_viable: boolean
  explanation: string
  planning_time_ms: number
  recommendation: 'FOLLOW_RECOVERY_ROUTE' | 'CONTINUE_ORIGINAL' | 'ABORT'
}

// ─── Terrain ─────────────────────────────────────────────────────────────────

export interface TerrainMetadata {
  rows: number
  cols: number
  cell_size_m: number
  elevation_min: number
  elevation_max: number
  slope_min: number
  slope_max: number
  hazard_min: number
  hazard_max: number
  total_area_km2: number
  seed: number
  data_source?: string
  is_synthetic?: boolean
  processing_date?: string
}

export interface TerrainCell {
  row: number
  col: number
  elevation: number
  slope: number
  roughness?: number
  hazard_score: number
  traversable?: boolean
}

export interface TerrainGrid {
  metadata: TerrainMetadata
  cells: TerrainCell[][]
}

// ─── IBM watsonx / Granite ───────────────────────────────────────────────────

export interface AiStatus {
  provider: string
  model_id: string
  enabled: boolean
  mode: 'watsonx' | 'deterministic-fallback'
  guardrails: string[]
}

export interface MissionBrief {
  provider: string
  model_id: string
  source: 'watsonx-granite' | 'deterministic-fallback'
  brief: string
  guardrails: string[]
  evidence: Record<string, number | string | boolean>
}

export interface KnowledgeSource {
  id: string
  agency: string
  title: string
  url: string
  kind: string
  status: 'authoritative' | 'live' | 'offline-fallback' | string
  summary: string
}

export interface CopilotResponse {
  provider: string
  model_id: string
  source: 'watsonx-granite' | 'deterministic-fallback'
  answer: string
  citations: KnowledgeSource[]
  guardrails: string[]
}

export interface VoiceStatus {
  provider: string
  tts_enabled: boolean
  stt_enabled: boolean
  tts_mode?: 'ibm-watson' | 'browser-fallback' | string
  stt_mode?: 'ibm-watson' | 'browser-fallback' | string
  voices: Array<{ id: 'luna' | 'atlas'; label: string; ibm_voice: string }>
  fallback: string
}

export interface SpeechTranscript {
  transcript: string
  confidence?: number | null
  provider: string
}

export interface AuthUser {
  id: number
  email: string
  name: string
  provider: 'local' | 'google' | string
  avatar_url?: string | null
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface AuthConfig {
  google_enabled: boolean
  google_client_id: string
}

export interface MissionTimelineEvent {
  id: string
  timestamp: string
  type: 'system' | 'ai' | 'operator' | 'anomaly' | 'recovery' | 'telemetry'
  title: string
  detail: string
  severity: 'info' | 'success' | 'warning' | 'critical'
  source?: string
}

// ─── App State ───────────────────────────────────────────────────────────────

export type AppPhase =
  | 'idle'
  | 'loading-terrain'
  | 'ready'
  | 'planning'
  | 'routes-ready'
  | 'mission-active'
  | 'emergency'
  | 'replanning'
  | 'recovery-ready'

export type ClickMode = 'set-start' | 'set-destination' | 'none'
export type TerrainLayer = 'elevation' | 'slope' | 'hazard'

export interface AppState {
  phase: AppPhase
  terrain: TerrainGrid | null
  missionConfig: MissionRequest
  routePlan: RoutePlanResponse | null
  selectedRoute: RouteProfile
  roverPosition: GridPoint | null
  emergency: EmergencyEvent | null
  recovery: RecoveryResult | null
  activeLayer: TerrainLayer
  clickMode: ClickMode
}
