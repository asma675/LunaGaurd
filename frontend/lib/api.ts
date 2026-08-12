import axios from 'axios'
import type {
  AiStatus,
  AuthConfig,
  AuthResponse,
  AuthUser,
  CopilotResponse,
  KnowledgeSource,
  EmergencyEvent,
  GridPoint,
  MissionBrief,
  MissionRequest,
  ReassessRequest,
  RecoveryResult,
  RouteMetrics,
  RoutePlanResponse,
  RouteProfile,
  RouteResult,
  ScoreBreakdown,
  TerrainGrid,
  TerrainMetadata,
} from './types'

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function handleError(err: unknown): never {
  const candidate = err as {
    message?: unknown
    response?: {
      status?: number
      data?: { detail?: unknown; message?: unknown }
    }
  }
  const status = candidate?.response?.status
  const detail =
    candidate?.response?.data?.detail ??
    candidate?.response?.data?.message ??
    candidate?.message ??
    'Unknown API error'

  throw new ApiError(`API request failed: ${String(detail)}`, status, String(detail))
}

// ─── Backend wire types ──────────────────────────────────────────────────────

type BackendTerrainMetadata = {
  grid_rows: number
  grid_cols: number
  cell_size_m: number
  bounds: Record<string, number>
  data_source: string
  is_synthetic: boolean
  processing_date: string
}

type LayerStats = { min: number; max: number; mean: number; std: number }

type BackendTerrainSample = {
  metadata: BackendTerrainMetadata
  elevation: number[][]
  slope: number[][]
  roughness: number[][]
  hazard: number[][]
  traversable: boolean[][]
  summary: {
    elevation_m: LayerStats
    slope_deg: LayerStats
    roughness: LayerStats
    hazard_score: LayerStats
    traversability: {
      traversable_cells: number
      blocked_cells: number
      traversable_percent: number
    }
  }
}

type BackendRouteMetrics = {
  total_distance_m: number
  travel_time_hours: number
  energy_consumed_wh: number
  battery_remaining_wh: number
  battery_reserve_percent: number
  max_slope_deg: number
  avg_slope_deg: number
  cumulative_hazard: number
  high_risk_cells: number
  viable: boolean
  risk_score: number
  mission_success_score: number
  calculation_time_ms: number
  warnings: string[]
}

type BackendEvidenceFactor = {
  value: number
  weight: number
  contribution: number
  source?: string
}

type BackendRouteResult = {
  profile: RouteProfile
  path: GridPoint[]
  metrics: BackendRouteMetrics
  explanation_evidence?: {
    factor_breakdown?: Record<string, BackendEvidenceFactor>
    summary?: Record<string, unknown>
    risk_formula?: string
    success_formula?: string
    error?: string
  }
}

type BackendRoutePlanResponse = {
  mission_config: Omit<MissionRequest, 'name'>
  routes: BackendRouteResult[]
  recommended_profile: RouteProfile
  terrain_metadata: BackendTerrainMetadata
}

type BackendEmergencyEvent = {
  type: EmergencyEvent['type']
  battery_loss_percent?: number
  slope_reduction_deg?: number
  obstructed_cells?: GridPoint[]
}

type BackendRecoveryResult = {
  original_route_viable: boolean
  original_route_metrics_after: BackendRouteMetrics
  recovery_route: BackendRouteResult
  risk_reduction: number
  battery_reserve_change: number
  distance_change_m: number
  max_slope_change: number
  mission_success_change: number
  recommendation: 'FOLLOW_RECOVERY_ROUTE' | 'CONTINUE_ORIGINAL' | 'ABORT'
  explanation: string
}

// ─── Normalization helpers ───────────────────────────────────────────────────

function finite(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeScore(score0to100: number): number {
  return Math.max(0, Math.min(1, finite(score0to100) / 100))
}

function normalizeTerrainMetadata(
  metadata: BackendTerrainMetadata,
  summary?: BackendTerrainSample['summary']
): TerrainMetadata {
  const rows = finite(metadata.grid_rows)
  const cols = finite(metadata.grid_cols)
  const cell = finite(metadata.cell_size_m, 100)
  return {
    rows,
    cols,
    cell_size_m: cell,
    elevation_min: finite(summary?.elevation_m?.min),
    elevation_max: finite(summary?.elevation_m?.max),
    slope_min: finite(summary?.slope_deg?.min),
    slope_max: finite(summary?.slope_deg?.max),
    hazard_min: finite(summary?.hazard_score?.min),
    hazard_max: finite(summary?.hazard_score?.max, 1),
    total_area_km2: (rows * cols * cell * cell) / 1_000_000,
    seed: 42,
    data_source: metadata.data_source,
    is_synthetic: metadata.is_synthetic,
    processing_date: metadata.processing_date,
  }
}

function normalizeTerrain(data: BackendTerrainSample): TerrainGrid {
  const metadata = normalizeTerrainMetadata(data.metadata, data.summary)
  const cells = Array.from({ length: metadata.rows }, (_, row) =>
    Array.from({ length: metadata.cols }, (_, col) => ({
      row,
      col,
      elevation: finite(data.elevation?.[row]?.[col]),
      slope: finite(data.slope?.[row]?.[col]),
      roughness: finite(data.roughness?.[row]?.[col]),
      hazard_score: finite(data.hazard?.[row]?.[col]),
      traversable: Boolean(data.traversable?.[row]?.[col]),
    }))
  )
  return { metadata, cells }
}

function normalizeBreakdown(route: BackendRouteResult): ScoreBreakdown[] {
  const factors = route.explanation_evidence?.factor_breakdown ?? {}
  return Object.entries(factors).map(([factor, item]) => ({
    factor: factor.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    weight: finite(item.weight),
    raw_value: finite(item.value),
    normalized_value: Math.max(0, Math.min(1, finite(item.value))),
    weighted_contribution: finite(item.contribution) / 100,
    description: item.source,
  }))
}

function normalizeMetrics(metrics: BackendRouteMetrics, pathLength: number): RouteMetrics {
  const edgeCount = Math.max(pathLength - 1, 1)
  return {
    total_distance_m: finite(metrics.total_distance_m),
    estimated_time_hours: finite(metrics.travel_time_hours),
    energy_required_wh: finite(metrics.energy_consumed_wh),
    battery_reserve_percent: finite(metrics.battery_reserve_percent),
    max_slope_encountered_deg: finite(metrics.max_slope_deg),
    avg_hazard_score: finite(metrics.cumulative_hazard) / edgeCount,
    risk_score: normalizeScore(metrics.risk_score),
    mission_success_score: normalizeScore(metrics.mission_success_score),
    is_viable: Boolean(metrics.viable),
    path_length: pathLength,
  }
}

function normalizeRoute(
  route: BackendRouteResult,
  recommendedProfile?: RouteProfile
): RouteResult {
  const metrics = normalizeMetrics(route.metrics, route.path.length)
  const isRecommended = route.profile === recommendedProfile
  const warningText = route.metrics.warnings ?? []
  const hardViolations = metrics.is_viable
    ? []
    : warningText.length
      ? warningText
      : ['Route violates one or more mission hard constraints.']

  return {
    profile: route.profile,
    path: route.path,
    metrics,
    score_breakdown: normalizeBreakdown(route),
    is_recommended: isRecommended,
    recommendation_reason: isRecommended
      ? 'Highest mission-success score among viable candidates under the current rover constraints.'
      : 'Alternative trade-off preserved for transparent human comparison.',
    warnings: warningText,
    hard_constraint_violations: hardViolations,
  }
}

function normalizePlan(
  data: BackendRoutePlanResponse,
  request: MissionRequest
): RoutePlanResponse {
  const routes = data.routes.map(route => normalizeRoute(route, data.recommended_profile))
  const planningTime = Math.round(
    routes.length
      ? Math.max(...data.routes.map(r => finite(r.metrics.calculation_time_ms)))
      : 0
  )
  return {
    mission_name: request.name || 'LunaGuard Mission',
    routes,
    recommended_profile: data.recommended_profile,
    planning_time_ms: planningTime,
    terrain_metadata: normalizeTerrainMetadata(data.terrain_metadata),
  }
}

function toBackendMetrics(route: RouteResult, rover: MissionRequest['rover']): BackendRouteMetrics {
  const m = route.metrics
  const edgeCount = Math.max(route.path.length - 1, 1)
  return {
    total_distance_m: finite(m.total_distance_m),
    travel_time_hours: finite(m.estimated_time_hours),
    energy_consumed_wh: finite(m.energy_required_wh),
    battery_remaining_wh:
      finite(rover.battery_capacity_wh) * Math.max(0, finite(m.battery_reserve_percent)) / 100,
    battery_reserve_percent: finite(m.battery_reserve_percent),
    max_slope_deg: finite(m.max_slope_encountered_deg),
    avg_slope_deg: finite(m.max_slope_encountered_deg),
    cumulative_hazard: finite(m.avg_hazard_score) * edgeCount,
    high_risk_cells: 0,
    viable: Boolean(m.is_viable),
    risk_score: finite(m.risk_score) * 100,
    mission_success_score: finite(m.mission_success_score) * 100,
    calculation_time_ms: 0,
    warnings: route.warnings ?? [],
  }
}

function toBackendRoute(route: RouteResult, rover: MissionRequest['rover']): BackendRouteResult {
  return {
    profile: route.profile,
    path: route.path,
    metrics: toBackendMetrics(route, rover),
    explanation_evidence: {},
  }
}

function toBackendEmergency(event: EmergencyEvent): BackendEmergencyEvent {
  if (event.type === 'BATTERY_DEGRADATION') {
    return {
      type: event.type,
      battery_loss_percent: Math.max(0, finite(event.battery_loss_percent)),
    }
  }
  if (event.type === 'REDUCED_MOBILITY') {
    return {
      type: event.type,
      slope_reduction_deg: Math.max(0, finite(event.slope_reduction_deg)),
    }
  }
  return {
    type: event.type,
    obstructed_cells: event.obstructed_cells ?? [],
  }
}

// ─── Terrain endpoints ───────────────────────────────────────────────────────

export async function getTerrainMetadata(): Promise<TerrainMetadata> {
  try {
    const res = await client.get<BackendTerrainMetadata>('/api/terrain/metadata')
    return normalizeTerrainMetadata(res.data)
  } catch (err) {
    return handleError(err)
  }
}

export async function getTerrainSample(): Promise<TerrainGrid> {
  try {
    const res = await client.get<BackendTerrainSample>('/api/terrain/sample')
    return normalizeTerrain(res.data)
  } catch (err) {
    return handleError(err)
  }
}

// ─── Route endpoints ─────────────────────────────────────────────────────────

export async function planRoutes(request: MissionRequest): Promise<RoutePlanResponse> {
  try {
    const wireRequest = {
      start: request.start,
      destination: request.destination,
      rover: request.rover,
    }
    const res = await client.post<BackendRoutePlanResponse>('/api/routes/plan', wireRequest)
    return normalizePlan(res.data, request)
  } catch (err) {
    return handleError(err)
  }
}

export async function reassessRoute(request: ReassessRequest): Promise<RecoveryResult> {
  try {
    const wireRequest = {
      original_request: {
        start: request.original_mission.start,
        destination: request.original_mission.destination,
        rover: request.original_mission.rover,
      },
      active_route: toBackendRoute(request.active_route, request.original_mission.rover),
      current_position: request.current_position,
      emergency: toBackendEmergency(request.emergency_event),
    }

    const res = await client.post<BackendRecoveryResult>('/api/routes/reassess', wireRequest)
    const backend = res.data
    const originalRoute: RouteResult = {
      ...request.active_route,
      metrics: normalizeMetrics(backend.original_route_metrics_after, request.active_route.path.length),
      is_recommended: false,
      recommendation_reason: 'Projected remaining original route after the emergency event.',
      warnings: backend.original_route_metrics_after.warnings ?? [],
      hard_constraint_violations: backend.original_route_viable
        ? []
        : backend.original_route_metrics_after.warnings ?? ['Original route is no longer viable.'],
    }
    const recoveryRoute = normalizeRoute(backend.recovery_route, 'SAFEST')

    return {
      original_route: originalRoute,
      recovery_route: recoveryRoute,
      emergency_summary: request.emergency_event.description,
      delta_distance_m: finite(backend.distance_change_m),
      delta_energy_wh:
        recoveryRoute.metrics.energy_required_wh - originalRoute.metrics.energy_required_wh,
      delta_risk_score: recoveryRoute.metrics.risk_score - originalRoute.metrics.risk_score,
      recovery_viable: recoveryRoute.metrics.is_viable,
      explanation: backend.explanation,
      planning_time_ms: Math.round(finite(backend.recovery_route.metrics.calculation_time_ms)),
      recommendation: backend.recommendation,
    }
  } catch (err) {
    return handleError(err)
  }
}

// ─── IBM watsonx / Granite endpoints ────────────────────────────────────────

export async function getAiStatus(): Promise<AiStatus> {
  try {
    const res = await client.get<AiStatus>('/api/ai/status')
    return res.data
  } catch {
    return {
      provider: 'IBM watsonx.ai',
      model_id: 'ibm/granite-3-3-8b-instruct',
      enabled: false,
      mode: 'deterministic-fallback',
      guardrails: ['Computed metrics remain authoritative', 'No invented numerical values'],
    }
  }
}

export async function generateMissionBrief(plan: RoutePlanResponse): Promise<MissionBrief> {
  try {
    // The backend owns the authoritative plan model, so regenerate using the same mission
    // request and ask the AI endpoint to narrate that deterministic evidence.
    const selected = plan.routes.find(r => r.profile === plan.recommended_profile) ?? plan.routes[0]
    const payload = {
      mission_name: plan.mission_name,
      recommended_profile: plan.recommended_profile,
      route: selected,
    }
    const res = await client.post<MissionBrief>('/api/ai/brief', payload)
    return res.data
  } catch (err) {
    return handleError(err)
  }
}

// ─── Report download ─────────────────────────────────────────────────────────

export function downloadReport(data: unknown, filename = 'lunaguard-report.json'): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Health check ────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    await client.get('/health', { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

// ─── Copilot grounding + source endpoints ──────────────────────────────────

export async function getKnowledgeSources(refresh = false): Promise<KnowledgeSource[]> {
  try {
    const res = await client.get<{ sources: KnowledgeSource[] }>('/api/ai/sources', { params: refresh ? { refresh: true } : undefined })
    return res.data.sources
  } catch (err) {
    return handleError(err)
  }
}

export async function askCopilot(
  question: string,
  missionContext?: Record<string, unknown>
): Promise<CopilotResponse> {
  try {
    const res = await client.post<CopilotResponse>('/api/ai/copilot', {
      question,
      mission_context: missionContext ?? {},
    })
    return res.data
  } catch (err) {
    return handleError(err)
  }
}

// ─── Voice Copilot endpoints ───────────────────────────────────────────────

export async function getVoiceStatus(): Promise<import('./types').VoiceStatus> {
  try {
    const res = await client.get<import('./types').VoiceStatus>('/api/voice/status')
    return res.data
  } catch {
    return {
      provider: 'Browser Web Speech',
      tts_enabled: false,
      stt_enabled: false,
      tts_mode: 'browser-fallback',
      stt_mode: 'browser-fallback',
      voices: [
        { id: 'luna', label: 'Luna · feminine', ibm_voice: 'en-US_AllisonV3Voice' },
        { id: 'atlas', label: 'Atlas · masculine', ibm_voice: 'en-US_MichaelV3Voice' },
      ],
      fallback: 'browser-web-speech',
    }
  }
}

export async function synthesizeVoice(text: string, voice: 'luna' | 'atlas'): Promise<Blob> {
  const res = await client.post('/api/voice/tts', { text, voice }, { responseType: 'blob', timeout: 30_000 })
  return res.data as Blob
}

export async function transcribeVoice(audio: Blob): Promise<import('./types').SpeechTranscript> {
  const form = new FormData()
  const extension = audio.type.includes('ogg') ? 'ogg' : audio.type.includes('wav') ? 'wav' : 'webm'
  form.append('audio', audio, `lunaguard-voice.${extension}`)
  const res = await client.post<import('./types').SpeechTranscript>('/api/voice/stt', form, {
    timeout: 40_000,
  })
  return res.data
}

// ─── Authentication endpoints ───────────────────────────────────────────────

export async function getAuthConfig(): Promise<AuthConfig> {
  try {
    const res = await client.get<AuthConfig>('/api/auth/config')
    return res.data
  } catch {
    return { google_enabled: false, google_client_id: '' }
  }
}

export async function registerUser(email: string, name: string, password: string): Promise<AuthResponse> {
  try {
    const res = await client.post<AuthResponse>('/api/auth/register', { email, name, password })
    return res.data
  } catch (err) {
    return handleError(err)
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await client.post<AuthResponse>('/api/auth/login', { email, password })
    return res.data
  } catch (err) {
    return handleError(err)
  }
}

export async function loginWithGoogleCredential(credential: string): Promise<AuthResponse> {
  try {
    const res = await client.post<AuthResponse>('/api/auth/google', { credential })
    return res.data
  } catch (err) {
    return handleError(err)
  }
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  try {
    const res = await client.get<{ user: AuthUser }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.data.user
  } catch (err) {
    return handleError(err)
  }
}

export async function logoutUser(token: string): Promise<void> {
  try {
    await client.post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // Local session will still be removed by the frontend.
  }
}

