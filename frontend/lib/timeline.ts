import type { MissionTimelineEvent } from './types'

const KEY = 'lunaguard.timeline.v2'

export const DEFAULT_TIMELINE: MissionTimelineEvent[] = [
  {
    id: 'boot-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    type: 'system',
    title: 'Mission console initialized',
    detail: 'LunaGuard deterministic route engine and explainability guardrails are ready.',
    severity: 'success',
    source: 'LunaGuard Core',
  },
  {
    id: 'ai-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    type: 'ai',
    title: 'IBM Granite copilot available',
    detail: 'Mission narration uses watsonx when credentials are configured and fails safely to deterministic guidance.',
    severity: 'info',
    source: 'IBM watsonx.ai',
  },
]

export function readTimeline(): MissionTimelineEvent[] {
  if (typeof window === 'undefined') return DEFAULT_TIMELINE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_TIMELINE))
      return DEFAULT_TIMELINE
    }
    return JSON.parse(raw) as MissionTimelineEvent[]
  } catch {
    return DEFAULT_TIMELINE
  }
}

export function appendTimelineEvent(event: Omit<MissionTimelineEvent, 'id' | 'timestamp'>): MissionTimelineEvent {
  const next: MissionTimelineEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    const events = [next, ...readTimeline()].slice(0, 120)
    localStorage.setItem(KEY, JSON.stringify(events))
    window.dispatchEvent(new CustomEvent('lunaguard:timeline', { detail: next }))
  }
  return next
}

export function clearTimeline() {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(DEFAULT_TIMELINE))
  window.dispatchEvent(new CustomEvent('lunaguard:timeline-reset'))
}
