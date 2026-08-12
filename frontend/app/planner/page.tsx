'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  TerrainGrid,
  MissionRequest,
  RoutePlanResponse,
  RouteProfile,
  GridPoint,
  EmergencyEvent,
  RecoveryResult,
  AppPhase,
  TerrainLayer,
  ClickMode,
  AiStatus,
} from '@/lib/types'
import { getTerrainSample, planRoutes, reassessRoute, checkHealth, downloadReport, getAiStatus } from '@/lib/api'
import { DEMO_MISSION, DEFAULT_MISSION } from '@/lib/demo-mission'
import Header from '@/components/layout/Header'
import StatusBar from '@/components/layout/StatusBar'
import TerrainMap from '@/components/terrain/TerrainMap'
import TerrainLegend from '@/components/terrain/TerrainLegend'
import MissionConfigPanel from '@/components/mission/MissionConfigPanel'
import RoverConstraintsForm from '@/components/mission/RoverConstraintsForm'
import RouteGenerateButton from '@/components/mission/RouteGenerateButton'
import RouteComparisonPanel from '@/components/routes/RouteComparisonPanel'
import EmergencyPanel from '@/components/emergency/EmergencyPanel'
import RecoveryComparison from '@/components/emergency/RecoveryComparison'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import MissionIntelEmptyState from '@/components/mission/MissionIntelEmptyState'
import { appendTimelineEvent } from '@/lib/timeline'

export default function MissionPlannerPage() {
  // ─── Core state ──────────────────────────────────────────────────────────
  const [terrain, setTerrain] = useState<TerrainGrid | null>(null)
  const [terrainLoading, setTerrainLoading] = useState(true)
  const [missionConfig, setMissionConfig] = useState<MissionRequest>({ ...DEFAULT_MISSION })
  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteProfile>('SAFEST')
  const [planningLoading, setPlanningLoading] = useState(false)
  const [planningError, setPlanningError] = useState<string | null>(null)
  const [missionActive, setMissionActive] = useState(false)
  const [roverPosition, setRoverPosition] = useState<GridPoint | null>(null)
  const [roverProgress, setRoverProgress] = useState(0) // 0–1 along path
  const [emergency, setEmergency] = useState<EmergencyEvent | null>(null)
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [appPhase, setAppPhase] = useState<AppPhase>('loading-terrain')
  const [activeLayer, setActiveLayer] = useState<TerrainLayer>('elevation')
  const [clickMode, setClickMode] = useState<ClickMode>('set-start')
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [calcTime, setCalcTime] = useState<number | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const roverIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Load terrain on mount ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setAppPhase('loading-terrain')
      const [healthy, ai] = await Promise.all([checkHealth(), getAiStatus()])
      setApiConnected(healthy)
      setAiStatus(ai)
      if (healthy) {
        try {
          const t = await getTerrainSample()
          setTerrain(t)
          setAppPhase('ready')
        } catch (err) {
          setPlanningError(err instanceof Error ? err.message : 'Terrain service unavailable')
          setAppPhase('ready')
        }
      } else {
        setPlanningError('Backend API is offline. Start Docker Compose and reload.')
        setAppPhase('ready')
      }
      setTerrainLoading(false)
    }
    init()
    return () => {
      if (roverIntervalRef.current) clearInterval(roverIntervalRef.current)
    }
  }, [])

  // ─── Terrain click handler ────────────────────────────────────────────────
  const handleCellClick = useCallback((point: GridPoint) => {
    if (appPhase === 'mission-active' || appPhase === 'emergency') return
    if (clickMode === 'set-start') {
      setMissionConfig(prev => ({ ...prev, start: point }))
      setClickMode('set-destination')
      setRoutePlan(null)
      setRecovery(null)
    } else if (clickMode === 'set-destination') {
      setMissionConfig(prev => ({ ...prev, destination: point }))
      setClickMode('none')
    }
  }, [clickMode, appPhase])

  // ─── Route planning ───────────────────────────────────────────────────────
  const handlePlanRoutes = useCallback(async () => {
    setPlanningError(null)
    setPlanningLoading(true)
    setAppPhase('planning')
    setRoutePlan(null)
    setRecovery(null)
    setMissionActive(false)
    setRoverPosition(null)
    const t0 = Date.now()
    try {
      const result = await planRoutes(missionConfig)
      setRoutePlan(result)
      setSelectedRoute(result.recommended_profile)
      setCalcTime(Date.now() - t0)
      setAppPhase('routes-ready')
      appendTimelineEvent({ type: 'ai', title: 'Route alternatives computed', detail: `LunaGuard compared ${result.routes.length} route profiles and recommended ${result.recommended_profile.replaceAll('_', ' ')}.`, severity: 'success', source: 'Deterministic Route Engine' })
    } catch (err: any) {
      setPlanningError(err.message || 'Failed to plan routes')
      setAppPhase('ready')
    } finally {
      setPlanningLoading(false)
    }
  }, [missionConfig])

  // ─── Demo loading ─────────────────────────────────────────────────────────
  const handleLoadDemo = useCallback(async () => {
    setMissionConfig({ ...DEMO_MISSION })
    setRoutePlan(null)
    setRecovery(null)
    setMissionActive(false)
    setRoverPosition(null)
    setRoverProgress(0)
    setClickMode('none')
    setAppPhase('planning')
    setPlanningLoading(true)
    setPlanningError(null)
    const t0 = Date.now()
    try {
      const result = await planRoutes(DEMO_MISSION)
      setRoutePlan(result)
      setSelectedRoute(result.recommended_profile)
      setCalcTime(Date.now() - t0)
      setAppPhase('routes-ready')
      appendTimelineEvent({ type: 'operator', title: 'Reference mission loaded', detail: `Reference route plan generated. Recommended profile: ${result.recommended_profile.replaceAll('_', ' ')}.`, severity: 'success', source: 'Mission Planner' })
    } catch (err: any) {
      setPlanningError(err.message || 'Failed to plan reference routes')
      setAppPhase('ready')
    } finally {
      setPlanningLoading(false)
    }
  }, [])

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (roverIntervalRef.current) clearInterval(roverIntervalRef.current)
    setMissionConfig({ ...DEFAULT_MISSION })
    setRoutePlan(null)
    setSelectedRoute('SAFEST')
    setMissionActive(false)
    setRoverPosition(null)
    setRoverProgress(0)
    setEmergency(null)
    setRecovery(null)
    setPlanningError(null)
    setCalcTime(null)
    setClickMode('set-start')
    setAppPhase('ready')
  }, [])

  // ─── Start mission & simulate rover movement ──────────────────────────────
  const handleStartMission = useCallback(() => {
    if (!routePlan) return
    const route = routePlan.routes.find(r => r.profile === selectedRoute)
    if (!route || route.path.length === 0) return
    setMissionActive(true)
    setRoverPosition(route.path[0])
    setRoverProgress(0)
    setAppPhase('mission-active')
    appendTimelineEvent({ type: 'operator', title: 'Mission execution started', detail: `Operator started the ${selectedRoute.replaceAll('_', ' ')} route. Rover simulation is now live.`, severity: 'info', source: 'Mission Control' })
    let idx = 0
    roverIntervalRef.current = setInterval(() => {
      idx += 1
      if (idx >= route.path.length) {
        if (roverIntervalRef.current) clearInterval(roverIntervalRef.current)
        return
      }
      setRoverPosition(route.path[idx])
      setRoverProgress(idx / (route.path.length - 1))
    }, 200)
  }, [routePlan, selectedRoute])

  // ─── Emergency injection ──────────────────────────────────────────────────
  const handleInjectEmergency = useCallback(async (event: EmergencyEvent) => {
    if (!routePlan || !roverPosition) return
    const activeRoute = routePlan.routes.find(r => r.profile === selectedRoute)
    if (!activeRoute) {
      setPlanningError('Selected route is unavailable for emergency reassessment.')
      return
    }

    if (roverIntervalRef.current) clearInterval(roverIntervalRef.current)
    setEmergency(event)
    appendTimelineEvent({ type: 'anomaly', title: event.type.replaceAll('_', ' '), detail: event.description, severity: event.severity === 'CRITICAL' ? 'critical' : 'warning', source: 'Resilience Test Bench' })
    setAppPhase('emergency')
    setRecoveryLoading(true)

    try {
      setAppPhase('replanning')
      const result = await reassessRoute({
        original_mission: missionConfig,
        active_route: activeRoute,
        current_position: roverPosition,
        emergency_event: event,
      })
      setRecovery(result)
      setAppPhase('recovery-ready')
      appendTimelineEvent({ type: 'recovery', title: `Recovery decision: ${result.recommendation.replaceAll('_', ' ')}`, detail: result.explanation, severity: result.recovery_viable ? 'success' : 'critical', source: 'Emergency Replanner' })
    } catch (err: any) {
      setPlanningError(err.message || 'Emergency replanning failed')
      setAppPhase('mission-active')
    } finally {
      setRecoveryLoading(false)
    }
  }, [routePlan, roverPosition, missionConfig, selectedRoute])

  // ─── Compute active routes and obstructions for map ──────────────────────
  const activeRoutes = routePlan?.routes ?? []
  const emergencyObstructions = emergency?.obstructed_cells ?? []

  const canPlan =
    missionConfig.start.row !== missionConfig.destination.row ||
    missionConfig.start.col !== missionConfig.destination.col

  return (
    <div className="planner-console flex h-[calc(100vh-4rem)] min-h-[760px] flex-col overflow-hidden bg-[#050b14]/50">
      {/* Header */}
      <Header
        phase={appPhase}
        apiConnected={apiConnected}
        calcTime={calcTime}
        aiStatus={aiStatus}
      />

      {/* Main content: 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL (320px) ── */}
        <div className="w-80 flex-shrink-0 border-r border-white/[0.06] bg-[#07111f]/90 flex flex-col overflow-y-auto animate-slide-in-left">
          <MissionConfigPanel
            missionConfig={missionConfig}
            appPhase={appPhase}
            clickMode={clickMode}
            onLoadDemo={handleLoadDemo}
            onReset={handleReset}
            onStartMission={handleStartMission}
            routePlan={routePlan}
            selectedRoute={selectedRoute}
          />
          <div className="border-t border-border-dim">
            <RoverConstraintsForm
              config={missionConfig.rover}
              onChange={rover => setMissionConfig(prev => ({ ...prev, rover }))}
              disabled={missionActive}
            />
          </div>
          <div className="p-3 border-t border-border-dim">
            <RouteGenerateButton
              loading={planningLoading}
              disabled={!canPlan || missionActive || appPhase === 'loading-terrain'}
              onClick={handlePlanRoutes}
              phase={appPhase}
            />
            {planningError && (
              <p className="mt-2 text-xs text-red-danger animate-fade-in">
                ⚠ {planningError}
              </p>
            )}
          </div>
        </div>

        {/* ── CENTER: Terrain Map ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative scanline-overlay">
          {/* Layer switcher */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1 glass-panel rounded-lg px-2 py-1">
            {(['elevation', 'slope', 'hazard'] as TerrainLayer[]).map(layer => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  activeLayer === layer
                    ? 'bg-cyan-electric/20 text-cyan-electric border border-cyan-electric/40'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {layer.charAt(0).toUpperCase() + layer.slice(1)}
              </button>
            ))}
          </div>

          {terrainLoading ? (
            <LoadingOverlay message="Initializing terrain data..." />
          ) : (
            <TerrainMap
              terrain={terrain}
              routes={activeRoutes}
              selectedRoute={selectedRoute}
              roverPosition={roverPosition}
              start={missionConfig.start}
              destination={missionConfig.destination}
              onCellClick={handleCellClick}
              activeLayer={activeLayer}
              emergencyObstructions={emergencyObstructions}
              clickMode={clickMode}
            />
          )}

          <TerrainLegend activeLayer={activeLayer} terrain={terrain} />
        </div>

        {/* ── RIGHT PANEL (360px) ── */}
        <div className="w-96 flex-shrink-0 border-l border-white/[0.06] bg-[#07111f]/90 flex flex-col overflow-y-auto animate-slide-in-right">
          {appPhase === 'recovery-ready' && recovery ? (
            <RecoveryComparison
              recovery={recovery}
              emergency={emergency!}
              onDownload={() => downloadReport({ recovery, emergency, mission: missionConfig }, 'lunaguard-recovery.json')}
            />
          ) : routePlan ? (
            <RouteComparisonPanel
              routePlan={routePlan}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              onDownload={() => downloadReport(routePlan, 'lunaguard-routes.json')}
            />
          ) : (
            <MissionIntelEmptyState />
          )}
        </div>
      </div>

      {/* ── BOTTOM PANEL ── */}
      <div className="h-52 border-t border-white/[0.06] bg-[#07111f]/90 flex overflow-hidden animate-slide-in-up">
        <EmergencyPanel
          missionActive={missionActive}
          onInjectEmergency={handleInjectEmergency}
          roverPosition={roverPosition}
          roverProgress={roverProgress}
          currentRoute={routePlan?.routes.find(r => r.profile === selectedRoute) ?? null}
          recoveryLoading={recoveryLoading}
          appPhase={appPhase}
        />
      </div>

      {/* Status bar */}
      <StatusBar phase={appPhase} apiConnected={apiConnected} />

      {/* Loading overlay during planning */}
      {(planningLoading || recoveryLoading) && (
        <LoadingOverlay
          message={recoveryLoading ? 'Computing emergency recovery route...' : 'Computing optimal paths...'}
          fullScreen
        />
      )}
    </div>
  )
}
